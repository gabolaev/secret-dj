/**
 * The small REST surface that sits beside the socket API.
 *
 * Both endpoints take a user-supplied URL, so both go through `safeFetch`,
 * which restricts them to known music hosts and refuses private addresses.
 * They are also rate limited per IP: they make outbound requests, which makes
 * them the most abusable thing in the process.
 */
import { Router } from 'express';
import { LIMITS, detectService, parseUrl } from '@secret-dj/common';
import { UnsafeUrlError, resolveMusicUrl } from '../net/safeFetch.js';
import type { MetadataService } from '../services/metadata.js';
import { TokenBucket } from '../realtime/rateLimit.js';
import { logger } from '../logger.js';

const log = logger('http');

/** Per-IP buckets, swept so a long-running process does not accumulate them. */
function createIpLimiter(capacity: number, refillPerSecond: number) {
    const buckets = new Map<string, { bucket: TokenBucket; seen: number }>();

    setInterval(() => {
        const cutoff = Date.now() - 10 * 60_000;
        for (const [key, entry] of buckets) {
            if (entry.seen < cutoff) buckets.delete(key);
        }
    }, 60_000).unref?.();

    return (ip: string): boolean => {
        let entry = buckets.get(ip);
        if (!entry) {
            entry = { bucket: new TokenBucket({ capacity, refillPerSecond }), seen: Date.now() };
            buckets.set(ip, entry);
        }
        entry.seen = Date.now();
        return entry.bucket.tryConsume();
    };
}

export function createApiRouter(metadata: MetadataService): Router {
    const router = Router();
    const allow = createIpLimiter(40, 1);

    router.use((req, res, next) => {
        if (allow(req.ip ?? 'unknown')) return next();
        res.status(429).json({ error: 'Too many requests. Give it a moment.' });
    });

    router.get('/health', (_req, res) => {
        res.json({ status: 'ok', uptime: Math.round(process.uptime()), cachedTracks: metadata.cacheSize });
    });

    router.get('/track-metadata', async (req, res) => {
        const url = typeof req.query.url === 'string' ? req.query.url : '';
        if (!url || url.length > LIMITS.urlMax) {
            res.status(400).json({ error: 'A `url` query parameter is required.' });
            return;
        }
        const service = detectService(url);
        if (!service) {
            res.status(422).json({ error: 'That link is not from a supported music service.' });
            return;
        }

        try {
            const result = await metadata.lookup(url);
            if (!result) {
                res.status(404).json({ error: 'No metadata available for that link.', service: service.name });
                return;
            }
            res.set('cache-control', 'public, max-age=3600');
            res.json({ ...result, service: service.name });
        } catch (error) {
            log.warn(`metadata lookup failed for ${url}`, error);
            res.status(502).json({ error: 'Could not reach that music service.' });
        }
    });

    router.get('/resolve-url', async (req, res) => {
        const url = typeof req.query.url === 'string' ? req.query.url : '';
        const parsed = parseUrl(url);
        if (!parsed || url.length > LIMITS.urlMax) {
            res.status(400).json({ error: 'A valid `url` query parameter is required.' });
            return;
        }

        try {
            const resolved = await resolveMusicUrl(url);
            res.set('cache-control', 'public, max-age=86400');
            res.json({ resolvedUrl: resolved.url, hops: resolved.hops });
        } catch (error) {
            if (error instanceof UnsafeUrlError) {
                res.status(422).json({ error: error.message });
                return;
            }
            log.warn(`resolve failed for ${url}`, error);
            res.status(502).json({ error: 'Could not follow that link.' });
        }
    });

    return router;
}
