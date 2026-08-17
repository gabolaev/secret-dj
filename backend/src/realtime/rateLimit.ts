/**
 * Per-socket token bucket.
 *
 * v1 had no limits at all: a loop could create unlimited games or spam votes
 * until the process fell over. This is deliberately generous — it stops abuse,
 * not enthusiastic clicking.
 */
export interface BucketConfig {
    capacity: number;
    /** Tokens restored per second. */
    refillPerSecond: number;
}

export class TokenBucket {
    private tokens: number;
    private lastRefill: number;

    constructor(
        private readonly config: BucketConfig,
        private readonly now: () => number = Date.now,
    ) {
        this.tokens = config.capacity;
        this.lastRefill = now();
    }

    tryConsume(cost = 1): boolean {
        const now = this.now();
        const elapsedSeconds = Math.max(0, now - this.lastRefill) / 1000;
        this.tokens = Math.min(this.config.capacity, this.tokens + elapsedSeconds * this.config.refillPerSecond);
        this.lastRefill = now;

        if (this.tokens < cost) return false;
        this.tokens -= cost;
        return true;
    }
}

export const ACTION_COSTS: Record<string, number> = {
    'game:create': 10,
    'game:join': 5,
    'game:resume': 2,
    'track:add': 3,
};

export const DEFAULT_BUCKET: BucketConfig = { capacity: 60, refillPerSecond: 6 };
