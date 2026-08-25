/**
 * Hard limits shared by client and server.
 *
 * The client uses these to keep the UI honest; the server uses them to keep
 * the client honest. Never validate on one side only.
 */
export const LIMITS = {
    nameMin: 2,
    nameMax: 20,
    maxPlayers: 16,
    tracksPerPlayerMin: 1,
    tracksPerPlayerMax: 10,
    urlMax: 2048,
    gameIdLength: 5,
    /**
     * How long a round stays open before it reveals itself.
     *
     * Shared rather than server-only so the countdown on screen is the same
     * clock the server is about to act on, not a hopeful guess next to it.
     */
    roundMs: 60_000,
    /** A game with no live connections is reaped after this long. */
    emptyGameTtlMs: 30 * 60_000,
    /** A game with no activity at all is reaped after this long. */
    idleGameTtlMs: 12 * 60 * 60_000,
} as const;

/** Ambiguous glyphs (0/O, 1/I/L) are excluded so game codes survive being read aloud. */
export const GAME_ID_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export const NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} _.'-]*$/u;
