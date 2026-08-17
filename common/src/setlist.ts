/**
 * Setlist construction.
 *
 * v1 picked a random unplayed track at the start of every round, which meant
 * nobody could ever know how long the game was (breaking the "Finish Game"
 * button) and the same DJ could land three tracks in a row.
 *
 * v2 builds the whole running order once, up front:
 *  1. shuffle each DJ's own tracks (Fisher-Yates, injectable RNG for tests),
 *  2. interleave by repeatedly taking from whoever has the most tracks left,
 *     never twice in a row while an alternative exists.
 *
 * The result is a fixed-length setlist with no adjacent repeats whenever one is
 * mathematically possible.
 */

export type Rng = () => number;

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

export interface SetlistEntry<TId> {
    id: TId;
    ownerId: string;
}

export function buildSetlist<TId>(entries: readonly SetlistEntry<TId>[], rng: Rng = Math.random): TId[] {
    const byOwner = new Map<string, TId[]>();
    for (const entry of entries) {
        const bucket = byOwner.get(entry.ownerId);
        if (bucket) bucket.push(entry.id);
        else byOwner.set(entry.ownerId, [entry.id]);
    }

    // Shuffle within each DJ, and shuffle the DJ order too, so equal-sized
    // buckets don't always start with whoever joined first.
    const buckets = shuffle(
        [...byOwner.entries()].map(([ownerId, ids]) => ({ ownerId, ids: shuffle(ids, rng) })),
        rng,
    );

    const setlist: TId[] = [];
    let previousOwner: string | null = null;

    while (buckets.some(bucket => bucket.ids.length > 0)) {
        const available = buckets.filter(bucket => bucket.ids.length > 0);
        const alternatives = available.filter(bucket => bucket.ownerId !== previousOwner);
        // Prefer a different DJ; fall back only when one DJ owns everything left.
        const pool = alternatives.length > 0 ? alternatives : available;
        const maxRemaining = Math.max(...pool.map(bucket => bucket.ids.length));
        const chosen = pool.find(bucket => bucket.ids.length === maxRemaining)!;

        setlist.push(chosen.ids.shift()!);
        previousOwner = chosen.ownerId;
    }

    return setlist;
}
