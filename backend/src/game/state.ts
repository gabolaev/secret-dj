/**
 * Server-private game state.
 *
 * Nothing in this file is ever serialised to a client. The only path from here
 * to the wire is `projectGame()` in `view.ts`, which decides — per viewer, per
 * phase — what may be revealed. Keeping the private shape structurally
 * different from the public shape is deliberate: it makes an accidental leak a
 * type error rather than a subtle bug.
 */
import type { GameSettings, PlayerId, Presence, Reaction, Scores, TrackId } from '@secret-dj/common';

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
    scores: Scores;
    /** Hearts still available for the rest of the night. */
    heartsLeft: number;
    /** Total hearts they were granted, kept so the UI can show "3 of 5 left". */
    heartBudget: number;
    /** Each player gets exactly one anthem per game. */
    anthemSpent: boolean;
}

export interface RoundState {
    /** 0-based index into `setlist`. */
    index: number;
    trackId: TrackId;
    djId: PlayerId;
    startedAt: number;
    votes: Map<PlayerId, PlayerId>;
    /** Listener -> what they spent. Never holds 'none'; absence means nothing spent. */
    reactions: Map<PlayerId, Exclude<Reaction, 'none'>>;
    /** Who the DJ wants the room to blame. Set during their own round. */
    decoyId: PlayerId | null;
}

export interface PlayedRound {
    number: number;
    trackId: TrackId;
    djId: PlayerId;
    heartedBy: PlayerId[];
    anthemBy: PlayerId[];
    decoyId?: PlayerId;
    votes: Array<{ voterId: PlayerId; guessId: PlayerId; correct: boolean; fooled: boolean }>;
}

export const DEFAULT_SETTINGS: GameSettings = {
    // Queue three, play two: the gap is what keeps the endgame unsolvable.
    tracksPerPlayer: 3,
    tracksPlayedPerPlayer: 2,
    guessingEnabled: true,
};
