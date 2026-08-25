/**
 * Socket wiring.
 *
 * The single most important line in this file is in `bind()`: the actor for
 * every command is read from `socket.data.session`, never from the payload.
 * In v1 every event carried `{ gameId, username }` straight from the client, so
 * anyone could vote as you, delete your tracks, or start the game as the host.
 */
import type { Server, Socket } from 'socket.io';
import {
    ERROR_MESSAGES,
    GameError,
    fail,
    type Ack,
    type ClientToServerEvents,
    type CreateGameRequest,
    type FeedEvent,
    type GameSettings,
    type JoinGameRequest,
    type PlayerId,
    isRating,
    CLAIMS_BY_ID,
    type Answer,
    type ClaimId,
    type TrackId,
    type ResumeRequest,
    type ServerToClientEvents,
    type Session,
} from '@secret-dj/common';
import type { GameRoom } from '../game/room.js';
import type { GameStore } from '../game/store.js';
import { projectGame } from '../game/view.js';
import type { MetadataService } from '../services/metadata.js';
import { ACTION_COSTS, DEFAULT_BUCKET, TokenBucket } from './rateLimit.js';
import { logger } from '../logger.js';

export interface SocketSession {
    gameId: string;
    playerId: PlayerId;
}

export interface SocketData {
    session?: SocketSession;
    bucket: TokenBucket;
}

export type GameServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
export type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

const log = logger('gateway');

export interface GatewayDeps {
    io: GameServer;
    store: GameStore;
    metadata: MetadataService;
}

/** How many times a missing title is chased before the room gives up on it. */
const METADATA_RETRIES = 4;
/** Comfortably past the metadata service's own miss cache. */
const METADATA_RETRY_DELAY_MS = 75_000;

