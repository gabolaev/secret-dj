/**
 * Outbound HTTP with the safety rails v1 was missing.
 *
 * v1 exposed `GET /api/resolve-url?url=<anything>` which fetched arbitrary URLs
 * and followed redirects — a textbook SSRF: any visitor could use the server to
 * probe `http://169.254.169.254/`, `http://localhost:6379/`, or anything else
 * reachable from inside the network, and read the final URL back.
 *
 * Here, user-supplied URLs are:
 *   1. restricted to hostnames belonging to supported music services,
 *   2. re-checked at *every* redirect hop,
 *   3. resolved through DNS and rejected if they point at a private address,
 *   4. bounded by a timeout, a redirect budget and a response size cap.
 */
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { isAllowedMusicHost, parseUrl } from '@secret-dj/common';

export const USER_AGENT = 'SecretDJ/2.0 (+https://github.com/gabolaev/secret-dj)';

const DEFAULT_TIMEOUT_MS = 6_000;
const MAX_REDIRECTS = 5;
const MAX_BODY_BYTES = 512 * 1024;

export class UnsafeUrlError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UnsafeUrlError';
    }
}

function ipv4ToInt(address: string): number | null {
    const parts = address.split('.');
    if (parts.length !== 4) return null;
    let value = 0;
    for (const part of parts) {
        const octet = Number(part);
        if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
        value = value * 256 + octet;
    }
    return value;
}

const BLOCKED_V4: Array<[string, number]> = [
    ['0.0.0.0', 8], // "this network"
    ['10.0.0.0', 8], // RFC1918
    ['100.64.0.0', 10], // carrier NAT
    ['127.0.0.0', 8], // loopback
    ['169.254.0.0', 16], // link-local, incl. cloud metadata
    ['172.16.0.0', 12], // RFC1918
    ['192.0.0.0', 24], // IETF protocol assignments
    ['192.0.2.0', 24], // TEST-NET-1
    ['192.88.99.0', 24], // 6to4 relay anycast
    ['192.168.0.0', 16], // RFC1918
    ['198.18.0.0', 15], // benchmarking
    ['198.51.100.0', 24], // TEST-NET-2
    ['203.0.113.0', 24], // TEST-NET-3
    ['224.0.0.0', 4], // multicast
    ['240.0.0.0', 4], // reserved, incl. 255.255.255.255
];

export function isPublicAddress(address: string): boolean {
    const family = isIP(address);
    if (family === 4) {
        const value = ipv4ToInt(address);
        if (value === null) return false;
        return !BLOCKED_V4.some(([base, bits]) => {
            const baseValue = ipv4ToInt(base);
            if (baseValue === null) return false;
            const mask = bits === 0 ? 0 : (-1 << (32 - bits)) >>> 0;
            return (value & mask) >>> 0 === (baseValue & mask) >>> 0;
        });
    }

    if (family === 6) {
        const normalised = address.toLowerCase().split('%')[0];
        // IPv4-mapped (::ffff:a.b.c.d) inherits the IPv4 rules.
        const mapped = normalised.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
        if (mapped) return isPublicAddress(mapped[1]);
        if (normalised === '::' || normalised === '::1') return false;
        if (/^f[cd][0-9a-f]{2}:/.test(normalised)) return false; // unique local
        if (/^fe[89ab][0-9a-f]:/.test(normalised)) return false; // link-local
        if (/^ff[0-9a-f]{2}:/.test(normalised)) return false; // multicast
        return true;
    }

    return false;
}

async function assertPublicHost(hostname: string): Promise<void> {
    if (isIP(hostname)) {
        if (!isPublicAddress(hostname)) throw new UnsafeUrlError('Refusing to fetch a private address.');
        return;
    }
    let addresses: Array<{ address: string }>;
    try {
        addresses = await lookup(hostname, { all: true });
    } catch {
        throw new UnsafeUrlError(`Could not resolve ${hostname}.`);
    }
    if (addresses.length === 0 || addresses.some(entry => !isPublicAddress(entry.address))) {
        throw new UnsafeUrlError('Refusing to fetch a private address.');
    }
}

export interface FetchOptions {
    timeoutMs?: number;
    method?: 'GET' | 'HEAD';
    /** Set for user-supplied URLs. Restricts hosts to supported music services. */
    musicHostsOnly?: boolean;
}

async function guardedFetch(url: URL, options: FetchOptions): Promise<Response> {
    if (options.musicHostsOnly && !isAllowedMusicHost(url.hostname)) {
        throw new UnsafeUrlError(`${url.hostname} is not a supported music service.`);
    }
    await assertPublicHost(url.hostname);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    try {
        return await fetch(url, {
            method: options.method ?? 'GET',
            redirect: 'manual',
            signal: controller.signal,
            headers: { 'user-agent': USER_AGENT, accept: '*/*' },
        });
    } finally {
        clearTimeout(timer);
    }
}

export interface ResolvedUrl {
    url: string;
    hops: number;
}

/**
 * Follows redirects for a user-supplied music link, validating every hop.
 * Used to expand share links like `spotify.link/...` and `link.deezer.com/...`.
 */
export async function resolveMusicUrl(rawUrl: string, options: FetchOptions = {}): Promise<ResolvedUrl> {
    const start = parseUrl(rawUrl);
    if (!start) throw new UnsafeUrlError('That is not a URL.');

    let current = start;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        const response = await guardedFetch(current, { ...options, musicHostsOnly: true, method: 'GET' });
        // Drain so the socket can be reused; we only ever wanted the headers.
        await response.body?.cancel().catch(() => undefined);

        const location = response.headers.get('location');
        if (response.status >= 300 && response.status < 400 && location) {
            const next = parseUrl(new URL(location, current).toString());
            if (!next) throw new UnsafeUrlError('Redirected somewhere unusable.');
            current = next;
            continue;
        }
        return { url: current.toString(), hops: hop };
    }
    throw new UnsafeUrlError('Too many redirects.');
}

/**
 * Fetch JSON from an endpoint *we* chose (oEmbed providers, public APIs).
 * Still timed, size-capped and address-checked, but not host-restricted.
 */
export async function fetchJson<T>(url: string, options: FetchOptions = {}, redirectsLeft = MAX_REDIRECTS): Promise<T | null> {
    const target = parseUrl(url);
    if (!target) return null;

    const response = await guardedFetch(target, options);
    if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        await response.body?.cancel().catch(() => undefined);
        // A redirect loop must terminate, not merely get slower each hop.
        if (!location || redirectsLeft <= 0) return null;
        return fetchJson<T>(new URL(location, target).toString(), options, redirectsLeft - 1);
    }
    if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        return null;
    }

    const length = Number(response.headers.get('content-length') ?? 0);
    if (length > MAX_BODY_BYTES) {
        await response.body?.cancel().catch(() => undefined);
        return null;
    }

    const text = await readCapped(response);
    if (text === null) return null;
    try {
        return JSON.parse(text) as T;
    } catch {
        return null;
    }
}

async function readCapped(response: Response): Promise<string | null> {
    if (!response.body) return null;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            total += value.byteLength;
            if (total > MAX_BODY_BYTES) {
                await reader.cancel().catch(() => undefined);
                return null;
            }
            chunks.push(value);
        }
    } catch {
        return null;
    }
    return Buffer.concat(chunks.map(chunk => Buffer.from(chunk))).toString('utf8');
}
