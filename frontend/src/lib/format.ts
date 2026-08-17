import type { PlayerId, PublicPlayer, PublicTrack } from '@secret-dj/common';

/** A display label for a track, degrading gracefully while metadata is pending. */
export function trackLabel(track: PublicTrack): string {
    if (track.title) return track.artist ? `${track.title} — ${track.artist}` : track.title;
    return prettyUrl(track.url);
}

export function prettyUrl(rawUrl: string, maxLength = 46): string {
    let host = rawUrl;
    let path = '';
    try {
        const url = new URL(rawUrl);
        host = url.hostname.replace(/^www\./, '');
        path = url.pathname.replace(/\/$/, '');
    } catch {
        return truncateMiddle(rawUrl, maxLength);
    }
    const combined = `${host}${path}`;
    return combined.length <= maxLength ? combined : `${host}${truncateMiddle(path, Math.max(6, maxLength - host.length))}`;
}

export function truncateMiddle(value: string, maxLength: number): string {
    if (value.length <= maxLength) return value;
    const keep = Math.max(1, maxLength - 1);
    const head = Math.ceil(keep / 2);
    const tail = Math.floor(keep / 2);
    return `${value.slice(0, head)}…${value.slice(value.length - tail)}`;
}

export function initials(name: string): string {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    const letters = parts.map(part => [...part][0] ?? '').join('');
    return (letters || name.slice(0, 1)).toUpperCase();
}

/**
 * A stable hue per player, so the same person is the same colour on every
 * screen in the room. Simple FNV-ish hash over the id.
 */
export function playerHue(playerId: PlayerId): number {
    let hash = 2166136261;
    for (let i = 0; i < playerId.length; i++) {
        hash ^= playerId.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash) % 360;
}

export function nameOf(players: readonly PublicPlayer[], playerId: PlayerId): string {
    return players.find(player => player.id === playerId)?.name ?? 'Someone who left';
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
    return `${count} ${count === 1 ? singular : pluralForm}`;
}
