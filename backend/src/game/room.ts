/**
 * The game engine.
 *
 * Every state transition in Secret DJ goes through exactly one method here, and
 * every method starts by asserting who the actor is and what phase we are in.
 * That is the whole trick: authorisation and phase legality cannot be forgotten
 * at a call site, because there is no call site that bypasses them.
 *
 * The engine performs no I/O and knows nothing about sockets. It returns feed
 * events; the gateway decides who hears them.
 */
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import {
    canonicalKey,
    cleanUrl,
    computeAwards,
    computeRoundPoints,
    detectService,
    emptyScores,
    heartBudget,
    GameError,
    LIMITS,
    NAME_PATTERN,
    buildSetlist,
    shuffle,
    type Award,
    type FeedEvent,
    type GamePhase,
    type GameSettings,
    type PlayedTrack,
    type PlayerId,
    type Reaction,
    type Rng,
    type TrackId,
    type UnplayedTrack,
} from '@secret-dj/common';
import { DEFAULT_SETTINGS, type PlayedRound, type PlayerState, type RoundState, type TrackState } from './state.js';
import { toPublicTrack } from './publicTrack.js';

/** How long a host may be disconnected before the crown moves on. */
export const HOST_GRACE_MS = 45_000;

export interface RoomOptions {
    id: string;
    settings?: Partial<GameSettings>;
    now?: () => number;
    rng?: Rng;
}

export class GameRoom {
    readonly id: string;
    readonly createdAt: number;
    lastActivityAt: number;
    phase: GamePhase = 'lobby';
    settings: GameSettings;
    hostId: PlayerId | null = null;
    setlist: TrackId[] = [];
    roundIndex = -1;
    round: RoundState | null = null;
    readonly history: PlayedRound[] = [];
    readonly players = new Map<PlayerId, PlayerState>();
    readonly tracks = new Map<TrackId, TrackState>();

    /** canonical song key -> track id, so the same song cannot be queued twice. */
    private readonly canonicalIndex = new Map<string, TrackId>();
    private readonly now: () => number;
    private readonly rng: Rng;
    private seqCounter = 0;
    private cachedAwards: Award[] | null = null;

    constructor(options: RoomOptions) {
        this.id = options.id;
        this.now = options.now ?? Date.now;
        this.rng = options.rng ?? Math.random;
        this.createdAt = this.now();
        this.lastActivityAt = this.createdAt;
        this.settings = normaliseSettings({ ...DEFAULT_SETTINGS, ...options.settings });
    }

    // ---------------------------------------------------------------- guards

    private touch(): void {
        this.lastActivityAt = this.now();
    }

    private requirePlayer(playerId: PlayerId): PlayerState {
        const player = this.players.get(playerId);
        if (!player || player.presence === 'left') throw new GameError('SESSION_INVALID');
        return player;
    }

    private requireHost(playerId: PlayerId): PlayerState {
        const player = this.requirePlayer(playerId);
        if (this.hostId !== player.id) throw new GameError('NOT_HOST');
        return player;
    }

    private requirePhase(...allowed: GamePhase[]): void {
        if (!allowed.includes(this.phase)) throw new GameError('WRONG_PHASE');
    }

    /** The current round, or a phase error. Narrows `round` for callers. */
    private requireRound(): RoundState {
        if (!this.round) throw new GameError('WRONG_PHASE');
        return this.round;
    }

    // ------------------------------------------------------------ membership

    get activePlayers(): PlayerState[] {
        return [...this.players.values()]
            .filter(player => player.presence !== 'left')
            .sort((a, b) => a.seq - b.seq);
    }

    get liveConnections(): number {
        return [...this.players.values()].reduce((total, player) => total + player.connections, 0);
    }

    get isEmpty(): boolean {
        return this.activePlayers.length === 0;
    }

    isReady(player: PlayerState): boolean {
        return player.trackIds.length >= this.settings.tracksPerPlayer;
    }

