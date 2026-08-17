import type { Session } from '@secret-dj/common';

/**
 * Session persistence.
 *
 * v1 stored a bare `username` + `gameId` in localStorage, which meant anyone who
 * knew your name could take your seat, and a stale entry for a game that no
 * longer existed booted you into a permanently blank "in game" screen.
 *
 * v2 stores the server-issued token instead. It is a bearer credential: it is
 * never rendered, never put in the URL, and is dropped the moment the server
 * says it is invalid.
 */
const STORAGE_KEY = 'secret-dj/session/v2';

function isSession(value: unknown): value is Session {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<Session>;
    return (
        typeof candidate.gameId === 'string' &&
        typeof candidate.playerId === 'string' &&
        typeof candidate.token === 'string' &&
        typeof candidate.name === 'string'
    );
}

export function loadSession(): Session | null {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        return isSession(parsed) ? parsed : null;
    } catch {
        // Private browsing, disabled storage, corrupted JSON - all mean "no session".
        return null;
    }
}

export function saveSession(session: Session): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
        // Playing without persistence is fine; you just lose your seat on reload.
    }
}

export function clearSession(): void {
    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        /* nothing to clean up */
    }
}

const NAME_KEY = 'secret-dj/name';

/** Remembering the display name is harmless and saves retyping it every night. */
export function loadRememberedName(): string {
    try {
        return window.localStorage.getItem(NAME_KEY) ?? '';
    } catch {
        return '';
    }
}

export function rememberName(name: string): void {
    try {
        window.localStorage.setItem(NAME_KEY, name);
    } catch {
        /* ignore */
    }
}

/** A game code shared as `https://…/#ABCDE`. */
export function gameCodeFromLocation(): string {
    const hash = window.location.hash.replace(/^#/, '').trim().toUpperCase();
    return /^[A-Z0-9]{4,8}$/.test(hash) ? hash : '';
}
