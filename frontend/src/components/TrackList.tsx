import type { ReactNode } from 'react';
import type { PublicTrack, TrackId } from '@secret-dj/common';
import { serviceBadgeByName } from '../lib/serviceLogos';
import { trackLabel } from '../lib/format';
import { useT } from '../i18n';

interface TrackListProps {
    tracks: PublicTrack[];
    onRemove?: (trackId: TrackId) => void;
    /** Rendered at the end of each row. The lobby hangs the claim picker here. */
    slot?: (track: PublicTrack) => ReactNode;
}

export function TrackList({ tracks, onRemove, slot }: TrackListProps) {
    const t = useT();
    if (tracks.length === 0) return null;

    return (
        <ul className="tracks">
            {tracks.map(track => {
                const badge = serviceBadgeByName(track.service);
                return (
                    <li key={track.id} className="track">
                        <div className="track__main">
                            {track.artwork ? (
                                <img className="track__art" src={track.artwork} alt="" aria-hidden="true" />
                            ) : (
                                <span className="track__art track__art--empty" aria-hidden="true">
                                    {badge?.logo ? <img src={badge.logo} alt="" /> : '♪'}
                                </span>
                            )}
                            <a
                                className="track__title clip"
                                href={track.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={trackLabel(track)}
                            >
                                <span className={track.metadata === 'pending' ? 'shimmer' : undefined}>
                                    {trackLabel(track)}
                                </span>
                            </a>
                            {onRemove && (
                                <button
                                    type="button"
                                    className="track__x"
                                    onClick={() => onRemove(track.id)}
                                    aria-label={`${t.tracks.remove} ${trackLabel(track)}`}
                                    title={t.tracks.remove}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        {slot?.(track)}
                    </li>
                );
            })}
        </ul>
    );
}
