// Player entity
export interface Player {
    username: string;
    isAdmin: boolean;
    isConnected: boolean;
    tracks: Track[];
    trackCount?: number;
}

// Track entity
export interface Track {
    id: string; // unique identifier for the track
    url: string; // resource location (e.g., URL)
    title?: string; // optional, for display
    artist?: string; // optional artist name
    thumbnail?: string; // optional thumbnail URL
    metadataFetched?: boolean; // flag to indicate if metadata has been fetched
}

// A track that has been played
export interface PlayedTrack {
    track: Track;
    ownerUsername: string;
    discoveries: string[]; // usernames of players who discovered this track
    votes: Array<{ voter: string; guessed: string; correct: boolean }>;
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
    discoveries: Record<string, boolean>; // username -> discovered or not
    results?: {
        correctOwner: string;
        votes: Array<{ voter: string; guessed: string; correct: boolean }>;
        pointsAwarded: Record<string, number>;
        discoveryCount?: number;
        discoverers?: string[];
    };
}

export type RoundResults = NonNullable<RoundData['results']>;

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
    tracks?: Track[]; // Only sent to the player themselves
}

// Public GameState (client-safe)
export interface GameState {
    id: string;
    players: PublicPlayer[];
    gameSettings: GameSettings;
    gamePhase: GamePhase;
    currentRoundData?: {
        track: Track;
        ownerUsername?: string; // Hidden until results are shown
        results?: RoundResults;
        discoveries?: Record<string, boolean>;
        votesCast?: number;
        totalVoters?: number;
    };
    playedTrackIds: string[];
    playedTracks: PlayedTrack[];
    leaderboard: Array<{ username: string; points: number }>;
}

// New nomination types for the end of the game
export interface PlayerNominations {
    username: string;
    musicalGuide: number; // tracks discovered by others
    tasteExpert: number; // correct guesses
    discoveryOfTheYear: number; // most discoveries for a single track
    musicCollector: number; // tracks discovered by this player
}

export interface GameNominations {
    players: PlayerNominations[];
    finalLeaderboard: Array<{ username: string; points: number }>;
}
