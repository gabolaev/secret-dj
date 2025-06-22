import React from 'react';
import type { PlayedTrack } from '../../common/types.js';
import { getMusicService } from './utils/musicServices';
import { shortenUrl } from './utils/string';

interface PlayedTracksListProps {
    playedTracks: PlayedTrack[];
}

export const PlayedTracksList: React.FC<PlayedTracksListProps> = ({ playedTracks }) => {

    const getTrackDisplayText = (track: PlayedTrack['track']) => {
        if (track.title) {
            return track.artist ? `${track.title} - ${track.artist}` : track.title;
        }
        return shortenUrl(track.url, 40);
    };

    if (!playedTracks || playedTracks.length === 0) {
        return (
            <div className="played-tracks-list">
                <h3>Played Tracks</h3>
                <p className="text-secondary">No tracks played yet.</p>
            </div>
        );
    }

    return (
        <div className="played-tracks-list">
            <h3>Played Tracks</h3>
            <ul className="tracks-list">
                {playedTracks.map(({ track, discoveries }) => {
                    const service = getMusicService(track.url);
                    return (
                        <li key={track.id} className="track-item">
                            <a href={track.url} target="_blank" rel="noopener noreferrer" className="track-link">
                                {service && (
                                    <img src={service.logo} alt={service.name} className="track-service-logo" />
                                )}
                                <span className="track-title">{getTrackDisplayText(track)}</span>
                                {discoveries && discoveries.length > 0 && (
                                    <span className="track-discoveries">
                                        ✨ {discoveries.length}
                                    </span>
                                )}
                            </a>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}; 
