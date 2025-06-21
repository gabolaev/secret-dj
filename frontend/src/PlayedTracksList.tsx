import type { PlayedTrack } from '../../common/types';
import { getMusicService } from './utils/musicServices';

interface PlayedTracksListProps {
    playedTracks: PlayedTrack[];
}

export function PlayedTracksList({ playedTracks }: PlayedTracksListProps) {
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
                            <span className="track-title">{track.url}</span>
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
