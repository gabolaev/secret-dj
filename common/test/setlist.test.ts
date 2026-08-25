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

    it('does not settle into a fixed rotation', () => {
        // The bug this guards: the interleave loop consulted the RNG exactly
        // never. Every DJ contributes the same number of tracks, so the buckets
        // were always equal and "take the first of the largest" produced a
        // perfect repeating rotation — ABCABC, every single night. Only the
        // starting player varied, so after one cycle the room knew the DJ of
        // every remaining track and the guessing game was over.
        const input = entries({ ana: 2, bo: 2, cy: 2, di: 2 });
        const orders = new Set<string>();
        for (let seed = 0; seed < 400; seed++) {
            orders.add(buildSetlist(input, seeded(seed)).map(id => id.slice(0, -1)).join(''));
        }

        // A pure rotation can only ever produce one order per starting
        // permutation: 4! = 24. Anything near that means the loop is not random.
        expect(orders.size).toBeGreaterThan(100);

        // ...and specifically, the second half must not simply repeat the first.
        const rotations = [...orders].filter(order => {
            const djs = order.match(/.{1,3}/g)!;
            return djs.slice(0, 4).join('') === djs.slice(4).join('');
        });
        expect(rotations.length).toBeLessThan(orders.size / 4);
    });

    it('keeps the no-repeat guarantee while breaking ties randomly', () => {
        const input = entries({ ana: 3, bo: 3, cy: 3 });
        for (let seed = 0; seed < 200; seed++) {
            const owners = buildSetlist(input, seeded(seed)).map(id => id.slice(0, -1));
            for (let i = 1; i < owners.length; i++) {
                expect(owners[i], `seed ${seed}: ${owners.join(' ')}`).not.toBe(owners[i - 1]);
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
