import type { Track } from '../../common/types';

interface MyTracksListProps {
    myTracks: Track[];
    playedTrackIds: string[];
}

export function MyTracksList({ myTracks, playedTrackIds }: MyTracksListProps) {
    if (!myTracks || myTracks.length === 0) {
        return null;
    }

    return (
        <div className="my-tracks-list">
            <h4>Your Submitted Songs</h4>
            <ul>
                {myTracks.map(track => {
                    const isPlayed = playedTrackIds.includes(track.id);
                    return (
                        <li key={track.id} className={isPlayed ? 'played' : 'upcoming'}>
                            <span className="checkbox">{isPlayed ? '✅' : '🔲'}</span>
                            <span className="track-title">{track.title || track.url}</span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
} 
