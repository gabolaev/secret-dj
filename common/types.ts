// Player entity
export interface Player {
    username: string;
    isAdmin: boolean;
    isConnected: boolean;
    tracks: Track[];
}

// Track entity
export interface Track {
    id: string; // unique identifier for the track
    url: string; // resource location (e.g., URL)
    title?: string; // optional, for display
}

// A track that has been played
export interface PlayedTrack {
    track: Track;
    ownerUsername: string;
    likes: string[]; // usernames of players who liked this track
}

// Game settings
export interface GameSettings {
    tracksPerPlayer: number;
}

// Game phases
export type GamePhase =
    | 'Lobby'
    | 'RoundInProgress'
    | 'VotesTallied'
    | 'RoundResults'
    | 'AwaitingNextRound'
    | 'GameFinished';

// Round data
export interface RoundData {
    track: Track;
    ownerUsername: string;
    votes: Record<string, string>; // voterUsername -> guessedOwnerUsername
    likes: Record<string, boolean>; // username -> liked or not
    results?: {
        correctOwner: string;
        votes: Array<{ voter: string; guessed: string; correct: boolean }>;
        pointsAwarded: Record<string, number>;
        likeCount?: number;
        likers?: string[];
    };
}

// Game entity
export interface Game {
    id: string;
    players: Record<string, Player>; // keyed by username
    gameSettings: GameSettings;
    gamePhase: GamePhase;
    currentRoundData?: RoundData;
    playedTrackIds: Set<string>;
    playedTracks: PlayedTrack[]; // a log of tracks that have been fully played
    leaderboard?: Record<string, number>;
}

// The public-facing player object, safe to send to clients.
// It omits the full track list unless it's being sent to the track owner.
export interface PublicPlayer {
    username: string;
    isAdmin: boolean;
    isConnected: boolean;
    ready: boolean;
    trackCount: number;
    tracks?: Track[]; // Only sent to the player who submitted them
}

// Public GameState (client-safe)
export interface GameState {
    id: string;
    players: PublicPlayer[];
    gameSettings: GameSettings;
    gamePhase: GamePhase;
    currentRoundData?: Omit<RoundData, 'ownerUsername'> & { ownerUsername?: string }; // ownerUsername only revealed in results
    playedTrackIds: string[];
    playedTracks: PlayedTrack[];
    leaderboard: Array<{ username: string; points: number }>;
}