    addPlayer(rawName: string): { player: PlayerState; feed: FeedEvent[] } {
        const name = normaliseName(rawName);
        if (this.phase !== 'lobby') throw new GameError('GAME_ALREADY_STARTED');
        if (this.activePlayers.length >= LIMITS.maxPlayers) throw new GameError('GAME_FULL');

        const nameKey = name.toLocaleLowerCase();
        if (this.activePlayers.some(player => player.nameKey === nameKey)) throw new GameError('NAME_TAKEN');

        const player: PlayerState = {
            id: randomUUID(),
            name,
            nameKey,
            token: randomBytes(32).toString('base64url'),
            seq: this.seqCounter++,
            presence: 'offline',
            connections: 0,
            offlineSince: this.now(),
            trackIds: [],
            scores: emptyScores(),
            heartsLeft: 0,
            heartBudget: 0,
            anthemSpent: false,
        };
        this.players.set(player.id, player);
        this.touch();

        const feed: FeedEvent[] = [{ kind: 'player-joined', playerId: player.id, name: player.name }];
        if (this.hostId === null) {
            this.hostId = player.id;
            feed.push({ kind: 'host-changed', playerId: player.id, name: player.name });
        }
        return { player, feed };
    }

    /** Verifies a returning player's bearer token in constant time. */
    authenticate(playerId: PlayerId, token: string): PlayerState {
        const player = this.players.get(playerId);
        if (!player || player.presence === 'left') throw new GameError('SESSION_INVALID');

        const expected = Buffer.from(player.token);
        const provided = Buffer.from(String(token ?? ''));
        if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
            throw new GameError('SESSION_INVALID');
        }
        return player;
    }

    attachSocket(playerId: PlayerId): FeedEvent[] {
        const player = this.requirePlayer(playerId);
        player.connections += 1;
        this.touch();
        if (player.presence === 'online') return [];
        player.presence = 'online';
        player.offlineSince = null;
        return [{ kind: 'player-online', playerId: player.id, name: player.name }];
    }

    detachSocket(playerId: PlayerId): FeedEvent[] {
        const player = this.players.get(playerId);
        if (!player) return [];
        player.connections = Math.max(0, player.connections - 1);
        this.touch();
        if (player.connections > 0 || player.presence !== 'online') return [];

        player.presence = 'offline';
        player.offlineSince = this.now();
        // A player who walks away must never be able to stall a round.
        const feed: FeedEvent[] = [{ kind: 'player-offline', playerId: player.id, name: player.name }];
        feed.push(...this.maybeCloseVoting());
        return feed;
    }

    leave(playerId: PlayerId): FeedEvent[] {
        const player = this.players.get(playerId);
        if (!player || player.presence === 'left') return [];

        player.presence = 'left';
        player.connections = 0;
        player.offlineSince = this.now();
        this.touch();

        // Their played tracks stay in history (so results still make sense);
        // anything still queued is pulled from the remainder of the setlist.
        const upcoming = new Set(player.trackIds);
        this.setlist = this.setlist.filter((trackId, index) => index <= this.roundIndex || !upcoming.has(trackId));

        // A decoy pointing at someone who walked out would be unguessable.
        if (this.round?.decoyId === player.id) this.round.decoyId = null;

        const feed: FeedEvent[] = [{ kind: 'player-left', playerId: player.id, name: player.name }];
        feed.push(...this.reassignHostIfNeeded());
        feed.push(...this.maybeCloseVoting());
        return feed;
    }

    /**
     * Moves the crown when the host has left, or has been gone long enough that
     * waiting for them would strand everyone else.
     */
    reassignHostIfNeeded(graceMs = HOST_GRACE_MS): FeedEvent[] {
        const host = this.hostId ? this.players.get(this.hostId) : undefined;
        const hostUsable =
            host &&
            host.presence !== 'left' &&
            (host.presence === 'online' || (host.offlineSince ?? 0) + graceMs > this.now());
        if (hostUsable) return [];

        const candidates = this.activePlayers;
        const successor =
            candidates.find(player => player.presence === 'online') ?? candidates.find(player => player.id !== host?.id) ?? null;

        if (!successor || successor.id === this.hostId) {
            if (!successor) this.hostId = null;
            return [];
        }

        this.hostId = successor.id;
        return [{ kind: 'host-changed', playerId: successor.id, name: successor.name }];
    }

    // ---------------------------------------------------------------- tracks

    addTrack(playerId: PlayerId, rawUrl: string): { track: TrackState } {
        const player = this.requirePlayer(playerId);
        this.requirePhase('lobby');

        const url = String(rawUrl ?? '').trim();
        if (!url || url.length > LIMITS.urlMax) throw new GameError('TRACK_URL_INVALID');

        const service = detectService(url);
        if (!service) throw new GameError('TRACK_UNSUPPORTED');

        if (player.trackIds.length >= this.settings.tracksPerPlayer) throw new GameError('TRACK_LIMIT_REACHED');

        const canonical = canonicalKey(url);
        if (this.canonicalIndex.has(canonical)) throw new GameError('TRACK_DUPLICATE');

        const track: TrackState = {
            id: randomUUID(),
            ownerId: player.id,
            url: cleanUrl(url),
            canonical,
            serviceName: service.name,
            metadata: 'pending',
            addedAt: this.now(),
        };

        this.tracks.set(track.id, track);
        this.canonicalIndex.set(canonical, track.id);
        player.trackIds.push(track.id);
        this.touch();
        return { track };
    }

    removeTrack(playerId: PlayerId, trackId: TrackId): void {
        const player = this.requirePlayer(playerId);
        this.requirePhase('lobby');

        const track = this.tracks.get(trackId);
        if (!track || track.ownerId !== player.id) throw new GameError('TRACK_NOT_FOUND');

        player.trackIds = player.trackIds.filter(id => id !== trackId);
        this.tracks.delete(trackId);
        this.canonicalIndex.delete(track.canonical);
        this.touch();
    }

    /** Applied out-of-band once the metadata service has an answer. */
    applyMetadata(
        trackId: TrackId,
        metadata: { title?: string; artist?: string; artwork?: string } | null,
    ): boolean {
        const track = this.tracks.get(trackId);
        if (!track || track.metadata !== 'pending') return false;

        if (metadata?.title) {
            track.title = metadata.title;
            track.artist = metadata.artist;
            track.artwork = metadata.artwork;
            track.metadata = 'ready';
        } else {
            track.metadata = 'failed';
        }
        return true;
    }

    // -------------------------------------------------------------- settings

    updateSettings(playerId: PlayerId, patch: Partial<GameSettings>): void {
        this.requireHost(playerId);
        this.requirePhase('lobby');
        this.settings = normaliseSettings({ ...this.settings, ...patch });
        this.touch();
    }

    // ------------------------------------------------------------- game flow

    start(playerId: PlayerId): FeedEvent[] {
        this.requireHost(playerId);
        this.requirePhase('lobby');

        const players = this.activePlayers;
        if (this.settings.guessingEnabled && players.length < 2) throw new GameError('NOT_ENOUGH_PLAYERS');
        if (players.some(player => !this.isReady(player))) throw new GameError('NOT_READY');

        // Each DJ contributes a *random* subset of what they queued. This is what
        // stops the endgame being solvable: no amount of counting reveals which
        // of a player's tracks are still to come, or whether any are.
        const entries = players.flatMap(player =>
            shuffle(player.trackIds, this.rng)
                .slice(0, this.settings.tracksPlayedPerPlayer)
                .map(id => ({ id, ownerId: player.id })),
        );
        if (entries.length === 0) throw new GameError('NOT_READY');

        this.setlist = buildSetlist(entries, this.rng);
        this.roundIndex = -1;

        // Hearts are scarce, and the budget depends on how long the night is, so
        // it can only be handed out once the setlist exists.
        const budget = heartBudget(this.setlist.length, this.settings.tracksPlayedPerPlayer);
        for (const player of players) {
            player.heartBudget = budget;
            player.heartsLeft = budget;
            player.anthemSpent = false;
        }

        this.touch();
        return this.openRound(0);
    }

    private openRound(index: number): FeedEvent[] {
        const trackId = this.setlist[index];
        const track = trackId ? this.tracks.get(trackId) : undefined;
        if (!track) return this.finish();

        this.roundIndex = index;
        this.round = {
            index,
            trackId: track.id,
            djId: track.ownerId,
            startedAt: this.now(),
            votes: new Map(),
            reactions: new Map(),
            decoyId: null,
        };
        this.phase = 'listening';
        this.touch();

        const feed: FeedEvent[] = [{ kind: 'round-started', number: index + 1, total: this.setlist.length }];
        // With no eligible voters (solo DJ online, guessing off) we go straight
        // to "waiting on the host" instead of hanging in a round nobody can end.
        feed.push(...this.maybeCloseVoting());
        return feed;
    }

    /** Players who are expected to guess in the current round. */
    eligibleVoters(): PlayerState[] {
        if (!this.round || !this.settings.guessingEnabled) return [];
        const djId = this.round.djId;
        return this.activePlayers.filter(player => player.id !== djId && player.presence === 'online');
    }

    private maybeCloseVoting(): FeedEvent[] {
        if (this.phase !== 'listening' || !this.round || !this.settings.guessingEnabled) return [];
        const pending = this.eligibleVoters().filter(player => !this.round!.votes.has(player.id));
        if (pending.length > 0) return [];
        this.phase = 'tallying';
        return [];
    }

    vote(playerId: PlayerId, guessId: PlayerId): FeedEvent[] {
        const player = this.requirePlayer(playerId);
        this.requirePhase('listening', 'tallying');
        const round = this.requireRound();
        if (!this.settings.guessingEnabled) throw new GameError('VOTE_NOT_ALLOWED');
        if (player.id === round.djId) throw new GameError('VOTE_OWN_TRACK');

        const target = this.players.get(guessId);
        if (!target || target.presence === 'left' || target.id === player.id) throw new GameError('VOTE_INVALID_TARGET');

        round.votes.set(player.id, target.id);
        this.touch();

        const feed: FeedEvent[] = [
            { kind: 'vote-cast', votesIn: round.votes.size, votersExpected: this.eligibleVoters().length },
        ];
        feed.push(...this.maybeCloseVoting());
        return feed;
    }

    /**
     * Spend nothing, a heart, or your one anthem on the current track.
     *
     * Idempotent and atomic: switching between reactions refunds the old one and
     * charges the new one in a single step, so the wallet can never drift.
     */
    react(playerId: PlayerId, reaction: Reaction): FeedEvent[] {
        const player = this.requirePlayer(playerId);
        this.requirePhase('listening', 'tallying');
        const round = this.requireRound();
        if (player.id === round.djId) throw new GameError('REACT_OWN_TRACK');

        const current = round.reactions.get(player.id);
        if (current === reaction || (!current && reaction === 'none')) return [];

        // Refund first: switching heart -> anthem must not fail for being broke.
        if (current === 'heart') player.heartsLeft += 1;
        if (current === 'anthem') player.anthemSpent = false;

        try {
            if (reaction === 'heart') {
                if (player.heartsLeft <= 0) throw new GameError('OUT_OF_HEARTS');
                player.heartsLeft -= 1;
                round.reactions.set(player.id, 'heart');
            } else if (reaction === 'anthem') {
                if (player.anthemSpent) throw new GameError('ANTHEM_SPENT');
                player.anthemSpent = true;
                round.reactions.set(player.id, 'anthem');
            } else {
                round.reactions.delete(player.id);
            }
        } catch (error) {
            // Put the refund back if the new reaction was rejected.
            if (current === 'heart') player.heartsLeft -= 1;
            if (current === 'anthem') player.anthemSpent = true;
            throw error;
        }

        this.touch();
        const counts = this.reactionCounts();
        const feed: FeedEvent[] = [{ kind: 'track-hearted', heartCount: counts.hearts }];
        if (reaction === 'anthem') feed.push({ kind: 'anthem-spent' });
        return feed;
    }

    reactionCounts(): { hearts: number; anthems: number } {
        let hearts = 0;
        let anthems = 0;
        for (const reaction of this.round?.reactions.values() ?? []) {
            if (reaction === 'anthem') anthems += 1;
            else hearts += 1;
        }
        return { hearts, anthems };
    }

    /**
     * The DJ names who they would like the room to blame. Their one job during
     * a round they cannot otherwise participate in.
     */
    setDecoy(playerId: PlayerId, decoyId: PlayerId | null): FeedEvent[] {
        const player = this.requirePlayer(playerId);
        this.requirePhase('listening', 'tallying');
        const round = this.requireRound();
        if (player.id !== round.djId) throw new GameError('DECOY_NOT_DJ');
        if (!this.settings.guessingEnabled) throw new GameError('VOTE_NOT_ALLOWED');

        if (decoyId === null) {
            round.decoyId = null;
        } else {
            const target = this.players.get(decoyId);
            if (!target || target.presence === 'left' || target.id === player.id) {
                throw new GameError('DECOY_INVALID_TARGET');
            }
            round.decoyId = target.id;
        }

        this.touch();
        return [];
    }

    reveal(playerId: PlayerId): FeedEvent[] {
        this.requireHost(playerId);
        this.requirePhase('listening', 'tallying');
        const round = this.requireRound();

        const decoyId = round.decoyId ?? undefined;
        const votes = [...round.votes.entries()].map(([voterId, guessId]) => ({
            voterId,
            guessId,
            correct: guessId === round.djId,
            // A decoy only counts as a hit when the voter was actually wrong.
            fooled: decoyId !== undefined && guessId === decoyId && guessId !== round.djId,
        }));

        const heartedBy: PlayerId[] = [];
        const anthemBy: PlayerId[] = [];
        for (const [listenerId, reaction] of round.reactions) {
            if (reaction === 'anthem') anthemBy.push(listenerId);
            else heartedBy.push(listenerId);
        }

        for (const delta of computeRoundPoints({ djId: round.djId, votes, heartedBy, anthemBy })) {
            const player = this.players.get(delta.playerId);
            if (player) player.scores[delta.board] += delta.points;
        }

        this.history.push({
            number: round.index + 1,
            trackId: round.trackId,
            djId: round.djId,
            heartedBy,
            anthemBy,
            decoyId,
            votes,
        });

        this.phase = 'reveal';
        this.touch();
        return [{ kind: 'round-revealed', number: round.index + 1, djId: round.djId }];
    }

    next(playerId: PlayerId): FeedEvent[] {
        this.requireHost(playerId);
        this.requirePhase('reveal');

        const nextIndex = this.roundIndex + 1;
        if (nextIndex >= this.setlist.length) return this.finish();
        return this.openRound(nextIndex);
    }

    private finish(): FeedEvent[] {
        this.phase = 'finished';
        this.round = null;
        this.cachedAwards = null;
        this.touch();
        return [{ kind: 'game-finished' }];
    }

    /** True when the current round is the last one in the setlist. */
    get isFinalRound(): boolean {
        return this.roundIndex >= 0 && this.roundIndex === this.setlist.length - 1;
    }

    /**
     * History in wire form. Safe for everyone: a round only lands here once it
     * has been revealed.
     */
    publicHistory(): PlayedTrack[] {
        return this.history.flatMap(entry => {
            const track = this.tracks.get(entry.trackId);
            if (!track) return [];
            return [
                {
                    number: entry.number,
                    track: toPublicTrack(track),
                    djId: entry.djId,
                    heartedBy: entry.heartedBy,
                    anthemBy: entry.anthemBy,
                    decoyId: entry.decoyId,
                    votes: entry.votes,
                },
            ];
        });
    }

    /**
     * The tracks that never came up. Queueing more than gets played only feels
     * worth it if you find out afterwards what you were sitting on.
     */
    unplayedTracks(): UnplayedTrack[] {
        if (this.phase !== 'finished') return [];
        const inSetlist = new Set(this.setlist);
        return [...this.tracks.values()]
            .filter(track => !inSetlist.has(track.id))
            .map(track => ({ track: toPublicTrack(track), djId: track.ownerId }));
    }

    awards(): Award[] {
        if (this.phase !== 'finished') return [];
        this.cachedAwards ??= computeAwards(this.publicHistory(), [...this.players.keys()]);
        return this.cachedAwards;
    }
}

export function normaliseSettings(settings: GameSettings): GameSettings {
    const queued = clampInt(
        settings.tracksPerPlayer,
        LIMITS.tracksPerPlayerMin,
        LIMITS.tracksPerPlayerMax,
        DEFAULT_SETTINGS.tracksPerPlayer,
    );
    // You cannot play more tracks than people queued, and playing *every* queued
    // track would hand the endgame straight back to process of elimination.
    const played = clampInt(settings.tracksPlayedPerPlayer, 1, queued, Math.min(queued, DEFAULT_SETTINGS.tracksPlayedPerPlayer));

    return {
        tracksPerPlayer: queued,
        tracksPlayedPerPlayer: played,
        guessingEnabled: settings.guessingEnabled !== false,
    };
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
    const raw = Number(value);
    if (!Number.isFinite(raw)) return Math.min(max, Math.max(min, fallback));
    return Math.min(max, Math.max(min, Math.trunc(raw)));
}

export function normaliseName(raw: unknown): string {
    const name = String(raw ?? '').trim().replace(/\s+/g, ' ');
    if (name.length < LIMITS.nameMin || name.length > LIMITS.nameMax || !NAME_PATTERN.test(name)) {
        throw new GameError('NAME_INVALID');
    }
    return name;
}
