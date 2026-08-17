/**
 * One registry, one truth.
 *
 * v1 kept two divergent copies of this table (client and server) which is how
 * `music.youtube.com` ended up detected as plain YouTube. Detection, canonical
 * identity and embed construction all live here now, and the order of
 * `MUSIC_SERVICES` is load-bearing: most specific host wins.
 */

export type ServiceId =
    | 'youtube-music'
    | 'youtube'
    | 'spotify'
    | 'apple-music'
    | 'deezer'
    | 'soundcloud'
    | 'yandex-music'
    | 'bandcamp'
    | 'tidal';

export interface MusicService {
    id: ServiceId;
    name: string;
    /** Brand colour, used for the accent on detection chips. */
    color: string;
    /** Matched against the URL hostname (with any leading `www.` stripped). */
    hosts: RegExp;
    /** Short links that must be followed server-side before they can be played. */
    shortLink?: RegExp;
}

export const MUSIC_SERVICES: readonly MusicService[] = [
    {
        id: 'youtube-music',
        name: 'YouTube Music',
        color: '#FF0033',
        hosts: /^music\.youtube\.com$/,
    },
    {
        id: 'youtube',
        name: 'YouTube',
        color: '#FF0000',
        hosts: /^((m|www)\.)?youtube(-nocookie)?\.com$|^youtu\.be$/,
    },
    {
        id: 'spotify',
        name: 'Spotify',
        color: '#1DB954',
        hosts: /^(open|play)\.spotify\.com$|^spotify\.link$/,
        shortLink: /^spotify\.link$/,
    },
    {
        id: 'apple-music',
        name: 'Apple Music',
        color: '#FA243C',
        hosts: /^music\.apple\.com$/,
    },
    {
        id: 'deezer',
        name: 'Deezer',
        color: '#A238FF',
        hosts: /^(www\.)?deezer\.com$|^(link|dzr)\.(deezer\.com|page\.link)$/,
        shortLink: /^(link|dzr)\./,
    },
    {
        id: 'soundcloud',
        name: 'SoundCloud',
        color: '#FF5500',
        hosts: /^((m|www|on)\.)?soundcloud\.com$/,
        shortLink: /^on\.soundcloud\.com$/,
    },
    {
        id: 'yandex-music',
        name: 'Yandex Music',
        color: '#FFCC00',
        hosts: /^music\.yandex\.(ru|com|by|kz|uz)$/,
    },
    {
        id: 'bandcamp',
        name: 'Bandcamp',
        color: '#629AA9',
        hosts: /(^|\.)bandcamp\.com$/,
    },
    {
        id: 'tidal',
        name: 'TIDAL',
        color: '#00FFFF',
        hosts: /^(listen\.|www\.)?tidal\.com$/,
    },
] as const;

/** Query params that identify the sharer, not the song. Stripped everywhere. */
const TRACKING_PARAMS = new Set([
    'si',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'feature',
    'context',
    'app_destination',
    'nd',
    'deferredFl',
    'referrer',
    'from',
    'uact',
    'pp',
]);

export function parseUrl(raw: string): URL | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
        // Be forgiving about a missing scheme; people paste `open.spotify.com/...`.
        const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
        return url;
    } catch {
        return null;
    }
}

function hostOf(url: URL): string {
    return url.hostname.toLowerCase();
}

export function detectService(raw: string): MusicService | null {
    const url = parseUrl(raw);
    if (!url) return null;
    const host = hostOf(url);
    return MUSIC_SERVICES.find(service => service.hosts.test(host)) ?? null;
}

/** True when the link must be expanded server-side before it can be embedded. */
export function needsResolution(raw: string): boolean {
    const url = parseUrl(raw);
    if (!url) return false;
    const host = hostOf(url);
    const service = MUSIC_SERVICES.find(s => s.hosts.test(host));
    return Boolean(service?.shortLink?.test(host));
}

/** Every hostname the URL-resolving proxy is willing to talk to. */
export function isAllowedMusicHost(hostname: string): boolean {
    const host = hostname.toLowerCase();
    return MUSIC_SERVICES.some(service => service.hosts.test(host));
}

export interface ResourceRef {
    service: ServiceId;
    kind: 'track' | 'album' | 'playlist' | 'artist' | 'episode' | 'video' | 'page';
    id: string;
}

/** Path segments that are locale prefixes rather than content types. */
const LOCALE_SEGMENT = /^(intl-[a-z]{2}|[a-z]{2}(-[a-z]{2})?)$/i;

function segments(url: URL): string[] {
    return url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
}

