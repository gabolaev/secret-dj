import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ErrorCode, FeedEvent, GameSettings, GameView, PlayerId, Reaction, Result, Session } from '@secret-dj/common';
import { getSocket, request } from '../lib/socket';
import { clearSession, loadSession, rememberName, saveSession } from '../lib/session';
import { useT } from '../i18n';

export type Connection = 'connecting' | 'online' | 'offline';

export interface Notice {
    id: number;
    tone: 'info' | 'success' | 'error';
    message: string;
}

export interface SecretDj {
    connection: Connection;
    /** True while a stored session is being handed back to the server. */
    restoring: boolean;
    session: Session | null;
    view: GameView | null;
    notices: Notice[];
    dismissNotice: (id: number) => void;
    notify: (tone: Notice['tone'], message: string) => void;
    /** Fires on every reveal, so screens can run their entrance animation once. */
    lastFeed: FeedEvent | null;

    createGame: (name: string, settings?: Partial<GameSettings>) => Promise<Result<Record<string, unknown>>>;
    joinGame: (gameId: string, name: string) => Promise<Result<Record<string, unknown>>>;
    leaveGame: () => Promise<void>;
    addTrack: (url: string) => Promise<Result<Record<string, unknown>>>;
    removeTrack: (trackId: string) => Promise<Result<Record<string, unknown>>>;
    updateSettings: (patch: Partial<GameSettings>) => Promise<Result<Record<string, unknown>>>;
    startGame: () => Promise<Result<Record<string, unknown>>>;
    vote: (guessId: PlayerId) => Promise<Result<Record<string, unknown>>>;
    react: (reaction: Reaction) => Promise<Result<Record<string, unknown>>>;
    setDecoy: (decoyId: PlayerId | null) => Promise<Result<Record<string, unknown>>>;
    reveal: () => Promise<Result<Record<string, unknown>>>;
    nextRound: () => Promise<Result<Record<string, unknown>>>;
}

let noticeId = 0;

/**
 * The whole client-side state machine, in one place.
 *
 * The important detail is the `connect` handler: socket.io transparently opens a
 * *new* server-side socket after a network blip, so the session has to be
 * re-presented every time we connect, not just on mount. v1 resumed once at
 * startup and silently lost its identity after any reconnect.
 */
export function useSecretDj(): SecretDj {
    const t = useT();
    const [connection, setConnection] = useState<Connection>('connecting');
    const [session, setSession] = useState<Session | null>(() => loadSession());
    const [view, setView] = useState<GameView | null>(null);
    const [restoring, setRestoring] = useState<boolean>(() => loadSession() !== null);
    const [notices, setNotices] = useState<Notice[]>([]);
    const [lastFeed, setLastFeed] = useState<FeedEvent | null>(null);

    // Read inside socket callbacks, which must not close over stale state.
    const sessionRef = useRef<Session | null>(session);
    sessionRef.current = session;

    /**
     * Turns a server error code into a message in the player's own language.
     * The server's `message` is only a fallback for a code we do not know —
     * which, since `ErrorCode` is a closed set, should never happen.
     */
    const describe = useCallback((code: ErrorCode, fallback: string) => t.errors[code] ?? fallback, [t]);

    // Held in a ref so switching language does not re-run the socket effect
    // (which would re-present the session for no reason).
    const describeRef = useRef(describe);
    describeRef.current = describe;

    const notify = useCallback((tone: Notice['tone'], message: string) => {
        const id = ++noticeId;
        setNotices(current => [...current.slice(-3), { id, tone, message }]);
        window.setTimeout(() => setNotices(current => current.filter(notice => notice.id !== id)), 5_000);
    }, []);

    const dismissNotice = useCallback((id: number) => {
        setNotices(current => current.filter(notice => notice.id !== id));
    }, []);

    const forgetSession = useCallback(() => {
        clearSession();
        sessionRef.current = null;
        setSession(null);
        setView(null);
        setRestoring(false);
    }, []);

    useEffect(() => {
        const socket = getSocket();

        const onConnect = () => {
            setConnection('online');
            const stored = sessionRef.current;
            if (!stored) {
                setRestoring(false);
                return;
            }
            setRestoring(true);
            void request('game:resume', {
                gameId: stored.gameId,
                playerId: stored.playerId,
                token: stored.token,
            }).then(result => {
                setRestoring(false);
                if (result.ok) return;
                // The seat is gone (game reaped, or we left from another tab).
                forgetSession();
                if (result.code !== 'GAME_NOT_FOUND') {
                    notify('info', describeRef.current(result.code, result.message));
                }
            });
        };

        const onDisconnect = () => setConnection('offline');
        const onState = (next: GameView) => setView(next);
        const onFeed = (event: FeedEvent) => setLastFeed(event);
        const onClosed = (reason: string) => {
            notify('info', reason);
            forgetSession();
        };

        // Listeners first, then connect: no state update can be missed.
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('game:state', onState);
        socket.on('game:feed', onFeed);
        socket.on('game:closed', onClosed);
        if (socket.connected) onConnect();

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('game:state', onState);
            socket.off('game:feed', onFeed);
            socket.off('game:closed', onClosed);
        };
    }, [forgetSession, notify]);

    const adopt = useCallback(
        (result: Result<Record<string, unknown>>): Result<Record<string, unknown>> => {
        if (!result.ok) return { ...result, message: describeRef.current(result.code, result.message) };
        const next = result.session as Session | undefined;
        if (next) {
            saveSession(next);
            rememberName(next.name);
            sessionRef.current = next;
            setSession(next);
            window.history.replaceState(null, '', `${window.location.pathname}#${next.gameId}`);
        }
        return result;
        },
        [],
    );

    const createGame = useCallback(
        async (name: string, settings?: Partial<GameSettings>) => adopt(await request('game:create', { name, settings })),
        [adopt],
    );

    const joinGame = useCallback(
        async (gameId: string, name: string) => adopt(await request('game:join', { gameId, name })),
        [adopt],
    );

    const leaveGame = useCallback(async () => {
        if (sessionRef.current) await request('game:leave', {});
        window.history.replaceState(null, '', window.location.pathname);
        forgetSession();
    }, [forgetSession]);

    /** Every in-game action shares one failure path: surface it as a notice. */
    const act = useCallback(
        async <TPayload,>(event: Parameters<typeof request>[0], payload: TPayload) => {
            const result = await request(event, payload as never);
            if (!result.ok) notify('error', describe(result.code, result.message));
            return result;
        },
        [describe, notify],
    );

    return useMemo<SecretDj>(
        () => ({
            connection,
            restoring,
            session,
            view,
            notices,
            dismissNotice,
            notify,
            lastFeed,
            createGame,
            joinGame,
            leaveGame,
            addTrack: url => act('track:add', { url }),
            removeTrack: trackId => act('track:remove', { trackId }),
            updateSettings: patch => act('settings:update', patch),
            startGame: () => act('game:start', {}),
            vote: guessId => act('round:vote', { guessId }),
            react: reaction => act('round:react', { reaction }),
            setDecoy: decoyId => act('round:decoy', { decoyId }),
            reveal: () => act('round:reveal', {}),
            nextRound: () => act('round:next', {}),
        }),
        [act, connection, createGame, dismissNotice, joinGame, lastFeed, leaveGame, notices, notify, restoring, session, view],
    );
}
