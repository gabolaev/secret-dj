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
 *                    more tracks ◀───host advances──┤
 *                                                   ▼
 *                                                finished
 */
export type GamePhase = 'lobby' | 'listening' | 'tallying' | 'reveal' | 'finished';

export type Presence = 'online' | 'offline' | 'left';

/**
 * How much a listener liked a track: nothing at all, up to five.
 *
 * Zero is a real answer — "this did nothing for me" — not an abstention. Having
 * said nothing yet is the *absence* of a rating, which is why `Answer.like` is
 * optional rather than defaulting to zero.
 */
export type Rating = 0 | 1 | 2 | 3 | 4 | 5;

export const RATING_MIN = 0;
export const RATING_MAX = 5;

export function isRating(value: unknown): value is Rating {
    if (typeof value !== 'number' || !Number.isInteger(value)) return false;
    return value >= RATING_MIN && value <= RATING_MAX;
}

/**
 * Everything one listener says about one track.
 *
 * Three of these four answers are things no server could ever check — whether
 * you had heard it, whether it moved you, whether you reckon it is well known.
 * The game rests on people answering honestly; what the code can do is make a
 * lie visible at the reveal and barely worth telling, which is why every
 * statistic below is a share of the room rather than a threshold.
 *
 * The like is the **signature on the whole answer**: until it is given, the
 * three toggles count for nothing. That is what lets every share in the game
 * divide by the same number — the listeners who actually answered — instead of
 * each statistic inventing its own denominator.
 */
export interface Answer {
    /** Absent until they answer. Zero means "nothing"; absent means "nothing yet". */
    like?: Rating;
    /** They had heard this track before tonight. */
    heard: boolean;
    /** They reckon this is a popular track, whatever they think of it. */
    popular: boolean;
    /** It got to them, one way or the other. Liking it is a separate question. */
    moved: boolean;
}

/** A completed answer, as the reveal publishes it — attributed, on purpose. */
export interface AnswerRecord {
    listenerId: PlayerId;
    like: Rating;
    heard: boolean;
    popular: boolean;
    moved: boolean;
}

export function emptyAnswer(): Answer {
    return { heard: false, popular: false, moved: false };
}

/**
 * What the DJ claims this track will do to the room.
 *
 * The claim is what turns queueing into a decision: it is announced when the
 * track starts — the DJ's name is not — and it multiplies whatever the room
 * gives them. `none` is the floor and the default, the play that asks nothing
 * of the music; every other claim pays more only if the track really is new to
 * them, really does land with all of them, really moves them, really is
 * recognisably yours, or really does split them.
 */
export type ClaimId = 'none' | 'never-heard' | 'unanimous' | 'emotional' | 'so-me' | 'divisive';

export interface TrackClaim {
    id: ClaimId;
}

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
     * no identification claims. Just tracks and what people made of them.
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
    /**
     * The DJ's bet. **Withheld from listeners while the track is playing** and
     * sent only to the DJ themself until the reveal, for two reasons: each claim
     * is one a night, so a claim on screen is elimination information; and
     * announcing it biases the very answers it is scored on. Present everywhere
     * after the reveal, and on your own queued tracks in the lobby.
     */
    claim?: TrackClaim;
}

export interface PublicPlayer {
    id: PlayerId;
    name: string;
    isHost: boolean;
    presence: Presence;
    /** Number of tracks queued. */
    submitted: number;
    ready: boolean;
    /**
     * One number, and you only ever score it as a DJ: what your tracks did to
     * the room, put through your claim. Reading the room is still played and
     * still wins trophies — it no longer pays.
     */
    score: number;
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
}

export type PointReason =
    /** What the room gave: likes, plus the novelty and emotion bonuses. */
    | 'room-verdict'
    /** What calling it popular took back off. Never positive. */
    | 'obviousness'
    /** The swing from the DJ's claim. Negative when the claim did not land. */
    | 'claim-landed';

export interface PointDelta {
    playerId: PlayerId;
    points: number;
    reason: PointReason;
}

/** Revealed round information. Only ever present once the phase is `reveal`. */
export interface RoundReveal {
    djId: PlayerId;
    /** Every completed answer, best-liked first, with a name on each one. */
    answers: AnswerRecord[];
    votes: VoteRecord[];
    /** How many listeners were entitled to answer, answered or not. */
    listenerCount: number;
    /** What the DJ's claim turned out to be worth, e.g. 1.4. */
    claimMultiplier: number;
    /** What calling it popular cost, as a multiplier, e.g. 0.75. */
    obviousnessDrag: number;
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
    /** The viewer's own answer. Other people's stay sealed until the reveal. */
    myAnswer: Answer;
    /**
     * How many listeners have answered — a count, never a total. Publishing the
     * running score would anchor everyone still deciding, and with two answers
     * in it would give away what the first one was.
     */
    answersIn: number;
    /** Listeners present and expected to answer. */
    answersExpected: number;
    votesIn: number;
    votersExpected: number;
    /** True once nobody present still owes a vote or an answer. Gates the reveal. */
    isReady: boolean;
    /** False for the DJ, and when guessing is disabled. */
    canVote: boolean;
    /** False for the DJ, who cannot answer on their own track. */
    canAnswer: boolean;
    reveal?: RoundReveal;
}

export interface PlayedTrack {
    number: number;
    track: PublicTrack;
    djId: PlayerId;
    answers: AnswerRecord[];
    votes: VoteRecord[];
    /**
     * Listeners entitled to answer this round. The scoring divides by whoever
     * actually did and then scales back up to this, so staying quiet neither
     * helps nor hurts a DJ — and a round that happened while two people were
     * making tea is still comparable with every other round.
     */
    listenerCount: number;
}

/** A queued track that never made the setlist, revealed once the game is over. */
export interface UnplayedTrack {
    track: PublicTrack;
    djId: PlayerId;
}

export type AwardId =
    // What your taste did to the room.
    | 'crowd-favourite'
    | 'track-of-the-night'
    | 'deep-cut'
    | 'gut-punch'
    // What you did to the people. These pay in trophies, never in points.
    | 'human-shazam'
    | 'ghost';

export interface Award {
    id: AwardId;
    /** Winners are plural on purpose: ties are shared, never broken arbitrarily. */
    winners: PlayerId[];
    /** The winning value, pre-formatted context for the UI. */
    value: number;
    /** Optional supporting detail, e.g. the winning track title. */
    detail?: string;
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
