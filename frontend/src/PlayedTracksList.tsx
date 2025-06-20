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
            {playedTracks.map(({ track, ownerUsername, likes }) => {
                const service = getMusicService(track.url);
                return (
                    <li key={track.id} className="track-item">
                        {service && (
                            <img src={service.logo} alt={service.name} className="track-service-logo" />
                        )}
                        <div className="track-info">
                            <div className="track-title">{track.url}</div>
                            <div className="track-owner">by {ownerUsername}</div>
                        </div>
                        {likes && likes.length > 0 && (
                            <div className="track-likes">
                                ❤️ {likes.length}
                            </div>
                        )}
                    </li>
                );
            })}
        </ul>
    );
} 
