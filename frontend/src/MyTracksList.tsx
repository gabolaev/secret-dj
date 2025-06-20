import type { Track } from '../../common/types';
import { getMusicService } from './utils/musicServices';

interface MyTracksListProps {
    myTracks: Track[];
    playedTrackIds: string[];
}

export function MyTracksList({ myTracks, playedTrackIds }: MyTracksListProps) {
    if (!myTracks || myTracks.length === 0) {
        return (
            <div className="text-center text-secondary">
                <p>No tracks submitted yet</p>
            </div>
        );
    }

    return (
        <ul className="tracks-list">
            {myTracks.map(track => {
                const isPlayed = playedTrackIds.includes(track.id);
                const service = getMusicService(track.url);
                return (
                    <li key={track.id} className={`track-item ${isPlayed ? 'played' : ''}`}>
                        {service && (
                            <img src={service.logo} alt={service.name} className="track-service-logo" />
                        )}
                        <div className="track-info">
                            <div className="track-title">{track.url}</div>
                            <div className="track-status">
                                {isPlayed ? 'Played' : 'Upcoming'}
                            </div>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
} 
