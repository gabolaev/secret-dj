import { describe, expect, it } from 'vitest';
import { LIMITS } from '@secret-dj/common';
import { GameStore } from '../src/game/store.js';

describe('GameStore', () => {
    it('issues unambiguous, collision-free codes', () => {
        const store = new GameStore();
        const codes = new Set<string>();
        for (let i = 0; i < 500; i++) {
            const room = store.create();
            expect(room.id).toHaveLength(LIMITS.gameIdLength);
            // No 0/O or 1/I/L: these get read aloud across a room.
            expect(room.id).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]+$/);
            expect(codes.has(room.id)).toBe(false);
            codes.add(room.id);
        }
    });

    it('looks codes up case-insensitively', () => {
        const store = new GameStore();
        const room = store.create();
        expect(store.get(room.id.toLowerCase())?.id).toBe(room.id);
        expect(store.get(` ${room.id} `)?.id).toBe(room.id);
        expect(store.get('NOPE')).toBeUndefined();
    });

    it('reaps empty and idle games instead of leaking them forever', () => {
        let clock = 1_000_000;
        const store = new GameStore({ now: () => clock });

        // Nobody ever sat down: gone on the first sweep.
        store.create();
        expect(store.sweep().closed).toHaveLength(1);
        expect(store.size).toBe(0);

        const populated = store.create();
        const { player } = populated.addPlayer('ana');
        populated.attachSocket(player.id);
        expect(store.sweep().closed).toHaveLength(0);

        // Everyone disconnected and stayed gone.
        populated.detachSocket(player.id);
        clock += LIMITS.emptyGameTtlMs + 1;
        expect(store.sweep().closed).toHaveLength(1);
        expect(store.size).toBe(0);
    });
});
