import type { TrackMetadataResponse } from './types';

/**
 * Base for REST calls.
 *
 * v1 hard-coded relative `/api/...` paths while the socket used
 * `VITE_BACKEND_URL`. In development that meant every metadata and
 * URL-resolution request hit the Vite dev server and 404'd silently. Now both
 * transports agree: same origin by default (Vite proxies `/api` in dev), or the
 * configured backend when the API is deployed separately.
 */
const BASE = ((import.meta.env.VITE_BACKEND_URL as string | undefined) ?? '').replace(/\/+$/, '');

export function apiUrl(path: string): string {
    return `${BASE}${path}`;
}

export async function fetchTrackMetadata(url: string, signal: AbortSignal): Promise<TrackMetadataResponse | null> {
    const response = await fetch(apiUrl(`/api/track-metadata?url=${encodeURIComponent(url)}`), { signal });
    if (!response.ok) return null;
    return (await response.json()) as TrackMetadataResponse;
}

export async function resolveShareLink(url: string, signal: AbortSignal): Promise<string | null> {
    const response = await fetch(apiUrl(`/api/resolve-url?url=${encodeURIComponent(url)}`), { signal });
    if (!response.ok) return null;
    const data = (await response.json()) as { resolvedUrl?: string };
    return data.resolvedUrl ?? null;
}
