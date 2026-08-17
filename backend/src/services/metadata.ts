/**
 * Track metadata lookup.
 *
 * Two v1 problems are fixed here:
 *  - the cache was unbounded and never expired (a slow memory leak);
 *  - the result was written onto the track but never broadcast, so titles only
 *    appeared if some unrelated event happened to push a state update. The
 *    caller now gets a promise it can react to, and the gateway re-broadcasts.
 */
import {
    canonicalKey,
    describeResource,
    detectService,
    needsResolution,
    parseUrl,
    type ServiceId,
} from '@secret-dj/common';
import { fetchJson, resolveMusicUrl } from '../net/safeFetch.js';

export interface TrackMetadata {
    title: string;
    artist?: string;
    artwork?: string;
}

interface CacheEntry {
    value: TrackMetadata | null;
    expiresAt: number;
}

const CACHE_TTL_MS = 6 * 60 * 60_000;
const CACHE_MAX_ENTRIES = 2_000;
const MAX_CONCURRENT = 6;

interface OEmbed {
    title?: string;
    author_name?: string;
    thumbnail_url?: string;
}

export class MetadataService {
    private readonly cache = new Map<string, CacheEntry>();
    private readonly inFlight = new Map<string, Promise<TrackMetadata | null>>();
    private active = 0;
    private readonly queue: Array<() => void> = [];

    constructor(private readonly now: () => number = Date.now) {}

    get cacheSize(): number {
        return this.cache.size;
    }

    /** Deduplicates concurrent lookups of the same song and caches the result. */
    async lookup(url: string): Promise<TrackMetadata | null> {
        const key = canonicalKey(url);

        const cached = this.cache.get(key);
        if (cached && cached.expiresAt > this.now()) {
            // Refresh recency: Map preserves insertion order, so re-inserting
            // moves the entry to the back and makes eviction least-recently-used.
            this.cache.delete(key);
            this.cache.set(key, cached);
            return cached.value;
        }

        const existing = this.inFlight.get(key);
        if (existing) return existing;

        const pending = this.withSlot(() => this.fetchMetadata(url))
            .catch(() => null)
            .then(value => {
                this.remember(key, value);
                return value;
            })
            .finally(() => {
                this.inFlight.delete(key);
            });

        this.inFlight.set(key, pending);
        return pending;
    }

    private remember(key: string, value: TrackMetadata | null): void {
        this.cache.set(key, { value, expiresAt: this.now() + CACHE_TTL_MS });
        while (this.cache.size > CACHE_MAX_ENTRIES) {
            const oldest = this.cache.keys().next();
            if (oldest.done) break;
            this.cache.delete(oldest.value);
        }
    }

    private async withSlot<T>(task: () => Promise<T>): Promise<T> {
        if (this.active >= MAX_CONCURRENT) {
            await new Promise<void>(resolve => this.queue.push(resolve));
        }
        this.active += 1;
        try {
            return await task();
        } finally {
            this.active -= 1;
            this.queue.shift()?.();
        }
    }

    private async fetchMetadata(rawUrl: string): Promise<TrackMetadata | null> {
        let url = rawUrl;
        if (needsResolution(url)) {
            try {
                url = (await resolveMusicUrl(url)).url;
            } catch {
                // A share link we could not expand still deserves a best-effort title.
            }
        }

        const service = detectService(url);
        if (!service) return null;

        const byService: Record<ServiceId, (u: string) => Promise<TrackMetadata | null>> = {
            youtube: u => this.fromOEmbed(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u)}`),
            'youtube-music': u =>
                this.fromOEmbed(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u)}`),
            spotify: u => this.fromOEmbed(`https://open.spotify.com/oembed?url=${encodeURIComponent(u)}`),
            soundcloud: u => this.fromOEmbed(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(u)}`),
            bandcamp: u => this.fromOEmbed(`https://bandcamp.com/api/oembed?format=json&url=${encodeURIComponent(u)}`),
            deezer: u => this.fromDeezer(u),
            'apple-music': u => this.fromAppleMusic(u),
            tidal: u => this.fromOEmbed(`https://embed.tidal.com/oembed?url=${encodeURIComponent(u)}`),
            'yandex-music': async () => null,
        };

        const metadata = await byService[service.id](url).catch(() => null);
        return metadata ?? titleFromUrl(url);
    }

    private async fromOEmbed(endpoint: string): Promise<TrackMetadata | null> {
        const data = await fetchJson<OEmbed>(endpoint);
        if (!data?.title) return null;
        return {
            title: data.title,
            artist: data.author_name,
            artwork: data.thumbnail_url,
        };
    }

    private async fromDeezer(url: string): Promise<TrackMetadata | null> {
        const ref = describeResource(url);
        if (!ref || ref.service !== 'deezer') return null;
        const data = await fetchJson<{
            title?: string;
            name?: string;
            artist?: { name?: string };
            cover_medium?: string;
            album?: { cover_medium?: string };
        }>(`https://api.deezer.com/${ref.kind}/${encodeURIComponent(ref.id)}`);
        const title = data?.title ?? data?.name;
        if (!title) return null;
        return {
            title,
            artist: data?.artist?.name,
            artwork: data?.album?.cover_medium ?? data?.cover_medium,
        };
    }

    private async fromAppleMusic(url: string): Promise<TrackMetadata | null> {
        const ref = describeResource(url);
        if (!ref || ref.service !== 'apple-music' || !/^\d+$/.test(ref.id)) return null;
        const data = await fetchJson<{
            results?: Array<{ trackName?: string; collectionName?: string; artistName?: string; artworkUrl100?: string }>;
        }>(`https://itunes.apple.com/lookup?id=${encodeURIComponent(ref.id)}`);
        const first = data?.results?.[0];
        const title = first?.trackName ?? first?.collectionName;
        if (!title) return null;
        return {
            title,
            artist: first?.artistName,
            // The 100px thumbnail scales up cleanly by rewriting the size segment.
            artwork: first?.artworkUrl100?.replace('100x100', '400x400'),
        };
    }
}

/** Last resort: make something readable out of the URL's own slug. */
export function titleFromUrl(rawUrl: string): TrackMetadata | null {
    const url = parseUrl(rawUrl);
    if (!url) return null;
    const segments = url.pathname.split('/').filter(Boolean);
    const slug = [...segments].reverse().find(part => !/^\d+$/.test(part) && part.length > 2);
    if (!slug) return null;

    const title = decodeURIComponent(slug)
        .replace(/[-_+]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\p{Ll}/gu, char => char.toUpperCase());

    return title ? { title } : null;
}
