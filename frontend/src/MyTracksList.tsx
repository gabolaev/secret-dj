import type { Track } from '../../common/types';
import { getMusicService } from './utils/musicServices';

export function MyTracksList({ myTracks, playedTrackIds, showStatus }: { myTracks: Track[], playedTrackIds: string[], showStatus: boolean }) {
    if (myTracks.length === 0) {
        return <div className="text-secondary text-center">No tracks submitted yet</div>;
    }

    return (
        <ul className="tracks-list">
            {[...myTracks].reverse().map((track) => {
                const isPlayed = playedTrackIds.includes(track.id);
                const service = getMusicService(track.url);
                return (
                    <li key={track.id} className={`track-item ${isPlayed ? 'played' : ''}`}>
                        {service && <img src={service.logo} alt={service.name} className="track-service-logo" />}
                        <a href={track.url} target="_blank" rel="noopener noreferrer" className="track-title hover:underline">
                            {track.url}
                        </a>
                        {showStatus && <span className="track-status">{isPlayed ? 'Played' : 'Upcoming'}</span>}
                    </li>
                );
            })}
        </ul>
    );
} 
