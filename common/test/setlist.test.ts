import { describe, expect, it } from 'vitest';
import { buildSetlist, shuffle } from '@secret-dj/common';

/** Deterministic RNG so shuffles are reproducible in tests. */
function seeded(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}

const entries = (spec: Record<string, number>) =>
    Object.entries(spec).flatMap(([ownerId, count]) =>
        Array.from({ length: count }, (_, index) => ({ id: `${ownerId}${index}`, ownerId })),
    );

describe('shuffle', () => {
    it('is a permutation, not a filter', () => {
        const input = [1, 2, 3, 4, 5, 6, 7, 8];
        const result = shuffle(input, seeded(7));
        expect(result).toHaveLength(input.length);
        expect([...result].sort((a, b) => a - b)).toEqual(input);
        expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]); // no mutation
    });
});

describe('buildSetlist', () => {
    it('plays every queued track exactly once', () => {
        const input = entries({ ana: 3, bo: 3, cy: 2 });
        const setlist = buildSetlist(input, seeded(42));
        expect(setlist).toHaveLength(8);
        expect(new Set(setlist).size).toBe(8);
    });

    it('never puts the same DJ back to back when it can be avoided', () => {
        const ownerOf = (id: string) => id.replace(/\d+$/, '');
        for (let seed = 1; seed <= 60; seed++) {
            const setlist = buildSetlist(entries({ ana: 3, bo: 3, cy: 3 }), seeded(seed));
            for (let i = 1; i < setlist.length; i++) {
                expect(ownerOf(setlist[i])).not.toBe(ownerOf(setlist[i - 1]));
            }
        }
    });

    it('still terminates when one DJ dominates the queue', () => {
        // 5 vs 1: adjacency is unavoidable, but it must not hang or drop tracks.
        const setlist = buildSetlist(entries({ ana: 5, bo: 1 }), seeded(3));
        expect(setlist).toHaveLength(6);
        expect(new Set(setlist).size).toBe(6);
    });

    it('handles the degenerate cases', () => {
        expect(buildSetlist([], seeded(1))).toEqual([]);
        expect(buildSetlist(entries({ ana: 1 }), seeded(1))).toEqual(['ana0']);
    });
});
