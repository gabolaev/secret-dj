import React from 'react';
import type { PlayedTrack } from '../../common/types.js';
import { getMusicService } from './utils/musicServices';
import { shortenUrl } from './utils/string';

interface PlayedTracksListProps {
    playedTracks: PlayedTrack[];
    currentUsername: string;
}

export const PlayedTracksList: React.FC<PlayedTracksListProps> = ({ playedTracks, currentUsername }) => {

    const getTrackDisplayText = (track: PlayedTrack['track']) => {
        if (track.title) {
            return track.artist ? `${track.title} - ${track.artist}` : track.title;
        }
        return shortenUrl(track.url, 40);
    };

    if (!playedTracks || playedTracks.length === 0) {
        return (
            <div className="played-tracks-list">
                <p className="text-secondary">No tracks played yet.</p>
            </div>
        );
    }

    return (
        <div className="played-tracks-list">
            <ul className="tracks-list">
                {playedTracks.map(({ track, likes }) => {
                    const service = getMusicService(track.url);
                    const isLiked = likes?.includes(currentUsername);
                    return (
                        <li key={track.id} className={`track-item${isLiked ? ' liked' : ''}`}>
                            <a href={track.url} target="_blank" rel="noopener noreferrer" className="track-link">
                                {service && (
                                    <img src={service.logo} alt={service.name} className="track-service-logo" />
                                )}
                                <span className="track-title">{getTrackDisplayText(track)}</span>
                                {isLiked && (
                                    <span className="track-liked" title="You liked this track" style={{marginLeft: 8}}>❤️</span>
                                )}
                            </a>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}; 
