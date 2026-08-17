import { describe, expect, it } from 'vitest';
import {
    buildEmbed,
    canonicalKey,
    cleanUrl,
    describeResource,
    detectService,
    isAllowedMusicHost,
    needsResolution,
    parseTimestamp,
} from '@secret-dj/common';

describe('detectService', () => {
    it('prefers the most specific host (the v1 YouTube Music bug)', () => {
        // v1 listed YouTube before YouTube Music, so every music.youtube.com link
        // was labelled plain "YouTube".
        expect(detectService('https://music.youtube.com/watch?v=dQw4w9WgXcQ')?.id).toBe('youtube-music');
        expect(detectService('https://www.youtube.com/watch?v=dQw4w9WgXcQ')?.id).toBe('youtube');
    });

    it('accepts links pasted without a scheme', () => {
        expect(detectService('open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT')?.id).toBe('spotify');
    });

    it('rejects non-music hosts and non-http schemes', () => {
        expect(detectService('https://example.com/song')).toBeNull();
        expect(detectService('javascript:alert(1)')).toBeNull();
        expect(detectService('file:///etc/passwd')).toBeNull();
        expect(detectService('')).toBeNull();
    });

    it('knows which links must be expanded server-side', () => {
        expect(needsResolution('https://link.deezer.com/s/30abc')).toBe(true);
        expect(needsResolution('https://spotify.link/abc123')).toBe(true);
        expect(needsResolution('https://open.spotify.com/track/abc')).toBe(false);
        expect(needsResolution('https://youtu.be/dQw4w9WgXcQ')).toBe(false);
    });
});

describe('isAllowedMusicHost', () => {
    it('gates the URL-resolving proxy to music services only', () => {
        expect(isAllowedMusicHost('open.spotify.com')).toBe(true);
        expect(isAllowedMusicHost('localhost')).toBe(false);
        expect(isAllowedMusicHost('169.254.169.254')).toBe(false);
        expect(isAllowedMusicHost('evil.com')).toBe(false);
    });
});

describe('describeResource', () => {
    it('reads Spotify links with locale prefixes and share tokens', () => {
        expect(describeResource('https://open.spotify.com/intl-de/track/4cOdK2wGLETKBW3PvgPWqT?si=abc')).toEqual({
            service: 'spotify',
            kind: 'track',
            id: '4cOdK2wGLETKBW3PvgPWqT',
        });
    });

    it('reads every shape of YouTube link', () => {
        for (const url of [
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'https://youtu.be/dQw4w9WgXcQ',
            'https://www.youtube.com/embed/dQw4w9WgXcQ',
            'https://www.youtube.com/shorts/dQw4w9WgXcQ',
            'https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=RDAMVM',
        ]) {
            expect(describeResource(url)).toEqual({ service: 'youtube', kind: 'video', id: 'dQw4w9WgXcQ' });
        }
    });

    it('reads Apple Music song links via the ?i= parameter', () => {
        expect(describeResource('https://music.apple.com/us/album/blue-monday/1440830228?i=1440830542')).toEqual({
            service: 'apple-music',
            kind: 'track',
            id: '1440830542',
        });
    });

    it('reads Deezer and Yandex links', () => {
        expect(describeResource('https://www.deezer.com/en/track/3135556')).toEqual({
            service: 'deezer',
            kind: 'track',
            id: '3135556',
        });
        expect(describeResource('https://music.yandex.ru/album/123/track/456')).toEqual({
            service: 'yandex-music',
            kind: 'track',
            id: '456',
        });
    });
});

describe('canonicalKey', () => {
    it('treats the same song shared different ways as one track', () => {
        const a = canonicalKey('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=abcdef');
        const b = canonicalKey('https://open.spotify.com/intl-fr/track/4cOdK2wGLETKBW3PvgPWqT');
        expect(a).toBe(b);
    });

    it('collapses youtu.be and youtube.com to one identity', () => {
        expect(canonicalKey('https://youtu.be/dQw4w9WgXcQ?t=42')).toBe(
            canonicalKey('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
        );
    });

    it('keeps genuinely different tracks apart', () => {
        expect(canonicalKey('https://open.spotify.com/track/aaaaaaaaaaaaaaaaaaaaaa')).not.toBe(
            canonicalKey('https://open.spotify.com/track/bbbbbbbbbbbbbbbbbbbbbb'),
        );
    });
});

describe('cleanUrl', () => {
    it('strips share tokens but keeps the link working', () => {
        expect(cleanUrl('https://open.spotify.com/track/abc?si=tracking&utm_source=copy')).toBe(
            'https://open.spotify.com/track/abc',
        );
    });
});

describe('buildEmbed', () => {
    it('embeds YouTube via the no-cookie host and honours timestamps', () => {
        const embed = buildEmbed('https://youtu.be/dQw4w9WgXcQ?t=1m30s');
        expect(embed.kind).toBe('iframe');
        if (embed.kind !== 'iframe') return;
        expect(embed.src).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
        expect(embed.src).toContain('start=90');
    });

    it('uses the right Spotify embed type instead of always /track/ (a v1 bug)', () => {
        const album = buildEmbed('https://open.spotify.com/album/1234');
        expect(album.kind === 'iframe' && album.src).toContain('/embed/album/1234');
        const playlist = buildEmbed('https://open.spotify.com/playlist/5678');
        expect(playlist.kind === 'iframe' && playlist.src).toContain('/embed/playlist/5678');
    });

    it('falls back to a link rather than building a broken iframe', () => {
        // v1 produced `music.yandex.ru/iframe/#track/https:/...` for these.
        expect(buildEmbed('https://music.yandex.ru/artist/999').kind).toBe('link');
        expect(buildEmbed('https://artist.bandcamp.com/track/song').kind).toBe('link');
        expect(buildEmbed('https://example.com/whatever').kind).toBe('link');
    });

    it('embeds Deezer and Apple Music correctly', () => {
        const deezer = buildEmbed('https://www.deezer.com/en/track/3135556');
        expect(deezer.kind === 'iframe' && deezer.src).toContain('widget/dark/track/3135556');

        const apple = buildEmbed('https://music.apple.com/us/album/blue-monday/1440830228?i=1440830542');
        expect(apple.kind === 'iframe' && apple.src).toContain('embed.music.apple.com/us/album');
        expect(apple.kind === 'iframe' && apple.src).toContain('i=1440830542');
    });
});

describe('parseTimestamp', () => {
    it('handles every YouTube time format', () => {
        expect(parseTimestamp('90')).toBe(90);
        expect(parseTimestamp('90s')).toBe(90);
        expect(parseTimestamp('1m30s')).toBe(90);
        expect(parseTimestamp('1h2m3s')).toBe(3723);
        expect(parseTimestamp('nonsense')).toBeNull();
        expect(parseTimestamp(null)).toBeNull();
    });
});
