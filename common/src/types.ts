/**
 * Public domain types.
 *
 * Everything in this file describes what a *client* is allowed to know.
 * The server's private state lives in `backend/src/game/state.ts` and is never
 * serialised directly — it is always projected through `projectGame()`, which is
 * the single place where secrecy rules are enforced.
 */

export type GameId = string;
export type PlayerId = string;
export type TrackId = string;

/**
 * The game is a five-state machine. Legal transitions:
 *
 *   lobby ──start──▶ listening ──all votes in──▶ tallying
 *                        │                          │
 *                        └────────host reveals──────┤
 *                                                   ▼
 *                        ┌──────────────────────▶ reveal
 *                        │                          │
 *                    more tracks ◀──host advances───┤
 *                                                   ▼
 *                                                finished
 */
export type GamePhase = 'lobby' | 'listening' | 'tallying' | 'reveal' | 'finished';

export type Presence = 'online' | 'offline' | 'left';

/**
 * What a listener chose to spend on a track. Exactly one of the three, so
 * switching between them is a single idempotent command rather than a pair of
 * toggles that can disagree.
 */
export type Reaction = 'none' | 'heart' | 'anthem';

export interface GameSettings {
    /** How many tracks each player queues up before the game can start. */
    tracksPerPlayer: number;
    /**
     * How many of those actually make the setlist, chosen at random per player.
     * Keeping this below `tracksPerPlayer` is what stops the endgame from being
     * solvable by elimination — you can never be certain a DJ is spent.
     */
    tracksPlayedPerPlayer: number;
    /**
     * When false the game becomes a pure listening party: no guessing, no
     * decoys, no Detective scoreboard. Just tracks and hearts.
     */
    guessingEnabled: boolean;
}

export interface PublicTrack {
    id: TrackId;
    url: string;
    title?: string;
    artist?: string;
    artwork?: string;
    /** Display name of the detected streaming service, e.g. "Spotify". */
    service?: string;
    /** Whether the server has finished (or given up on) metadata lookup. */
    metadata: 'pending' | 'ready' | 'failed';
}

/**
 * Two scoreboards, because the game serves two people: the one who wants to
 * share music they love, and the one who wants to read the room. Forcing both
 * onto one number served neither.
 */
export interface Scores {
    /** Hearts and anthems your tracks earned. */
    selector: number;
    /** Correct guesses, plus listeners your decoys fooled. */
    detective: number;
}

export interface PublicPlayer {
    id: PlayerId;
    name: string;
    isHost: boolean;
    presence: Presence;
    /** Number of tracks queued. */
    submitted: number;
    ready: boolean;
    scores: Scores;
    // Deliberately absent: any per-player "has voted" flag identifies the DJ.
    // Mark the DJ as not-voted and they are the only one still pending once
    // everyone else has answered; mark them as voted and they are the only one
    // already done the instant the round opens. The DJ's value is constant
    // while every other player's flips, so there is no safe value to send.
    // Progress is reported in aggregate on `RoundView.votesIn` instead.
}

export interface VoteRecord {
    voterId: PlayerId;
    guessId: PlayerId;
    correct: boolean;
    /** True when this voter fell for the DJ's decoy. */
    fooled: boolean;
}

export type PointReason = 'correct-guess' | 'hearts-received' | 'anthem-received' | 'decoy-hit';

export interface PointDelta {
    playerId: PlayerId;
    points: number;
    reason: PointReason;
    /** Which scoreboard the points land on. */
    board: keyof Scores;
}

/** Revealed round information. Only ever present once the phase is `reveal`. */
export interface RoundReveal {
    djId: PlayerId;
    heartedBy: PlayerId[];
    /** At most one player per round can spend their single anthem here. */
    anthemBy: PlayerId[];
    votes: VoteRecord[];
    /** Who the DJ tried to be mistaken for, if they named anyone. */
    decoyId?: PlayerId;
    points: PointDelta[];
}

export interface RoundView {
    /** 1-based position in the setlist. */
    number: number;
    /** Total tracks in the setlist. */
    total: number;
    track: PublicTrack;
    /** True when the viewer is the DJ behind this track. */
    isMine: boolean;
    /** The viewer's own guess, if any. Never leaks other players' guesses. */
    myGuess?: PlayerId;
    /** The viewer's own reaction. Other people's stay sealed until the reveal. */
    myReaction: Reaction;
    /** Anonymous running totals — dramatic, but they name nobody. */
    heartCount: number;
    anthemCount: number;
    votesIn: number;
    votersExpected: number;
    /** False for the DJ, and when guessing is disabled. */
    canVote: boolean;
    /** False for the DJ, who cannot react to their own track. */
    canReact: boolean;
    /** Only ever set for the DJ, and only before the reveal. */
    myDecoy?: PlayerId;
    reveal?: RoundReveal;
}

export interface PlayedTrack {
    number: number;
    track: PublicTrack;
    djId: PlayerId;
    heartedBy: PlayerId[];
    anthemBy: PlayerId[];
    votes: VoteRecord[];
    decoyId?: PlayerId;
}

/** A queued track that never made the setlist, revealed once the game is over. */
export interface UnplayedTrack {
    track: PublicTrack;
    djId: PlayerId;
}

export type AwardId =
    // Selector: what your taste did to the room.
    | 'crowd-favourite'
    | 'track-of-the-night'
    | 'golden-ear'
    // Detective: what you did to the people.
    | 'human-shazam'
    | 'ghost'
    | 'puppet-master';

export interface Award {
    id: AwardId;
    /** Winners are plural on purpose: ties are shared, never broken arbitrarily. */
    winners: PlayerId[];
    /** The winning value, pre-formatted context for the UI. */
    value: number;
    /** Optional supporting detail, e.g. the winning track title. */
    detail?: string;
}

/** What the viewer has left to spend for the rest of the night. */
export interface Wallet {
    heartsLeft: number;
    heartBudget: number;
    anthemSpent: boolean;
}

/** Everything one specific viewer is allowed to see, at one moment in time. */
export interface GameView {
    id: GameId;
    phase: GamePhase;
    settings: GameSettings;
    players: PublicPlayer[];
    you: {
        id: PlayerId;
        name: string;
        isHost: boolean;
        tracks: PublicTrack[];
        wallet: Wallet;
    };
    round?: RoundView;
    history: PlayedTrack[];
    /** Total tracks in the setlist (0 while still in the lobby). */
    setlistLength: number;
    /** The tracks that never came up. Only sent once the game has finished. */
    unplayed?: UnplayedTrack[];
    awards?: Award[];
    /** Server clock, so clients can render "x seconds ago" without drifting. */
    now: number;
}
