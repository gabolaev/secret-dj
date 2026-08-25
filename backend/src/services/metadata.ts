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
import { fetchJson, fetchText, resolveMusicUrl } from '../net/safeFetch.js';

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
/**
 * A miss is remembered for a minute, not six hours.
 *
 * Failures used to be cached for the full TTL, so one bad moment — a timeout, a
 * rate limit — meant that song stayed untitled for the rest of the night and
 * every retry was answered from the cache without ever asking again.
 */
const MISS_TTL_MS = 60_000;
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
        this.cache.set(key, { value, expiresAt: this.now() + (value ? CACHE_TTL_MS : MISS_TTL_MS) });
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
            // Yandex has no metadata API of any kind; the page's OpenGraph tags
            // are the only description of the track that exists.
            'yandex-music': u => this.fromOpenGraph(u),
        };

        const metadata = await byService[service.id](url).catch(() => null);
        if (metadata) return metadata;

        // Second chance before giving up: plenty of pages carry OpenGraph tags
        // even when their oEmbed endpoint 404s on that particular item.
        const og = await this.fromOpenGraph(url).catch(() => null);
        return og ?? titleFromUrl(url);
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

    /** Reads a page's own OpenGraph description of itself. */
    private async fromOpenGraph(url: string): Promise<TrackMetadata | null> {
        const html = await fetchText(url);
        if (!html) return null;

        const title = metaContent(html, 'og:title') ?? metaContent(html, 'twitter:title');
        // A shell page describes the *site*, not the song. Accepting that gave
        // us "Apple Music Web Player" as a track name — the same failure dressed
        // up as a success that this whole path exists to stop.
        if (!title || isGenericTitle(title, metaContent(html, 'og:site_name'))) return null;

        // Yandex writes "Track — Artist" into og:title and names the artist in
        // the description; splitting the title is the only way to separate them.
        const [name, ...rest] = title.split(' — ');
        const artist =
            metaContent(html, 'og:audio:artist') ??
            metaContent(html, 'music:musician') ??
            (rest.length > 0 ? rest.join(' — ') : undefined);

        return {
            title: rest.length > 0 ? name : title,
            artist,
            artwork: metaContent(html, 'og:image'),
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

/**
 * Routing segments, not titles. `youtube.com/watch` is not a song called
 * "Watch", and `music.yandex.ru/album/1/track/2` is not one called "Track" —
 * but that is exactly what this function used to return, for every YouTube and
 * Yandex link in the room. Worse, returning *something* marked the lookup as
 * having succeeded, so the failure was invisible and never retried.
 */
const ROUTING_SEGMENTS = new Set([
    'watch', 'track', 'album', 'song', 'video', 'embed', 'playlist', 'set', 'sets',
    'artist', 'release', 'browse', 'listen', 'music', 'intl', 'episode', 'show',
]);

/**
 * True for the opaque ids services put in their URLs.
 *
 * `5msuIqHufF7G9Nnz1EbjFU` and `PzDupYdobnU` are not titles either, and dressing
 * them up as one is worse than admitting we do not know: a player reading
 * "PzDupYdobnU" has no idea whether that is the song or a bug.
 */
function looksLikeAnId(slug: string): boolean {
    if (/[ _+-]/.test(slug)) return false;
    if (slug.length >= 11 && /\d/.test(slug) && /[a-z]/i.test(slug)) return true;
    return /^[0-9a-f]{16,}$/i.test(slug) || /^\d+$/.test(slug);
}

/** Last resort: make something readable out of the URL's own slug, or admit defeat. */
export function titleFromUrl(rawUrl: string): TrackMetadata | null {
    const url = parseUrl(rawUrl);
    if (!url) return null;
    const segments = url.pathname.split('/').filter(Boolean);
    const slug = [...segments]
        .reverse()
        .find(
            part =>
                part.length > 2 &&
                !ROUTING_SEGMENTS.has(part.toLowerCase()) &&
                !/^[a-z]{2}(-[a-z]{2})?$/i.test(part) &&
                !looksLikeAnId(part),
        );
    if (!slug) return null;

    const title = decodeURIComponent(slug)
        .replace(/[-_+]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\p{Ll}/gu, char => char.toUpperCase());

    return title ? { title } : null;
}

/** `<meta property="og:x" content="y">`, in either attribute order. */
function metaContent(html: string, property: string): string | undefined {
    const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
        new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`, 'i'),
        new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`, 'i'),
    ];
    for (const pattern of patterns) {
        const match = pattern.exec(html);
        if (match?.[1]) return decodeEntities(match[1]).trim() || undefined;
    }
    return undefined;
}

function decodeEntities(value: string): string {
    return value
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&');
}

/** True when a page's OpenGraph title describes the service, not the track. */
export function isGenericTitle(title: string, siteName?: string): boolean {
    const normalised = title.trim().toLowerCase();
    if (siteName && normalised === siteName.trim().toLowerCase()) return true;
    if (/\bweb player\b/i.test(normalised)) return true;
    return GENERIC_TITLES.has(normalised);
}

const GENERIC_TITLES = new Set([
    'spotify',
    'youtube',
    'youtube music',
    'apple music',
    'soundcloud',
    'deezer',
    'tidal',
    'bandcamp',
    'yandex music',
    'яндекс музыка',
    'яндекс.музыка',
    'музыка',
]);
