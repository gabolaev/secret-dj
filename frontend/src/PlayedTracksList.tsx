import type { PlayedTrack } from '../../common/types';
import { getMusicService } from './utils/musicServices';
import { shortenUrl } from './utils/string';

interface PlayedTracksListProps {
    playedTracks: PlayedTrack[];
}

export function PlayedTracksList({ playedTracks }: PlayedTracksListProps) {
    const getTrackDisplayText = (track: PlayedTrack['track']) => {
        if (track.title) {
            return track.artist ? `${track.title} - ${track.artist}` : track.title;
        }
        return shortenUrl(track.url, 40);
    };

    if (!playedTracks || playedTracks.length === 0) {
        return (
            <div className="text-center text-secondary">
                <p>No tracks played yet</p>
            </div>
        );
    }

    return (
        <ul className="tracks-list">
            {playedTracks.map(({ track, likes }) => {
                const service = getMusicService(track.url);
                return (
                    <li key={track.id} className="track-item">
                        <a href={track.url} target="_blank" rel="noopener noreferrer" className="track-link">
                            {service && (
                                <img src={service.logo} alt={service.name} className="track-service-logo" />
                            )}
                            <span className="track-title">{getTrackDisplayText(track)}</span>
                            {likes && likes.length > 0 && (
                                <span className="track-likes">
                                    ❤️ {likes.length}
                                </span>
                            )}
                        </a>
                    </li>
                );
            })}
        </ul>
    );
} 
