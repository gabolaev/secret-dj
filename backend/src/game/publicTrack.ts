import type { PublicTrack } from '@secret-dj/common';
import type { TrackState } from './state.js';

/**
 * The only mapper from private track state to the wire.
 * Note what it drops: `ownerId` and `canonical`, the two fields that would give
 * away who queued a song before the reveal.
 */
export function toPublicTrack(track: TrackState): PublicTrack {
    return {
        id: track.id,
        url: track.url,
        title: track.title,
        artist: track.artist,
        artwork: track.artwork,
        service: track.serviceName,
        metadata: track.metadata,
    };
}
