import { describe, expect, it } from 'vitest';
import { isGenericTitle, titleFromUrl } from '../src/services/metadata.js';

describe('titleFromUrl', () => {
    it('refuses to turn a routing segment into a song title', () => {
        // The reported bug, in one line: most of the playlist read "Watch",
        // "Track" or a raw id, because the last path segment was taken as the
        // name of the song. Worse, returning something marked the lookup as
        // successful, so the failure was invisible and never retried.
        expect(titleFromUrl('https://www.youtube.com/watch?v=PzDupYdobnU')).toBeNull();
        expect(titleFromUrl('https://music.yandex.ru/album/4058886/track/33311009')).toBeNull();
        expect(titleFromUrl('https://open.spotify.com/album/6bQjX2u1Cs0mCTPMcQPmuu')).toBeNull();
    });

    it('refuses the opaque ids services put in their URLs', () => {
        // "5msuIqHufF7G9Nnz1EbjFU" tells a player nothing, and dressing it up as
        // a title is worse than admitting we do not know.
        expect(titleFromUrl('https://open.spotify.com/track/5msuIqHufF7G9Nnz1EbjFU')).toBeNull();
        expect(titleFromUrl('https://youtu.be/B4CcX720DW4')).toBeNull();
        expect(titleFromUrl('https://www.deezer.com/track/3135556')).toBeNull();
    });

    it('still reads a genuinely descriptive slug', () => {
        expect(titleFromUrl('https://soundcloud.com/artist/some-great-song')?.title).toBe('Some Great Song');
        expect(titleFromUrl('https://music.apple.com/us/album/exhale/1440857781')?.title).toBe('Exhale');
        // A locale prefix is not the title either.
        expect(titleFromUrl('https://open.spotify.com/intl-de/track/never-gonna-give-you-up')?.title).toBe(
            'Never Gonna Give You Up',
        );
    });

    it('gives up rather than guessing when there is nothing to read', () => {
        expect(titleFromUrl('https://open.spotify.com/')).toBeNull();
        expect(titleFromUrl('not a url at all')).toBeNull();
    });
});

describe('isGenericTitle', () => {
    it('rejects a page describing the service instead of the song', () => {
        // The same failure the slug fix removed, arriving by a different door:
        // a shell page's OpenGraph title is the site's name, not a track.
        expect(isGenericTitle('Apple Music Web Player')).toBe(true);
        expect(isGenericTitle('Spotify')).toBe(true);
        expect(isGenericTitle('Яндекс Музыка')).toBe(true);
        expect(isGenericTitle('SoundCloud', 'SoundCloud')).toBe(true);
    });

    it('lets a real title through, even one that names the service', () => {
        expect(isGenericTitle('Olson')).toBe(false);
        expect(isGenericTitle('Spotify Sessions', 'Spotify')).toBe(false);
        expect(isGenericTitle('Лето2010')).toBe(false);
    });
});
