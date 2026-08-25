import type { ReactNode } from 'react';
import type { PublicTrack, TrackId } from '@secret-dj/common';
import { serviceBadgeByName } from '../lib/serviceLogos';
import { trackLabel } from '../lib/format';
import { useT } from '../i18n';

interface TrackListProps {
    tracks: PublicTrack[];
    /** Track currently on the decks, highlighted rather than listed as played. */
    nowPlayingId?: TrackId;
    playedIds?: ReadonlySet<TrackId>;
    onRemove?: (trackId: TrackId) => void;
    emptyMessage?: string;
    /** Rendered under each row. The lobby hangs the claim picker here. */
    slot?: (track: PublicTrack) => ReactNode;
}

export function TrackList({ tracks, nowPlayingId, playedIds, onRemove, emptyMessage, slot }: TrackListProps) {
    const t = useT();
    if (tracks.length === 0) return <p className="muted">{emptyMessage ?? t.common.nothingYet}</p>;

    return (
        <ul className="tracks">
            {tracks.map(track => {
                const badge = serviceBadgeByName(track.service);
                const playing = track.id === nowPlayingId;
                const played = !playing && playedIds?.has(track.id);

                return (
                    <li key={track.id} className={`track${playing ? ' track--playing' : ''}${played ? ' track--played' : ''}`}>
                        {badge?.logo ? (
                            <img className="track__logo" src={badge.logo} alt="" aria-hidden="true" />
                        ) : (
                            <span className="track__logo track__logo--generic" aria-hidden="true">
                                ♪
                            </span>
                        )}
                        <a
                            className="track__title"
                            href={track.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={trackLabel(track)}
                        >
                            <span className={track.metadata === 'pending' ? 'shimmer' : undefined}>{trackLabel(track)}</span>
                        </a>
                        {/* A word, not three animated bars. Nothing on an idle
                            screen moves, and "now playing" is information a
                            label carries better than a drawing of an EQ. */}
                        {playing && <span className="track__meta num">{t.tracks.playingNow}</span>}
                        {onRemove && !played && !playing && (
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
                        {slot?.(track)}
                    </li>
                );
            })}
        </ul>
    );
}
