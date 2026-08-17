import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, Result, ServerToClientEvents } from '@secret-dj/common';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * One socket per tab, created lazily at module scope.
 *
 * v1 created sockets inside a `useCallback` that also called `setSocket`, so two
 * quick actions opened two connections and the `gameState` listener was attached
 * *after* the first emit — the opening state update was simply lost. A module
 * singleton removes both failure modes: the socket exists before React renders,
 * and there is exactly one of it.
 */
let instance: TypedSocket | null = null;

export function getSocket(): TypedSocket {
    if (!instance) {
        const url = import.meta.env.VITE_BACKEND_URL as string | undefined;
        instance = io(url || '/', {
            // Same-origin by default: in dev Vite proxies /socket.io to :4000,
            // in production the backend serves the app itself.
            autoConnect: true,
            reconnection: true,
            reconnectionDelay: 500,
            reconnectionDelayMax: 5_000,
            timeout: 10_000,
        });
    }
    return instance;
}

const ACK_TIMEOUT_MS = 10_000;

/**
 * Promise wrapper around an acknowledged emit.
 * Never rejects: a dropped connection becomes a normal `Result` failure so call
 * sites can render one error path instead of two.
 */
export function request<TEvent extends keyof ClientToServerEvents>(
    event: TEvent,
    payload: Parameters<ClientToServerEvents[TEvent]>[0],
): Promise<Result<Record<string, unknown>>> {
    // `.timeout()` rewrites the ack signature to `(err, response)`, which the
    // per-event typed `emit` overloads cannot express. Widened once, right here,
    // and narrowed again before the promise resolves.
    const channel = getSocket().timeout(ACK_TIMEOUT_MS);
    const emit = channel.emit.bind(channel) as (
        name: string,
        payload: unknown,
        ack: (timeoutError: Error | null, response?: unknown) => void,
    ) => void;

    return new Promise(resolve => {
        emit(event as string, payload, (timeoutError, response) => {
            if (timeoutError) {
                resolve({ ok: false, code: 'INTERNAL', message: 'The server did not answer. Check your connection.' });
                return;
            }
            if (!response || typeof response !== 'object' || !('ok' in response)) {
                resolve({ ok: false, code: 'INTERNAL', message: 'The server sent something unexpected.' });
                return;
            }
            resolve(response as Result<Record<string, unknown>>);
        });
    });
}
