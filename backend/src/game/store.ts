/**
 * The registry of live games, plus the janitor that keeps the process from
 * growing forever. v1 never removed a game from its Map: every lobby ever
 * created stayed in memory until the server restarted.
 */
import { randomInt } from 'node:crypto';
import { GAME_ID_ALPHABET, GameError, LIMITS, type GameSettings } from '@secret-dj/common';
import { GameRoom } from './room.js';

export interface StoreOptions {
    now?: () => number;
    /** How often the janitor runs. */
    sweepIntervalMs?: number;
}

export interface SweepResult {
    closed: Array<{ room: GameRoom; reason: string }>;
    hostChanges: GameRoom[];
}

export class GameStore {
    private readonly rooms = new Map<string, GameRoom>();
    private readonly now: () => number;

    constructor(options: StoreOptions = {}) {
        this.now = options.now ?? Date.now;
    }

    get size(): number {
        return this.rooms.size;
    }

    create(settings?: Partial<GameSettings>): GameRoom {
        const room = new GameRoom({ id: this.allocateId(), settings, now: this.now });
        this.rooms.set(room.id, room);
        return room;
    }

    /** Game codes are matched case-insensitively — nobody types them in caps. */
    get(gameId: string): GameRoom | undefined {
        return this.rooms.get(String(gameId ?? '').trim().toUpperCase());
    }

    require(gameId: string): GameRoom {
        const room = this.get(gameId);
        if (!room) throw new GameError('GAME_NOT_FOUND');
        return room;
    }

    delete(gameId: string): void {
        this.rooms.delete(gameId);
    }

    /**
     * Removes finished/abandoned games and hands the crown on when a host has
     * been gone too long. Returns what changed so the caller can notify rooms.
     */
    sweep(): SweepResult {
        const now = this.now();
        const closed: SweepResult['closed'] = [];
        const hostChanges: GameRoom[] = [];

        for (const room of this.rooms.values()) {
            if (room.isEmpty || (room.liveConnections === 0 && now - room.lastActivityAt > LIMITS.emptyGameTtlMs)) {
                this.rooms.delete(room.id);
                closed.push({ room, reason: 'Everyone left, so this game closed.' });
                continue;
            }
            if (now - room.lastActivityAt > LIMITS.idleGameTtlMs) {
                this.rooms.delete(room.id);
                closed.push({ room, reason: 'This game sat idle too long and was closed.' });
                continue;
            }
            if (room.reassignHostIfNeeded().length > 0) hostChanges.push(room);
        }

        return { closed, hostChanges };
    }

    private allocateId(): string {
        for (let attempt = 0; attempt < 64; attempt++) {
            let id = '';
            for (let i = 0; i < LIMITS.gameIdLength; i++) {
                id += GAME_ID_ALPHABET[randomInt(GAME_ID_ALPHABET.length)];
            }
            // v1 used Math.random().toString(36).slice(2, 8) with no collision
            // check, which could both shorten the code and clobber a live game.
            if (!this.rooms.has(id)) return id;
        }
        throw new GameError('INTERNAL', 'Could not allocate a game code. Try again.');
    }
}
