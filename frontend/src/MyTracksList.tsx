import type { Track } from '../../common/types';
import { getMusicService } from './utils/musicServices';
import { shortenUrl } from './utils/string';

export function MyTracksList({ myTracks, playedTrackIds }: { myTracks: Track[], playedTrackIds: string[] }) {
    return (
        <ul className="tracks-list">
            {myTracks.map((track) => {
                const isPlayed = playedTrackIds.includes(track.id);
                const service = getMusicService(track.url);

                return (
                    <li key={track.id} className={`track-item ${isPlayed ? 'played' : ''}`}>
                        <a href={track.url} target="_blank" rel="noopener noreferrer" className="track-link">
                            {service && <img src={service.logo} alt={service.name} className="track-service-logo" />}
                            <span className="track-title">{shortenUrl(track.url, 40)}</span>
                        </a>
                    </li>
                );
            })}
        </ul>
    );
} 
