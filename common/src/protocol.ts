/**
 * The wire contract.
 *
 * Design rule that fixes an entire class of v1 bugs: **after the handshake, no
 * client event carries an identity**. The server derives the actor from the
 * socket's session, so "vote as someone else" is not a request you can express.
 */
import type { ErrorCode } from './errors.js';
import type { Answer, ClaimId, GameId, GameSettings, GameView, PlayerId, TrackId } from './types.js';

export type Ok<T> = { ok: true } & T;
export type Fail = { ok: false; code: ErrorCode; message: string };
export type Result<T = Record<string, never>> = Ok<T> | Fail;
export type Ack<T = Record<string, never>> = (result: Result<T>) => void;

/**
 * Handed out on create/join and stored by the client. Presenting it is what
 * proves you are the player you claim to be, across reloads and reconnects.
 */
export interface Session {
    gameId: GameId;
    playerId: PlayerId;
    /** Secret. Never rendered, never logged. */
    token: string;
    name: string;
}

export interface CreateGameRequest {
    name: string;
    settings?: Partial<GameSettings>;
}

export interface JoinGameRequest {
    gameId: GameId;
    name: string;
}

export interface ResumeRequest {
    gameId: GameId;
    playerId: PlayerId;
    token: string;
}

/** Short-lived notices used for toasts and animations; never load-bearing. */
export type FeedEvent =
    | { kind: 'player-joined'; playerId: PlayerId; name: string }
    | { kind: 'player-left'; playerId: PlayerId; name: string }
    | { kind: 'player-offline'; playerId: PlayerId; name: string }
    | { kind: 'player-online'; playerId: PlayerId; name: string }
    | { kind: 'host-changed'; playerId: PlayerId; name: string }
    | { kind: 'track-answered'; answersIn: number }
    | { kind: 'round-ready' }
    | { kind: 'vote-cast'; votesIn: number; votersExpected: number }
    | { kind: 'round-started'; number: number; total: number }
    | { kind: 'round-revealed'; number: number; djId: PlayerId }
    | { kind: 'game-finished' };

export interface ClientToServerEvents {
    'game:create': (req: CreateGameRequest, ack: Ack<{ session: Session }>) => void;
    'game:join': (req: JoinGameRequest, ack: Ack<{ session: Session }>) => void;
    'game:resume': (req: ResumeRequest, ack: Ack<{ session: Session }>) => void;
    'game:leave': (req: Record<string, never>, ack: Ack) => void;

    'track:add': (req: { url: string }, ack: Ack<{ trackId: TrackId }>) => void;
    'track:remove': (req: { trackId: TrackId }, ack: Ack) => void;
    /**
     * Attach a claim to one of your queued tracks. Lobby only: the bet has to
     * be made before you know a single thing about how the night will go.
     */
    'track:claim': (req: { trackId: TrackId; claim: ClaimId }, ack: Ack) => void;

    'settings:update': (req: Partial<GameSettings>, ack: Ack) => void;
    'game:start': (req: Record<string, never>, ack: Ack) => void;

    /** Idempotent by design: send the guess you want to stand, not a toggle. */
    'round:vote': (req: { guessId: PlayerId }, ack: Ack) => void;
    /**
     * Say something about the current track — a patch, so each control sends
     * only what it changed and the four answers never overwrite each other.
     * Idempotent: send the answer you want to stand, not a toggle.
     */
    'round:answer': (req: Partial<Answer>, ack: Ack) => void;
    /** "I am finished." When every listener present has said so, the round
     *  reveals itself. Idempotent, and revocable until it does. */
    'round:done': (req: { done: boolean }, ack: Ack) => void;
    'round:reveal': (req: Record<string, never>, ack: Ack) => void;
    'round:next': (req: Record<string, never>, ack: Ack) => void;
}

export interface ServerToClientEvents {
    'game:state': (view: GameView) => void;
    'game:feed': (event: FeedEvent) => void;
    /** The game no longer exists (reaped, or you were the last one out). */
    'game:closed': (reason: string) => void;
}

export function fail(code: ErrorCode, message: string): Fail {
    return { ok: false, code, message };
}
