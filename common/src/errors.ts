/**
 * Every rejection the server can produce, as a closed set.
 *
 * Handlers return codes, not prose, so the client can react structurally
 * (e.g. drop a stale session on `SESSION_INVALID`) and — since the UI is
 * translated — render its own wording. The English strings below are the
 * fallback for anything that is not a browser: logs, curl, tests.
 *
 * Because of that, a situation that needs its own sentence needs its own code.
 * There is no free-text error channel on purpose.
 */
export type ErrorCode =
    | 'BAD_REQUEST'
    | 'GAME_NOT_FOUND'
    | 'GAME_FULL'
    | 'GAME_ALREADY_STARTED'
    | 'NAME_TAKEN'
    | 'NAME_INVALID'
    | 'SESSION_INVALID'
    | 'NOT_AUTHENTICATED'
    | 'NOT_HOST'
    | 'WRONG_PHASE'
    | 'NOT_READY'
    | 'NOT_ENOUGH_PLAYERS'
    | 'TRACK_LIMIT_REACHED'
    | 'TRACK_DUPLICATE'
    | 'TRACK_UNSUPPORTED'
    | 'TRACK_URL_INVALID'
    | 'TRACK_NOT_FOUND'
    | 'VOTE_NOT_ALLOWED'
    | 'VOTE_OWN_TRACK'
    | 'VOTE_INVALID_TARGET'
    | 'REACT_OWN_TRACK'
    | 'OUT_OF_HEARTS'
    | 'ANTHEM_SPENT'
    | 'DECOY_NOT_DJ'
    | 'DECOY_INVALID_TARGET'
    | 'RATE_LIMITED'
    | 'INTERNAL';

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
    BAD_REQUEST: 'That request did not make sense.',
    GAME_NOT_FOUND: 'No game with that code. Check the spelling?',
    GAME_FULL: 'This game is full.',
    GAME_ALREADY_STARTED: 'This game is already under way.',
    NAME_TAKEN: 'Someone in this game already goes by that name.',
    NAME_INVALID: 'Pick a name of 2-20 letters, numbers, spaces or - _ . apostrophe.',
    SESSION_INVALID: 'Your seat expired. Join again to get a new one.',
    NOT_AUTHENTICATED: 'You are not in a game yet.',
    NOT_HOST: 'Only the host can do that.',
    WRONG_PHASE: 'That is not possible right now.',
    NOT_READY: 'Everyone needs to finish queueing tracks first.',
    NOT_ENOUGH_PLAYERS: 'Guessing needs at least two DJs. Invite someone, or switch to a listening party.',
    TRACK_LIMIT_REACHED: 'You have already queued all of your tracks.',
    TRACK_DUPLICATE: 'That track is already in this game.',
    TRACK_UNSUPPORTED: 'That link is not from a music service we can play.',
    TRACK_URL_INVALID: 'That is not a usable link.',
    TRACK_NOT_FOUND: 'That track is not in your queue.',
    VOTE_NOT_ALLOWED: 'You cannot vote in this round.',
    VOTE_OWN_TRACK: 'It is your track. Sit this one out and enjoy it.',
    VOTE_INVALID_TARGET: 'That is not someone you can vote for.',
    REACT_OWN_TRACK: 'Hearting your own track is cheating, and a little sad.',
    OUT_OF_HEARTS: 'You are out of hearts for tonight. Spend them wisely.',
    ANTHEM_SPENT: 'You only get one anthem a night, and yours is gone.',
    DECOY_NOT_DJ: 'Only the DJ can set a decoy.',
    DECOY_INVALID_TARGET: 'Pick someone else in the room to be mistaken for.',
    RATE_LIMITED: 'Slow down a moment.',
    INTERNAL: 'Something broke on our side.',
};

export class GameError extends Error {
    constructor(
        readonly code: ErrorCode,
        message = ERROR_MESSAGES[code],
    ) {
        super(message);
        this.name = 'GameError';
    }
}
