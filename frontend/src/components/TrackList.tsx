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
}

export function TrackList({ tracks, nowPlayingId, playedIds, onRemove, emptyMessage }: TrackListProps) {
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
                        {playing && (
                            <span className="eq" title={t.tracks.playingNow} aria-label={t.tracks.playingNow}>
                                <i />
                                <i />
                                <i />
                            </span>
                        )}
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
                    </li>
                );
            })}
        </ul>
    );
}
