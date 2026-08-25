/**
 * Server-private game state.
 *
 * Nothing in this file is ever serialised to a client. The only path from here
 * to the wire is `projectGame()` in `view.ts`, which decides — per viewer, per
 * phase — what may be revealed. Keeping the private shape structurally
 * different from the public shape is deliberate: it makes an accidental leak a
 * type error rather than a subtle bug.
 */
import type {
    Answer,
    AnswerRecord,
    GameSettings,
    PlayerId,
    Presence,
    TrackClaim,
    TrackId,
} from '@secret-dj/common';

export interface TrackState {
    id: TrackId;
    ownerId: PlayerId;
    url: string;
    /** Stable identity of the underlying song, used for duplicate detection. */
    canonical: string;
    serviceName: string;
    title?: string;
    artist?: string;
    artwork?: string;
    metadata: 'pending' | 'ready' | 'failed';
    /** The DJ's bet on this track. Every track has one; the default is safe. */
    claim: TrackClaim;
    addedAt: number;
}

export interface PlayerState {
    id: PlayerId;
    name: string;
    /** Case-folded name, used for the uniqueness check. */
    nameKey: string;
    /** Bearer secret proving ownership of this seat. Never leaves the server
     *  except in the one ack that issues it. */
    token: string;
    /** Join order. Drives deterministic host succession. */
    seq: number;
    presence: Presence;
    /** Number of live sockets. Multi-tab safe: one tab closing != offline. */
    connections: number;
    /** When `presence` last became 'offline'; used for the host grace period. */
    offlineSince: number | null;
    trackIds: TrackId[];
    /** One number: what your tracks did to the room, put through your claim. */
    score: number;
}

export interface RoundState {
    /** 0-based index into `setlist`. */
    index: number;
    trackId: TrackId;
    djId: PlayerId;
    startedAt: number;
    votes: Map<PlayerId, PlayerId>;
    /** Listener -> what they said. An entry without a `like` has not answered. */
    answers: Map<PlayerId, Answer>;
    /** Listeners who have said they are finished. When all of them have, the
     *  round reveals itself — no host action required. */
    done: Set<PlayerId>;
}

export interface PlayedRound {
    number: number;
    trackId: TrackId;
    djId: PlayerId;
    answers: AnswerRecord[];
    /** Listeners entitled to answer, answered or not. The scoring scales to it. */
    listenerCount: number;
    votes: Array<{ voterId: PlayerId; guessId: PlayerId; correct: boolean }>;
}

export const DEFAULT_SETTINGS: GameSettings = {
    // Queue three, play two: the gap is what keeps the endgame unsolvable.
    tracksPerPlayer: 3,
    tracksPlayedPerPlayer: 2,
    guessingEnabled: true,
};
