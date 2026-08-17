import type { ServiceId } from '@secret-dj/common';
import { MUSIC_SERVICES, detectService } from '@secret-dj/common';
import spotify from '../assets/spotify.svg';
import youtube from '../assets/youtube.svg';
import youtubeMusic from '../assets/youtube_music.svg';
import deezer from '../assets/deezer.svg';
import apple from '../assets/apple.svg';
import soundcloud from '../assets/soundcloud.svg';
import yandex from '../assets/yandex.svg';

/**
 * Logos live only on the client; the shared registry stays asset-free so the
 * server can import it. Missing entries fall back to a generic glyph rather
 * than a broken image.
 */
const LOGOS: Partial<Record<ServiceId, string>> = {
    spotify,
    youtube,
    'youtube-music': youtubeMusic,
    deezer,
    'apple-music': apple,
    soundcloud,
    'yandex-music': yandex,
};

export interface ServiceBadge {
    id: ServiceId;
    name: string;
    color: string;
    logo?: string;
}

export function serviceBadge(url: string): ServiceBadge | null {
    const service = detectService(url);
    if (!service) return null;
    return { id: service.id, name: service.name, color: service.color, logo: LOGOS[service.id] };
}

export function serviceBadgeByName(name: string | undefined): ServiceBadge | null {
    if (!name) return null;
    const service = MUSIC_SERVICES.find(entry => entry.name === name);
    if (!service) return null;
    return { id: service.id, name: service.name, color: service.color, logo: LOGOS[service.id] };
}
