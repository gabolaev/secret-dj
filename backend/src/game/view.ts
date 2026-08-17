/**
 * The projection boundary.
 *
 * This is the *only* function allowed to turn game state into something a
 * client receives. If a secret ever leaks, it leaks from here — which is the
 * point: there is one file to audit instead of a dozen ad-hoc `emit` calls.
 *
 * Secrecy rules, in one place:
 *  - who queued the current track  -> only the DJ themself, until `reveal`
 *  - who has and has not voted     -> nobody: an aggregate count only
 *  - the DJ's decoy                -> only the DJ themself, until `reveal`
 *  - who voted for whom            -> only your own guess, until `reveal`
 *  - who hearted or anthemed       -> anonymous counts only, until `reveal`
 *  - other players' track lists    -> never, at any point
 *  - other players' wallets        -> never (it would narrow who anthemed)
 */
import {
    computeRoundPoints,
    type GameView,
    type PlayerId,
    type PublicPlayer,
    type Reaction,
    type RoundView,
} from '@secret-dj/common';
import type { GameRoom } from './room.js';
import { toPublicTrack } from './publicTrack.js';

export function projectGame(room: GameRoom, viewerId: PlayerId): GameView {
    const viewer = room.players.get(viewerId);
    if (!viewer) throw new Error(`projectGame called for unknown player ${viewerId}`);

    const players: PublicPlayer[] = room.activePlayers.map(player => ({
        id: player.id,
        name: player.name,
        isHost: player.id === room.hostId,
        presence: player.presence,
        submitted: player.trackIds.length,
        ready: room.isReady(player),
        scores: { ...player.scores },
    }));

    // Players who walked out still appear in history and reveals, so their
    // names have to stay resolvable even though they are off the roster.
    for (const player of room.players.values()) {
        if (player.presence !== 'left') continue;
        const appearsInHistory = room.history.some(
            entry =>
                entry.djId === player.id ||
                entry.decoyId === player.id ||
                entry.votes.some(vote => vote.voterId === player.id || vote.guessId === player.id) ||
                entry.heartedBy.includes(player.id) ||
                entry.anthemBy.includes(player.id),
        );
        if (!appearsInHistory) continue;
        players.push({
            id: player.id,
            name: player.name,
            isHost: false,
            presence: 'left',
            submitted: player.trackIds.length,
            ready: true,
            scores: { ...player.scores },
        });
    }

    return {
        id: room.id,
        phase: room.phase,
        settings: room.settings,
        players,
        you: {
            id: viewer.id,
            name: viewer.name,
            isHost: viewer.id === room.hostId,
            tracks: viewer.trackIds.flatMap(id => {
                const track = room.tracks.get(id);
                return track ? [toPublicTrack(track)] : [];
            }),
            wallet: {
                heartsLeft: viewer.heartsLeft,
                heartBudget: viewer.heartBudget,
                anthemSpent: viewer.anthemSpent,
            },
        },
        round: projectRound(room, viewer.id),
        history: room.publicHistory(),
        setlistLength: room.setlist.length,
        unplayed: room.phase === 'finished' ? room.unplayedTracks() : undefined,
        awards: room.phase === 'finished' ? room.awards() : undefined,
        now: Date.now(),
    };
}

function projectRound(room: GameRoom, viewerId: PlayerId): RoundView | undefined {
    const round = room.round;
    if (!round) return undefined;

    const track = room.tracks.get(round.trackId);
    if (!track) return undefined;

    const isMine = round.djId === viewerId;
    const revealed = room.phase === 'reveal';
    const votesIn = round.votes.size;
    const counts = room.reactionCounts();
    const myReaction: Reaction = round.reactions.get(viewerId) ?? 'none';

    const view: RoundView = {
        number: round.index + 1,
        total: room.setlist.length,
        track: toPublicTrack(track),
        isMine,
        myGuess: round.votes.get(viewerId),
        myReaction,
        heartCount: counts.hearts,
        anthemCount: counts.anthems,
        votesIn,
        // A voter who disconnects after voting must not make the counter read 3/2.
        votersExpected: Math.max(votesIn, room.eligibleVoters().length),
        canVote:
            room.settings.guessingEnabled &&
            !isMine &&
            (room.phase === 'listening' || room.phase === 'tallying'),
        canReact: !isMine && (room.phase === 'listening' || room.phase === 'tallying'),
        // Only the DJ learns their own decoy before the reveal.
        myDecoy: isMine && !revealed ? (round.decoyId ?? undefined) : undefined,
    };

    if (revealed) {
        const entry = room.history[room.history.length - 1];
        const heartedBy = entry?.heartedBy ?? [];
        const anthemBy = entry?.anthemBy ?? [];
        const votes = entry?.votes ?? [];
        view.reveal = {
            djId: round.djId,
            heartedBy,
            anthemBy,
            votes,
            decoyId: entry?.decoyId,
            // Re-derived from the same pure function that banked the points, so
            // the displayed breakdown can never drift from the scoreboard.
            points: computeRoundPoints({ djId: round.djId, votes, heartedBy, anthemBy }),
        };
    }

    return view;
}
