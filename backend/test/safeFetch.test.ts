import { describe, expect, it } from 'vitest';
import { isAllowedMusicHost } from '@secret-dj/common';
import { isPublicAddress } from '../src/net/safeFetch.js';

/**
 * The v1 `/api/resolve-url` endpoint fetched any URL a visitor supplied and
 * followed redirects, which turned the game server into an SSRF proxy. These
 * are the two checks that close it.
 */
describe('isPublicAddress', () => {
    it('rejects loopback, link-local and private ranges', () => {
        for (const address of [
            '127.0.0.1',
            '127.53.0.9',
            '0.0.0.0',
            '10.1.2.3',
            '172.16.0.1',
            '172.31.255.255',
            '192.168.1.1',
            '169.254.169.254', // cloud metadata
            '100.64.0.1',
            '198.18.0.1',
            '224.0.0.1',
            '255.255.255.255',
        ]) {
            expect(isPublicAddress(address), address).toBe(false);
        }
    });

    it('rejects the IPv6 equivalents, including v4-mapped forms', () => {
        for (const address of ['::1', '::', 'fe80::1', 'fc00::1', 'fd12:3456::1', 'ff02::1', '::ffff:127.0.0.1']) {
            expect(isPublicAddress(address), address).toBe(false);
        }
    });

    it('allows genuinely public addresses', () => {
        for (const address of ['8.8.8.8', '1.1.1.1', '172.32.0.1', '11.0.0.1', '2606:4700::1111']) {
            expect(isPublicAddress(address), address).toBe(true);
        }
    });

    it('rejects anything that is not an IP at all', () => {
        expect(isPublicAddress('localhost')).toBe(false);
        expect(isPublicAddress('')).toBe(false);
        expect(isPublicAddress('999.1.1.1')).toBe(false);
    });
});

describe('music host allowlist', () => {
    it('is the second gate: only supported services may be fetched', () => {
        expect(isAllowedMusicHost('open.spotify.com')).toBe(true);
        expect(isAllowedMusicHost('link.deezer.com')).toBe(true);
        expect(isAllowedMusicHost('metadata.google.internal')).toBe(false);
        expect(isAllowedMusicHost('spotify.com.evil.net')).toBe(false);
    });
});
