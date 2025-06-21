import type { Track } from '../../common/types';
import { getMusicService } from './utils/musicServices';
import { shortenUrl } from './utils/string';

interface MyTracksListProps {
    myTracks: Track[];
    playedTrackIds: string[];
    showRemoveButtons?: boolean;
    onRemoveTrack?: (trackId: string) => void;
}

export function MyTracksList({ myTracks, playedTrackIds, showRemoveButtons = false, onRemoveTrack }: MyTracksListProps) {
    const getTrackDisplayText = (track: Track) => {
        if (track.title) {
            return track.artist ? `${track.title} - ${track.artist}` : track.title;
        }
        return shortenUrl(track.url, 40);
    };

    const handleRemoveTrack = (trackId: string) => {
        if (onRemoveTrack) {
            onRemoveTrack(trackId);
        }
    };

    return (
        <ul className="tracks-list">
            {myTracks.map((track) => {
                const isPlayed = playedTrackIds.includes(track.id);
                const service = getMusicService(track.url);

                return (
                    <li key={track.id} className={`track-item ${isPlayed ? 'played' : ''}`}>
                        <a href={track.url} target="_blank" rel="noopener noreferrer" className="track-link">
                            {service && <img src={service.logo} alt={service.name} className="track-service-logo" />}
                            <span className="track-title">{getTrackDisplayText(track)}</span>
                        </a>
                        {showRemoveButtons && !isPlayed && onRemoveTrack && (
                            <button
                                className="track-remove-btn"
                                onClick={() => handleRemoveTrack(track.id)}
                                title="Remove track"
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
