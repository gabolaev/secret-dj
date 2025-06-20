import type { PlayedTrack } from '../../common/types';

interface PlayedTracksListProps {
    playedTracks: PlayedTrack[];
}

export function PlayedTracksList({ playedTracks }: PlayedTracksListProps) {
    if (!playedTracks || playedTracks.length === 0) {
        return null;
    }

    return (
        <div className="played-tracks-list">
            <h3>Previously Played</h3>
            <ul>
                {playedTracks.map(({ track, ownerUsername }) => (
                    <li key={track.id}>
                        <span className="track-title">{track.title || track.url}</span>
                        <span className="track-owner"> by {ownerUsername}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
} 
