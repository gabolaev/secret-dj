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
    CLAIMS_BY_ID,
    DEFAULT_CLAIM,
    canonicalKey,
    claimAvailable,
    cleanUrl,
    computeAwards,
    computeRoundPoints,
    detectService,
    emptyAnswer,
    isRating,
    GameError,
    LIMITS,
    NAME_PATTERN,
    buildSetlist,
    shuffle,
    type Answer,
    type AnswerRecord,
    type Award,
    type ClaimId,
    type FeedEvent,
    type GamePhase,
    type GameSettings,
    type PlayedTrack,
    type PlayerId,
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
            score: 0,
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

        this.pruneClaims();

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
            claim: DEFAULT_CLAIM,
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

    /**
     * Attach a claim to one of your own queued tracks.
     *
     * Lobby only, and deliberately so: the claim is a bet made before you know
     * anything about the night — the running order, the room's mood, or what
     * anyone else brought. Letting it move later would turn a bet into a read.
     */
    setClaim(playerId: PlayerId, trackId: TrackId, claimId: ClaimId): void {
        const player = this.requirePlayer(playerId);
        this.requirePhase('lobby');

        const track = this.tracks.get(trackId);
        if (!track || track.ownerId !== player.id) throw new GameError('TRACK_NOT_FOUND');

        const definition = CLAIMS_BY_ID[claimId];
        if (!definition) throw new GameError('CLAIM_INVALID');

        const table = { players: this.activePlayers.length, guessingEnabled: this.settings.guessingEnabled };
        if (!claimAvailable(definition, table)) throw new GameError('CLAIM_UNAVAILABLE');

        // Limited claims are one apiece: the whole decision is which of your
        // tracks deserves which bet, and that only bites if you cannot repeat.
        if (definition.limit !== null) {
            const spent = player.trackIds.filter(id => {
                const other = this.tracks.get(id);
                return other !== undefined && other.id !== track.id && other.claim.id === claimId;
            }).length;
            if (spent >= definition.limit) throw new GameError('CLAIM_SPENT');
        }

        track.claim = { id: claimId };
        this.touch();
    }

    /**
     * Drops claims that a change of table has made illegal.
     *
     * Players leave and the host flips guessing off, either of which can strand
     * a claim that was legal when it was made. Rather than reject those changes,
     * the affected tracks fall back to the safe claim — the alternative is a
     * lobby you cannot get out of.
     */
    private pruneClaims(): void {
        if (this.phase !== 'lobby') return;
        const table = { players: this.activePlayers.length, guessingEnabled: this.settings.guessingEnabled };

        for (const track of this.tracks.values()) {
            const claim = track.claim;
            if (claim.id === DEFAULT_CLAIM.id) continue;

            if (!claimAvailable(CLAIMS_BY_ID[claim.id], table)) track.claim = DEFAULT_CLAIM;
        }
    }

    /** Tracks whose lookup has not produced a title. Fuel for the retry sweep. */
    unresolvedTracks(): TrackState[] {
        return [...this.tracks.values()].filter(track => track.metadata !== 'ready');
    }

    /** Applied out-of-band once the metadata service has an answer. */
    applyMetadata(
        trackId: TrackId,
        metadata: { title?: string; artist?: string; artwork?: string } | null,
    ): boolean {
        const track = this.tracks.get(trackId);
        // A failed lookup is retried, so `failed` is not a final state — only a
        // title we already have is worth protecting from being overwritten.
        if (!track || track.metadata === 'ready') return false;

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
        this.pruneClaims();
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

        for (const player of players) player.score = 0;

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
            answers: new Map(),
            done: new Set(),
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

    /** Listeners who are present and still owe the round something. */
    pending(): { toVote: PlayerState[]; toAnswer: PlayerState[] } {
        const round = this.round;
        if (!round) return { toVote: [], toAnswer: [] };
        const present = this.activePlayers.filter(
            player => player.id !== round.djId && player.presence === 'online',
        );
        return {
            toVote: this.settings.guessingEnabled ? present.filter(player => !round.votes.has(player.id)) : [],
            toAnswer: present.filter(player => round.answers.get(player.id)?.like === undefined),
        };
    }

    /**
     * True once nobody present still owes the round a vote.
     *
     * Deliberately *not* waiting on answers as well. Requiring one would mean a
     * single person with the tab open and their phone in their pocket freezes
     * the night, and the host no longer has an escape hatch — a worse failure
     * than the one this gate exists to prevent. How many are still deciding is
     * published instead, so the host can choose to wait.
     */
    get isRoundReady(): boolean {
        return this.pending().toVote.length === 0;
    }

    private maybeCloseVoting(): FeedEvent[] {
        if (this.phase !== 'listening' || !this.round) return [];
        if (!this.isRoundReady) return [];
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
     * Say something about the current track: how much you liked it, whether you
     * had heard it, whether you reckon everyone has, whether it got to you.
     *
     * A patch rather than a whole answer, so the four controls never overwrite
     * each other, and idempotent, so a double tap is not a toggle. Three of the
     * four are self-reports no server can verify — the game asks people not to
     * lie, and the reveal is what holds them to it.
     */
    answer(playerId: PlayerId, patch: Partial<Answer>): FeedEvent[] {
        const player = this.requirePlayer(playerId);
        this.requirePhase('listening', 'tallying');
        const round = this.requireRound();
        if (player.id === round.djId) throw new GameError('ANSWER_OWN_TRACK');
        if (patch.like !== undefined && !isRating(patch.like)) throw new GameError('RATING_INVALID');

        const current = round.answers.get(player.id) ?? emptyAnswer();
        const next: Answer = {
            like: patch.like ?? current.like,
            heard: patch.heard ?? current.heard,
            popular: patch.popular ?? current.popular,
            moved: patch.moved ?? current.moved,
        };
        round.answers.set(player.id, next);

        this.touch();
        const feed: FeedEvent[] = [{ kind: 'track-answered', answersIn: this.answersIn() }];
        feed.push(...this.maybeCloseVoting());
        return feed;
    }

    /**
     * Listeners who have signed their answer with a like.
     *
     * The like is what makes an answer count: the toggles alone say nothing, and
     * every share in the scoring divides by this number, so there is exactly one
     * denominator in the game rather than one per statistic.
     */
    answersIn(): number {
        let count = 0;
        for (const answer of this.round?.answers.values() ?? []) {
            if (answer.like !== undefined) count += 1;
        }
        return count;
    }

    /**
     * "I am finished." The round reveals itself once every listener present has
     * said so, which is the normal way a round ends — the host's own reveal is
     * the fallback for a room where somebody never gets round to it.
     */
    markDone(playerId: PlayerId, done: boolean): FeedEvent[] {
        const player = this.requirePlayer(playerId);
        this.requirePhase('listening', 'tallying');
        const round = this.requireRound();
        if (player.id === round.djId) throw new GameError('ANSWER_OWN_TRACK');

        if (round.done.has(player.id) === done) return [];
        if (done) round.done.add(player.id);
        else round.done.delete(player.id);
        this.touch();

        const feed: FeedEvent[] = [];
        feed.push(...this.maybeCloseVoting());
        if (this.everyoneDone()) {
            feed.push({ kind: 'round-ready' });
            feed.push(...this.revealRound());
        }
        return feed;
    }

    /**
     * When the current round's minute is up. Zero when no round is open.
     *
     * Nothing happens at zero — the clock keeps counting into the negative and
     * the room can see it. It is pressure to get on with it, not a guillotine
     * that throws away an answer somebody was halfway through.
     */
    get roundEndsAt(): number {
        return this.round ? this.round.startedAt + LIMITS.roundMs : 0;
    }


    /** True when every listener present has pressed done, and there is one. */
    everyoneDone(): boolean {
        const round = this.round;
        if (!round || this.phase === 'reveal' || this.phase === 'finished') return false;
        const present = this.activePlayers.filter(
            player => player.id !== round.djId && player.presence === 'online',
        );
        // A room with nobody in it has not agreed on anything.
        return present.length > 0 && present.every(player => round.done.has(player.id));
    }

    /** Listeners entitled to answer the current round, whether they did or not. */
    listenerCount(): number {
        if (!this.round) return 0;
        return this.activePlayers.filter(player => player.id !== this.round!.djId).length;
    }

    reveal(playerId: PlayerId): FeedEvent[] {
        this.requireHost(playerId);
        this.requirePhase('listening', 'tallying');
        this.requireRound();
        // The host used to be able to reveal over the top of people still
        // voting. Anyone who actually walks away drops out of `pending()` the
        // moment their socket goes, so waiting can no longer strand the room.
        if (!this.isRoundReady) throw new GameError('ROUND_NOT_READY');
        return this.revealRound();
    }

    /**
     * Banks the round and opens it up.
     *
     * Separate from `reveal` because the room can get here two ways: the host
     * pressing the button, or everybody saying they are finished. Neither path
     * may skip the banking, so there is one body and two doors.
     */
    private revealRound(): FeedEvent[] {
        const round = this.requireRound();

        const votes = [...round.votes.entries()].map(([voterId, guessId]) => ({
            voterId,
            guessId,
            correct: guessId === round.djId,
        }));

        // Only signed answers count, best-liked first: the reveal reads as a
        // chart, not as a join order.
        const answers: AnswerRecord[] = [...round.answers.entries()]
            .flatMap(([listenerId, answer]) =>
                answer.like === undefined ? [] : [{ listenerId, ...answer, like: answer.like }],
            )
            .sort((a, b) => b.like - a.like);
        const listenerCount = this.listenerCount();
        const claim = this.tracks.get(round.trackId)?.claim ?? DEFAULT_CLAIM;

        for (const delta of computeRoundPoints({ djId: round.djId, claim, votes, answers, listenerCount })) {
            const player = this.players.get(delta.playerId);
            if (player) player.score += delta.points;
        }

        this.history.push({
            number: round.index + 1,
            trackId: round.trackId,
            djId: round.djId,
            answers,
            listenerCount,
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
                    answers: entry.answers,
                    listenerCount: entry.listenerCount,
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