function stripLocale(parts: string[], known: readonly string[]): string[] {
    if (parts.length > 1 && LOCALE_SEGMENT.test(parts[0]) && !known.includes(parts[0].toLowerCase())) {
        return parts.slice(1);
    }
    return parts;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

function youtubeVideoId(url: URL): string | null {
    const host = hostOf(url);
    if (host === 'youtu.be') {
        const id = segments(url)[0];
        return id && YOUTUBE_ID.test(id) ? id : null;
    }
    const v = url.searchParams.get('v');
    if (v && YOUTUBE_ID.test(v)) return v;
    const parts = segments(url);
    if (parts.length >= 2 && ['embed', 'v', 'shorts', 'live'].includes(parts[0])) {
        return YOUTUBE_ID.test(parts[1]) ? parts[1] : null;
    }
    return null;
}

/**
 * Identify what a URL actually points at, independent of how it was shared.
 * Two links to the same Spotify track with different `?si=` tokens produce the
 * same ref — which is what makes duplicate detection work.
 */
export function describeResource(raw: string): ResourceRef | null {
    const url = parseUrl(raw);
    const service = detectService(raw);
    if (!url || !service) return null;

    switch (service.id) {
        case 'youtube':
        case 'youtube-music': {
            const video = youtubeVideoId(url);
            if (video) return { service: 'youtube', kind: 'video', id: video };
            const list = url.searchParams.get('list');
            if (list) return { service: 'youtube', kind: 'playlist', id: list };
            return null;
        }
        case 'spotify': {
            const parts = stripLocale(segments(url), ['track', 'album', 'playlist', 'artist', 'episode']);
            const [kind, id] = parts;
            if (!kind || !id) return null;
            if (!['track', 'album', 'playlist', 'artist', 'episode'].includes(kind)) return null;
            return { service: 'spotify', kind: kind as ResourceRef['kind'], id };
        }
        case 'deezer': {
            const parts = stripLocale(segments(url), ['track', 'album', 'playlist', 'artist']);
            const [kind, id] = parts;
            if (!kind || !id) return null;
            if (!['track', 'album', 'playlist', 'artist'].includes(kind)) return null;
            return { service: 'deezer', kind: kind as ResourceRef['kind'], id };
        }
        case 'apple-music': {
            const parts = stripLocale(segments(url), ['album', 'playlist', 'song', 'artist']);
            const song = url.searchParams.get('i');
            if (song) return { service: 'apple-music', kind: 'track', id: song };
            const [kind, , id] = parts;
            if (!kind || !id) return null;
            const mapped = kind === 'song' ? 'track' : kind;
            if (!['track', 'album', 'playlist', 'artist'].includes(mapped)) return null;
            return { service: 'apple-music', kind: mapped as ResourceRef['kind'], id };
        }
        case 'yandex-music': {
            const parts = segments(url);
            const trackIndex = parts.indexOf('track');
            if (trackIndex >= 0 && parts[trackIndex + 1]) {
                return { service: 'yandex-music', kind: 'track', id: parts[trackIndex + 1] };
            }
            const albumIndex = parts.indexOf('album');
            if (albumIndex >= 0 && parts[albumIndex + 1]) {
                return { service: 'yandex-music', kind: 'album', id: parts[albumIndex + 1] };
            }
            return null;
        }
        case 'tidal': {
            const parts = stripLocale(segments(url), ['track', 'album', 'playlist', 'video', 'browse']);
            const cleaned = parts[0] === 'browse' ? parts.slice(1) : parts;
            const [kind, id] = cleaned;
            if (!kind || !id) return null;
            if (!['track', 'album', 'playlist', 'video'].includes(kind)) return null;
            return { service: 'tidal', kind: kind as ResourceRef['kind'], id };
        }
        case 'soundcloud':
        case 'bandcamp':
            // Slug-based services: the path *is* the identity.
            return { service: service.id, kind: 'page', id: `${hostOf(url)}${url.pathname.replace(/\/$/, '')}` };
    }
}

/**
 * A stable key for "this is the same piece of music".
 * Falls back to a scrubbed URL when the service has no parseable structure.
 */
export function canonicalKey(raw: string): string {
    const ref = describeResource(raw);
    if (ref) return `${ref.service}:${ref.kind}:${ref.id.toLowerCase()}`;

    const url = parseUrl(raw);
    if (!url) return raw.trim().toLowerCase();
    const host = hostOf(url).replace(/^www\./, '');
    const params = [...url.searchParams.entries()]
        .filter(([key]) => !TRACKING_PARAMS.has(key))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
    return `${host}${url.pathname.replace(/\/$/, '')}${params ? `?${params}` : ''}`.toLowerCase();
}

/** Drop tracking junk so the stored URL is the one worth sharing. */
export function cleanUrl(raw: string): string {
    const url = parseUrl(raw);
    if (!url) return raw.trim();
    for (const key of [...url.searchParams.keys()]) {
        if (TRACKING_PARAMS.has(key)) url.searchParams.delete(key);
    }
    url.hash = '';
    return url.toString();
}

/**
 * Why a link can only be opened rather than played. A code, not a sentence, so
 * the UI can say it in the player's own language.
 */
export type EmbedIssue =
    | 'unrecognised-link'
    | 'missing-youtube-id'
    | 'missing-spotify-id'
    | 'missing-deezer-id'
    | 'missing-apple-id'
    | 'missing-yandex-id'
    | 'missing-tidal-id'
    | 'external-only';

export type Embed =
    | { kind: 'iframe'; src: string; height: number; title: string }
    | { kind: 'link'; issue: EmbedIssue };

const SPOTIFY_HEIGHTS: Record<string, number> = { track: 152, episode: 232, album: 380, playlist: 380, artist: 380 };
const DEEZER_HEIGHTS: Record<string, number> = { track: 150, album: 300, playlist: 300, artist: 300 };

/**
 * Build a playable embed for a URL, or explain why we can only link out.
 * Pure and synchronous: short links must already have been resolved.
 */
export function buildEmbed(raw: string): Embed {
    const url = parseUrl(raw);
    const service = detectService(raw);
    if (!url || !service) return { kind: 'link', issue: 'unrecognised-link' };

    const ref = describeResource(raw);

    switch (service.id) {
        case 'youtube':
        case 'youtube-music': {
            if (ref?.kind === 'video') {
                const start = parseTimestamp(url.searchParams.get('t'));
                const params = new URLSearchParams({ rel: '0', modestbranding: '1' });
                if (start) params.set('start', String(start));
                const list = url.searchParams.get('list');
                if (list) params.set('list', list);
                return {
                    kind: 'iframe',
                    src: `https://www.youtube-nocookie.com/embed/${ref.id}?${params}`,
                    height: 315,
                    title: 'YouTube player',
                };
            }
            if (ref?.kind === 'playlist') {
                return {
                    kind: 'iframe',
                    src: `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(ref.id)}`,
                    height: 315,
                    title: 'YouTube playlist player',
                };
            }
            return { kind: 'link', issue: 'missing-youtube-id' };
        }
        case 'spotify': {
            if (!ref) return { kind: 'link', issue: 'missing-spotify-id' };
            return {
                kind: 'iframe',
                src: `https://open.spotify.com/embed/${ref.kind}/${encodeURIComponent(ref.id)}`,
                height: SPOTIFY_HEIGHTS[ref.kind] ?? 232,
                title: 'Spotify player',
            };
        }
        case 'deezer': {
            if (!ref) return { kind: 'link', issue: 'missing-deezer-id' };
            return {
                kind: 'iframe',
                src: `https://widget.deezer.com/widget/dark/${ref.kind}/${encodeURIComponent(ref.id)}?app_id=1`,
                height: DEEZER_HEIGHTS[ref.kind] ?? 300,
                title: 'Deezer player',
            };
        }
        case 'soundcloud': {
            const params = new URLSearchParams({
                url: url.toString(),
                color: '#ff8a3d',
                auto_play: 'false',
                hide_related: 'true',
                show_comments: 'false',
                show_reposts: 'false',
                show_teaser: 'false',
                visual: 'false',
            });
            return {
                kind: 'iframe',
                src: `https://w.soundcloud.com/player/?${params}`,
                height: 166,
                title: 'SoundCloud player',
            };
        }
        case 'apple-music': {
            const parts = segments(url);
            if (parts.length < 2) return { kind: 'link', issue: 'missing-apple-id' };
            const embedUrl = new URL(`https://embed.music.apple.com${url.pathname}`);
            const song = url.searchParams.get('i');
            if (song) embedUrl.searchParams.set('i', song);
            return {
                kind: 'iframe',
                src: embedUrl.toString(),
                height: song || parts.includes('song') ? 175 : 450,
                title: 'Apple Music player',
            };
        }
        case 'yandex-music': {
            const parts = segments(url);
            const album = parts[parts.indexOf('album') + 1];
            if (ref?.kind === 'track' && album && parts.includes('album')) {
                return {
                    kind: 'iframe',
                    src: `https://music.yandex.ru/iframe/#track/${encodeURIComponent(ref.id)}/${encodeURIComponent(album)}`,
                    height: 180,
                    title: 'Yandex Music player',
                };
            }
            if (ref?.kind === 'album') {
                return {
                    kind: 'iframe',
                    src: `https://music.yandex.ru/iframe/#album/${encodeURIComponent(ref.id)}`,
                    height: 300,
                    title: 'Yandex Music player',
                };
            }
            return { kind: 'link', issue: 'missing-yandex-id' };
        }
        case 'tidal': {
            if (!ref || ref.kind === 'artist' || ref.kind === 'page') {
                return { kind: 'link', issue: 'missing-tidal-id' };
            }
            return {
                kind: 'iframe',
                src: `https://embed.tidal.com/${ref.kind}s/${encodeURIComponent(ref.id)}?disableAnalytics=true`,
                height: ref.kind === 'track' ? 120 : 400,
                title: 'TIDAL player',
            };
        }
        case 'bandcamp':
            // Bandcamp embeds need a numeric id that only the page HTML carries.
            return { kind: 'link', issue: 'external-only' };
    }
}

/** YouTube's `t` param accepts `90`, `90s`, `1m30s`, `1h2m3s`. */
export function parseTimestamp(value: string | null): number | null {
    if (!value) return null;
    if (/^\d+$/.test(value)) return Number(value);
    const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    if (!match || !match.slice(1).some(Boolean)) return null;
    const [h = '0', m = '0', s = '0'] = match.slice(1).map(v => v ?? '0');
    return Number(h) * 3600 + Number(m) * 60 + Number(s);
}
