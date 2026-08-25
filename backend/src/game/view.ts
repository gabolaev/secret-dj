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
 *  - who voted for whom            -> only your own guess, until `reveal`
 *  - what anybody answered         -> an anonymous count only, until `reveal`
 *  - the DJ's claim                -> only the DJ themself, until `reveal`
 *  - other players' track lists    -> never, at any point
 */
import {
    DEFAULT_CLAIM,
    claimMultiplier,
    computeRoundPoints,
    emptyAnswer,
    obviousnessDrag,
    type Answer,
    type GameView,
    type PlayerId,
    type PublicPlayer,
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
        score: player.score,
    }));

    // Players who walked out still appear in history and reveals, so their
    // names have to stay resolvable even though they are off the roster.
    for (const player of room.players.values()) {
        if (player.presence !== 'left') continue;
        const appearsInHistory = room.history.some(
            entry =>
                entry.djId === player.id ||
                entry.votes.some(vote => vote.voterId === player.id || vote.guessId === player.id) ||
                entry.answers.some(answer => answer.listenerId === player.id),
        );
        if (!appearsInHistory) continue;
        players.push({
            id: player.id,
            name: player.name,
            isHost: false,
            presence: 'left',
            submitted: player.trackIds.length,
            ready: true,
            score: player.score,
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
    const myAnswer: Answer = round.answers.get(viewerId) ?? emptyAnswer();

    // The claim is a tell — one of each per night, so a claim on screen narrows
    // who the DJ is by elimination — and it leans on the honest answers it is
    // scored on. Only the DJ sees theirs before the reveal.
    const { claim: ownClaim, ...anonymousTrack } = toPublicTrack(track);

    const view: RoundView = {
        number: round.index + 1,
        total: room.setlist.length,
        track: isMine || revealed ? { ...anonymousTrack, claim: ownClaim } : anonymousTrack,
        isMine,
        myGuess: round.votes.get(viewerId),
        myAnswer,
        answersIn: room.answersIn(),
        // An aggregate, like the vote counter: it says how many are still to
        // come, never which of them, so it cannot single the DJ out.
        answersExpected: Math.max(room.answersIn(), room.listenerCount()),
        endsAt: room.roundEndsAt,
        isReady: room.isRoundReady,
        // Aggregates only, like the vote counter: how many are finished, never
        // which of them, so the DJ cannot be picked out of the pattern.
        myDone: round.done.has(viewerId),
        doneIn: round.done.size,
        doneExpected: Math.max(round.done.size, room.listenerCount()),
        votesIn,
        // A voter who disconnects after voting must not make the counter read 3/2.
        votersExpected: Math.max(votesIn, room.eligibleVoters().length),
        canVote:
            room.settings.guessingEnabled &&
            !isMine &&
            (room.phase === 'listening' || room.phase === 'tallying'),
        canAnswer: !isMine && (room.phase === 'listening' || room.phase === 'tallying'),
    };

    if (revealed) {
        const entry = room.history[room.history.length - 1];
        const answers = entry?.answers ?? [];
        const votes = entry?.votes ?? [];
        const listenerCount = entry?.listenerCount ?? 0;
        const claim = track.claim ?? DEFAULT_CLAIM;
        view.reveal = {
            djId: round.djId,
            answers,
            votes,
            listenerCount,
            claimMultiplier: claimMultiplier({ claim, answers, votes }),
            obviousnessDrag: obviousnessDrag(answers),
            // Re-derived from the same pure functions that banked the points, so
            // the displayed breakdown can never drift from the scoreboard.
            points: computeRoundPoints({ djId: round.djId, claim, votes, answers, listenerCount }),
        };
    }

    return view;
}