export function attachGateway({ io, store, metadata }: GatewayDeps): () => void {
    const retryTimers = new Set<ReturnType<typeof setTimeout>>();
    /** Sends every socket in a room the view built for *that* player. */
    function broadcast(room: GameRoom): void {
        const sockets = io.sockets.adapter.rooms.get(room.id);
        if (!sockets) return;
        for (const socketId of sockets) {
            const socket = io.sockets.sockets.get(socketId) as GameSocket | undefined;
            const playerId = socket?.data.session?.playerId;
            if (!socket || !playerId || !room.players.has(playerId)) continue;
            socket.emit('game:state', projectGame(room, playerId));
        }
    }

    function announce(room: GameRoom, events: FeedEvent[]): void {
        for (const event of events) io.to(room.id).emit('game:feed', event);
    }

    function publish(room: GameRoom, events: FeedEvent[] = []): void {
        broadcast(room);
        announce(room, events);
        if (room.isEmpty) {
            store.delete(room.id);
            log.info(`closed empty game ${room.id}`);
        }
    }

    function issueSession(socket: GameSocket, room: GameRoom, playerId: PlayerId): Session {
        const player = room.players.get(playerId);
        if (!player) throw new GameError('SESSION_INVALID');

        // A socket can only hold one seat; joining a second game vacates the first.
        detach(socket);
        socket.data.session = { gameId: room.id, playerId };
        socket.join(room.id);
        const feed = room.attachSocket(playerId);
        publish(room, feed);

        return { gameId: room.id, playerId, token: player.token, name: player.name };
    }

    /** Undoes `issueSession`. Safe to call when there is no session. */
    function detach(socket: GameSocket): void {
        const session = socket.data.session;
        if (!session) return;
        socket.data.session = undefined;
        socket.leave(session.gameId);

        const room = store.get(session.gameId);
        if (!room) return;
        publish(room, room.detachSocket(session.playerId));
    }

    /** Resolves the room and actor for an authenticated command. */
    function context(socket: GameSocket): { room: GameRoom; playerId: PlayerId } {
        const session = socket.data.session;
        if (!session) throw new GameError('NOT_AUTHENTICATED');
        const room = store.get(session.gameId);
        if (!room) {
            socket.data.session = undefined;
            throw new GameError('GAME_NOT_FOUND');
        }
        return { room, playerId: session.playerId };
    }

    /**
     * Registers a handler with the shared plumbing every command needs:
     * rate limiting, a tolerated missing ack, and `GameError` -> wire failure.
     */
    function bind<TRequest, TResult extends object>(
        socket: GameSocket,
        event: keyof ClientToServerEvents,
        handler: (req: TRequest) => TResult | Promise<TResult>,
    ): void {
        // socket.io's `on` is typed per-event; this generic wrapper deliberately
        // handles all of them, so the listener registration is widened once here.
        const listen = socket.on.bind(socket) as (name: string, fn: (...args: unknown[]) => void) => void;

        listen(event as string, async (...args: unknown[]) => {
            const req = args[0] as TRequest;
            const ack = args[1] as Ack<TResult> | undefined;
            // socket.io lets a client omit the ack callback; v1 crashed on that.
            const reply: Ack<TResult> = typeof ack === 'function' ? ack : () => undefined;
            try {
                if (!socket.data.bucket.tryConsume(ACTION_COSTS[event as string] ?? 1)) {
                    reply(fail('RATE_LIMITED', ERROR_MESSAGES.RATE_LIMITED));
                    return;
                }
                const result = await handler(req ?? ({} as TRequest));
                reply({ ok: true, ...result });
            } catch (error) {
                if (error instanceof GameError) {
                    reply(fail(error.code, error.message));
                    return;
                }
                log.error(`unhandled error in ${String(event)}`, error);
                reply(fail('INTERNAL', ERROR_MESSAGES.INTERNAL));
            }
        });
    }

    /**
     * Kicks off metadata lookup and pushes the result to the room when it lands.
     * Fire-and-forget on purpose: track submission must not wait on the network.
     *
     * A miss is not the end of it. Between the per-request retries inside the
     * fetch layer and this sweep, a title that failed once because a service was
     * having a moment gets several more chances before the track is played —
     * which is what "most of them don't resolve" actually looked like.
     */
    function enrich(room: GameRoom, trackId: string, url: string, attempt = 0): void {
        void metadata
            .lookup(url)
            .then(result => {
                // The game may have ended, or the track may have been removed.
                const current = store.get(room.id);
                if (!current || !current.tracks.has(trackId)) return;
                if (current.applyMetadata(trackId, result)) broadcast(current);
                if (!result && attempt + 1 < METADATA_RETRIES) {
                    // Spaced past the service's own miss cache, or the retry
                    // would be answered from memory without asking anybody.
                    scheduleRetry(() => enrich(room, trackId, url, attempt + 1), METADATA_RETRY_DELAY_MS);
                }
            })
            .catch(error => log.warn(`metadata lookup failed for ${url}`, error));
    }

    /** Re-asks for every title the room is still missing. */
    function retryUnresolved(room: GameRoom): void {
        for (const track of room.unresolvedTracks()) enrich(room, track.id, track.url);
    }

    function scheduleRetry(task: () => void, delayMs: number): void {
        const timer = setTimeout(() => {
            retryTimers.delete(timer);
            task();
        }, delayMs);
        // Never hold the process open for a title nobody is waiting for.
        timer.unref?.();
        retryTimers.add(timer);
    }

    io.on('connection', (socket: GameSocket) => {
        socket.data.bucket = new TokenBucket(DEFAULT_BUCKET);
        log.debug(`socket connected ${socket.id}`);

        bind<CreateGameRequest, { session: Session }>(socket, 'game:create', req => {
            const room = store.create(req?.settings);
            try {
                const { player, feed } = room.addPlayer(req?.name ?? '');
                const session = issueSession(socket, room, player.id);
                announce(room, feed);
                log.info(`game ${room.id} created by ${player.name}`);
                return { session };
            } catch (error) {
                // Never leave a half-built lobby behind if the name was rejected.
                store.delete(room.id);
                throw error;
            }
        });

        bind<JoinGameRequest, { session: Session }>(socket, 'game:join', req => {
            const room = store.require(req?.gameId ?? '');
            const { player, feed } = room.addPlayer(req?.name ?? '');
            const session = issueSession(socket, room, player.id);
            announce(room, feed);
            return { session };
        });

        bind<ResumeRequest, { session: Session }>(socket, 'game:resume', req => {
            const room = store.require(req?.gameId ?? '');
            const player = room.authenticate(req?.playerId ?? '', req?.token ?? '');
            return { session: issueSession(socket, room, player.id) };
        });

        bind<Record<string, never>, Record<string, never>>(socket, 'game:leave', () => {
            const { room, playerId } = context(socket);
            const feed = room.leave(playerId);
            socket.data.session = undefined;
            socket.leave(room.id);
            publish(room, feed);
            return {};
        });

        bind<{ url: string }, { trackId: string }>(socket, 'track:add', req => {
            const { room, playerId } = context(socket);
            const { track } = room.addTrack(playerId, req?.url ?? '');
            publish(room);
            enrich(room, track.id, track.url);
            return { trackId: track.id };
        });

        bind<{ trackId: string }, Record<string, never>>(socket, 'track:remove', req => {
            const { room, playerId } = context(socket);
            room.removeTrack(playerId, req?.trackId ?? '');
            publish(room);
            return {};
        });

        bind<Partial<GameSettings>, Record<string, never>>(
            socket,
            'settings:update',
            req => {
                const { room, playerId } = context(socket);
                room.updateSettings(playerId, req ?? {});
                publish(room);
                return {};
            },
        );

        bind<Record<string, never>, Record<string, never>>(socket, 'game:start', () => {
            const { room, playerId } = context(socket);
            publish(room, room.start(playerId));
            // Last call for anything still untitled, now that it is about to be
            // looked at rather than sat in a queue.
            retryUnresolved(room);
            return {};
        });

        bind<{ guessId: PlayerId }, Record<string, never>>(socket, 'round:vote', req => {
            const { room, playerId } = context(socket);
            publish(room, room.vote(playerId, req?.guessId ?? ''));
            return {};
        });

        bind<{ trackId: TrackId; claim: unknown }, Record<string, never>>(socket, 'track:claim', req => {
            const { room, playerId } = context(socket);
            const claim = req?.claim;
            if (typeof claim !== 'string' || !(claim in CLAIMS_BY_ID)) throw new GameError('CLAIM_INVALID');
            room.setClaim(playerId, req?.trackId ?? '', claim as ClaimId);
            publish(room, []);
            return {};
        });

        bind<{ done: unknown }, Record<string, never>>(socket, 'round:done', req => {
            const { room, playerId } = context(socket);
            publish(room, room.markDone(playerId, req?.done === true));
            return {};
        });

        bind<Partial<Answer>, Record<string, never>>(socket, 'round:answer', req => {
            const { room, playerId } = context(socket);
            const patch: Partial<Answer> = {};
            if (req?.like !== undefined) {
                if (!isRating(req.like)) throw new GameError('RATING_INVALID');
                patch.like = req.like;
            }
            for (const key of ['heard', 'popular', 'moved'] as const) {
                if (typeof req?.[key] === 'boolean') patch[key] = req[key];
            }
            publish(room, room.answer(playerId, patch));
            return {};
        });

        bind<Record<string, never>, Record<string, never>>(socket, 'round:reveal', () => {
            const { room, playerId } = context(socket);
            publish(room, room.reveal(playerId));
            return {};
        });

        bind<Record<string, never>, Record<string, never>>(socket, 'round:next', () => {
            const { room, playerId } = context(socket);
            publish(room, room.next(playerId));
            return {};
        });

        socket.on('disconnect', reason => {
            log.debug(`socket disconnected ${socket.id} (${reason})`);
            detach(socket);
        });
    });

    // The janitor: reaps abandoned games and moves the crown off absent hosts.
    const sweeper = setInterval(() => {
        try {
            const { closed, hostChanges } = store.sweep();
            for (const { room, reason } of closed) {
                io.to(room.id).emit('game:closed', reason);
                io.in(room.id).socketsLeave(room.id);
            }
            for (const room of hostChanges) publish(room);
        } catch (error) {
            log.error('sweep failed', error);
        }
    }, 30_000);
    sweeper.unref?.();

    return () => {
        clearInterval(sweeper);
        for (const timer of retryTimers) clearTimeout(timer);
        retryTimers.clear();
    };
}
