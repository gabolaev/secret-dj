import {
    Game,
    Player,
    GameSettings,
    GamePhase,
    Track,
    GameState,
    RoundData,
    PublicPlayer,
    PlayerNominations,
    GameNominations,
} from '../../common/types.js';
import { TrackMetadataService } from './trackMetadataService.js';

// Helper for logging
function log(...args: any[]) {
    console.log('[GameManager]', ...args);
}

export class GameManager {
    private games: Map<string, Game> = new Map();
    public socketToUsername: Map<string, { gameId: string; username: string }> = new Map();

    // Create a new game lobby
    createGame(adminUsername: string, settings: GameSettings): Game {
        const gameId = this.generateGameId();
        const admin: Player = {
            username: adminUsername,
            isAdmin: true,
            isConnected: true,
            tracks: [],
        };
        const game: Game = {
            id: gameId,
            players: { [adminUsername]: admin },
            gameSettings: settings,
            gamePhase: 'Lobby',
            playedTrackIds: new Set(),
            playedTracks: [],
            leaderboard: {},
        };
        this.games.set(gameId, game);
        log(`Created game ${gameId} with admin ${adminUsername}`);
        return game;
    }

    // Join an existing game
    joinGame(gameId: string, username: string): Game | null {
        const game = this.games.get(gameId);
        if (!game) return null;
        if (game.players[username]) {
            // Player rejoining
            game.players[username].isConnected = true;
            log(`Player ${username} reconnected to game ${gameId}`);
        } else {
            // New player
            game.players[username] = {
                username,
                isAdmin: false,
                isConnected: true,
                tracks: [],
            };
            log(`Player ${username} joined game ${gameId}`);
        }
        return game;
    }

    // Remove a player (e.g., on leave)
    removePlayer(gameId: string, username: string): void {
        const game = this.games.get(gameId);
        if (!game) return;
        const wasAdmin = game.players[username]?.isAdmin;
        delete game.players[username];
        log(`Player ${username} removed from game ${gameId}`);
        // If admin left, pick a new admin randomly
        if (wasAdmin) {
            const remaining = Object.values(game.players);
            if (remaining.length > 0) {
                const newAdmin = remaining[Math.floor(Math.random() * remaining.length)] as Player;
                newAdmin.isAdmin = true;
                log(`Admin left. New admin is ${newAdmin.username}`);
            }
        }
    }

    // Handle disconnect (do not remove player)
    disconnectPlayer(gameId: string, username: string): void {
        const game = this.games.get(gameId);
        if (!game) return;
        if (game.players[username]) {
            game.players[username].isConnected = false;
            log(`Player ${username} disconnected from game ${gameId}`);
        }
    }

    // Handle reconnect
    reconnectPlayer(gameId: string, username: string): void {
        log('reconnectPlayer called with:', { gameId, username });
        const game = this.games.get(gameId);
        if (!game) return;
        if (game.players[username]) {
            game.players[username].isConnected = true;
            log(`Player ${username} reconnected to game ${gameId}`);
        }
    }

    // Utility to generate a human-readable game ID
    private generateGameId(): string {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    // Get game by ID
    getGame(gameId: string): Game | undefined {
        return this.games.get(gameId);
    }

    // Convert internal Game to public GameState
    getGameState(gameId: string, perspectiveOf?: string): GameState | null {
        const game = this.games.get(gameId);
        if (!game) return null;

        const players = Object.values(game.players).map(p => this.getPublicPlayer(p, game, perspectiveOf));

        let currentRoundDataForPlayer: GameState['currentRoundData'] | undefined = undefined;

        if (game.currentRoundData) {
            const { ownerUsername, likes, votes, ...restOfRoundData } = game.currentRoundData;
            currentRoundDataForPlayer = { ...restOfRoundData };

            // Add voting progress
            if (game.gamePhase === 'RoundInProgress') {
                currentRoundDataForPlayer.votesCast = Object.keys(votes).length;
                currentRoundDataForPlayer.totalVoters = Object.keys(game.players).length - 1;
            }

            const isOwner = perspectiveOf === ownerUsername;
            const resultsAreOut = game.gamePhase === 'RoundResults';

            currentRoundDataForPlayer.likes = likes; // Always send likes

            if (isOwner || resultsAreOut) {
                currentRoundDataForPlayer.ownerUsername = ownerUsername;
            }
        }

        return {
            id: game.id,
            players: players,
            gameSettings: game.gameSettings,
            gamePhase: game.gamePhase,
            currentRoundData: currentRoundDataForPlayer,
            playedTrackIds: Array.from(game.playedTrackIds),
            playedTracks: game.playedTracks,
            leaderboard: this.getLeaderboard(game)
        };
    }

    private getPublicPlayer(player: Player, game: Game, perspectiveOf?: string): PublicPlayer {
        const isSelf = player.username === perspectiveOf;
        return {
            username: player.username,
            isAdmin: player.isAdmin,
            isConnected: player.isConnected,
            ready: player.tracks.length >= game.gameSettings.tracksPerPlayer,
            trackCount: player.tracks.length,
            ...(isSelf && { tracks: player.tracks }),
        };
    }

    private getLeaderboard(game: Game): Array<{ username: string, points: number }> {
        const leaderboard = game.leaderboard || {};
        return Object.keys(game.players).map(username => ({
            username,
            points: leaderboard[username] || 0,
        }));
    }

    // Player submits a track
    async submitTrack(gameId: string, username: string, track: Track): Promise<boolean> {
        log('submitTrack called with:', { gameId, username, track });
        const game = this.games.get(gameId);
        if (!game) return false;
        const player = game.players[username];
        if (!player) return false;
        // Prevent duplicate tracks by id
        if (player.tracks.some((t: Track) => t.id === track.id)) {
            log(`Duplicate track submission by ${username} in game ${gameId}`);
            return false;
        }

        // Add track immediately
        player.tracks.push(track);
        log(`Player ${username} submitted a track to game ${gameId}`);

        // Fetch metadata asynchronously
        this.fetchTrackMetadata(gameId, username, track.id).catch(error => {
            log(`Error fetching metadata for track ${track.id}:`, error);
        });

        return true;
    }

    // Player removes a track
    removeTrack(gameId: string, username: string, trackId: string): boolean {
        const game = this.games.get(gameId);
        if (!game) return false;
        const player = game.players[username];
        if (!player) return false;
        const trackIndex = player.tracks.findIndex((t: Track) => t.id === trackId);
        if (trackIndex === -1) return false;
        player.tracks.splice(trackIndex, 1);
        log(`Player ${username} removed a track from game ${gameId}`);
        return true;
    }

    // Fetch metadata for a track
    private async fetchTrackMetadata(gameId: string, username: string, trackId: string): Promise<void> {
        const game = this.games.get(gameId);
        if (!game) return;
        const player = game.players[username];
        if (!player) return;
        const track = player.tracks.find((t: Track) => t.id === trackId);
        if (!track || track.metadataFetched) return;

        try {
            const metadataService = TrackMetadataService.getInstance();
            const metadata = await metadataService.getTrackMetadata(track.url);

            if (metadata) {
                track.title = metadata.title;
                track.artist = metadata.artist;
                track.thumbnail = metadata.thumbnail;
                track.metadataFetched = true;
                log(`Metadata fetched for track ${trackId}: ${metadata.title}`);
            }
        } catch (error) {
            log(`Failed to fetch metadata for track ${trackId}:`, error);
        }
    }

    // Admin changes a game setting
    changeGameSetting(gameId: string, username: string, newSettings: Partial<GameSettings>): boolean {
        const game = this.games.get(gameId);
        if (!game) return false;
        const player = game.players[username];
        if (!player || !player.isAdmin) {
            log(`Unauthorized settings change attempt by ${username} in game ${gameId}`);
            return false;
        }
        // Only allow changes in Lobby phase
        if (game.gamePhase !== 'Lobby') {
            log(`Settings change not allowed outside Lobby phase in game ${gameId}`);
            return false;
        }
        game.gameSettings = { ...game.gameSettings, ...newSettings };
        log(`Admin ${username} changed settings in game ${gameId}`);
        return true;
    }

    // Admin starts the game
    startGame(gameId: string, username: string): boolean {
        const game = this.games.get(gameId);
        if (!game) return false;
        const player = game.players[username];
        if (!player || !player.isAdmin) {
            log(`Unauthorized game start attempt by ${username} in game ${gameId}`);
            return false;
        }
        // All players must be ready
        const allReady = Object.values(game.players).every(
            (p: Player) => p.tracks.length >= game.gameSettings.tracksPerPlayer
        );
        if (!allReady) {
            log(`Not all players are ready in game ${gameId}`);
            return false;
        }
        game.gamePhase = 'RoundInProgress';
        this.beginRound(gameId);
        log(`Game started by admin ${username} in game ${gameId}`);
        return true;
    }

    // Begin a new round
    beginRound(gameId: string): boolean {
        const game = this.games.get(gameId);
        if (!game) return false;
        // Gather all unplayed tracks
        const allTracks: { track: Track; owner: string }[] = [];
        for (const player of Object.values(game.players)) {
            for (const track of player.tracks) {
                if (!game.playedTrackIds.has(track.id)) {
                    allTracks.push({ track, owner: player.username });
                }
            }
        }
        if (allTracks.length === 0) {
            game.gamePhase = 'GameFinished';
            return true;
        }
        // Randomly select a track
        const { track, owner } = allTracks[Math.floor(Math.random() * allTracks.length)];
        game.currentRoundData = {
            track,
            ownerUsername: owner,
            votes: {},
            likes: {}, // initialize likes for this round
        };
        game.playedTrackIds.add(track.id);
        game.gamePhase = 'RoundInProgress';
        log(`New round started in game ${gameId} with track ${track.id}`);
        return true;
    }

    // Player likes the current track
    likeTrack(gameId: string, username: string): boolean {
        const game = this.games.get(gameId);
        if (!game || !game.currentRoundData) return false;
        // Owner cannot like their own track
        if (username === game.currentRoundData.ownerUsername) return false;
        // Only allow liking if in RoundInProgress
        if (game.gamePhase !== 'RoundInProgress') return false;

        if (game.currentRoundData.likes[username]) {
            delete game.currentRoundData.likes[username];
            log(`Player ${username} unliked a track in game ${gameId}`);
        } else {
            game.currentRoundData.likes[username] = true;
            log(`Player ${username} liked a track in game ${gameId}`);
        }
        return true;
    }

    // Player submits a vote
    submitVote(gameId: string, username: string, voteFor: string): boolean {
        const game = this.games.get(gameId);
        if (!game || !game.currentRoundData) return false;
        // Prevent voting for yourself
        if (username === voteFor) return false;
        // Only allow voting if in RoundInProgress
        if (game.gamePhase !== 'RoundInProgress') return false;
        // Record the vote
        game.currentRoundData.votes[username] = voteFor;
        // Check if all eligible players have voted (not the track owner)
        const owner = game.currentRoundData.ownerUsername;
        const eligibleVoters = Object.keys(game.players).filter(u => u !== owner);
        const allVoted = eligibleVoters.every(u => game.currentRoundData!.votes[u]);
        if (allVoted) {
            game.gamePhase = 'VotesTallied';
        }
        return true;
    }

    // Reveal results for the round
    revealResults(gameId: string): boolean {
        const game = this.games.get(gameId);
        if (!game || !game.currentRoundData) return false;
        if (game.gamePhase !== 'VotesTallied') return false;
        const { ownerUsername, votes, track, likes } = game.currentRoundData;
        if (!ownerUsername) return false;
        // Tally results
        const results = {
            correctOwner: ownerUsername,
            votes: [] as Array<{ voter: string; guessed: string; correct: boolean }>,
            pointsAwarded: {} as Record<string, number>,
            likeCount: Object.keys(likes || {}).length,
            likers: Object.keys(likes || {}),
        };
        for (const [voter, guessed] of Object.entries(votes)) {
            const correct = guessed === ownerUsername;
            results.votes.push({ voter, guessed: guessed as string, correct });
            // Award 1 point for correct guess
            if (correct) {
                if (!game.leaderboard) game.leaderboard = {};
                game.leaderboard[voter] = (game.leaderboard[voter] || 0) + 1;
                results.pointsAwarded[voter] = (results.pointsAwarded[voter] || 0) + 1;
            }
        }
        // Owner gets points for each like (new scoring system)
        const likeCount = Object.keys(likes || {}).length;
        if (likeCount > 0) {
            if (!game.leaderboard) game.leaderboard = {};
            game.leaderboard[ownerUsername] = (game.leaderboard[ownerUsername] || 0) + likeCount;
            results.pointsAwarded[ownerUsername] = (results.pointsAwarded[ownerUsername] || 0) + likeCount;
        }
        game.currentRoundData.results = results;
        game.gamePhase = 'RoundResults';

        // Add to played tracks log
        game.playedTracks.push({
            track,
            ownerUsername,
            likes: Object.keys(likes || {}),
            votes: results.votes,
        });

        log(`Results revealed for round in game ${gameId}`);
        return true;
    }

    // Start next round or finish game
    nextRound(gameId: string): boolean {
        const game = this.games.get(gameId);
        if (!game) return false;
        // If there are unplayed tracks, start next round
        const allTracks: { track: Track; owner: string }[] = [];
        for (const player of Object.values(game.players)) {
            for (const track of player.tracks) {
                if (!game.playedTrackIds.has(track.id)) {
                    allTracks.push({ track, owner: player.username });
                }
            }
        }
        if (allTracks.length > 0) {
            this.beginRound(gameId);
            return true;
        } else {
            game.gamePhase = 'GameFinished';
            log(`Game finished in game ${gameId}`);
            return true;
        }
    }

    // Get final nominations and leaderboard
    getGameNominations(gameId: string): GameNominations | null {
        const game = this.games.get(gameId);
        if (!game || game.gamePhase !== 'GameFinished') return null;

        const playerNominations: PlayerNominations[] = [];
        const usernames = Object.keys(game.players);

        for (const username of usernames) {
            const nominations: PlayerNominations = {
                username,
                mostLiked: 0, // tracks liked by others
                tasteExpert: 0, // correct guesses
                mostLikedTrack: 0, // most likes for a single track (placeholder, calculated below)
                musicCollector: 0, // tracks liked by this player
                mysteryMaster: 0, // times this player successfully hid their identity (lower is better)
            };

            const tracksByThisPlayer = game.playedTracks.filter(pt => pt.ownerUsername === username);

            // Most Liked: total likes on user's tracks
            nominations.mostLiked = tracksByThisPlayer.reduce((acc, pt) => acc + (pt.likes?.length || 0), 0);

            // Taste Expert: total correct guesses made by the user
            let correctGuesses = 0;
            for (const round of game.playedTracks) {
                const myVote = round.votes.find(v => v.voter === username);
                if (myVote && myVote.correct) {
                    correctGuesses++;
                }
            }
            nominations.tasteExpert = correctGuesses;

            // Music Collector: tracks this player liked
            const likesByThisPlayer = game.playedTracks.filter(pt => pt.likes?.includes(username));
            nominations.musicCollector = likesByThisPlayer.length;

            // Mystery Master: times this player successfully hid their identity (lower is better)
            let hiddenCount = 0;
            for (const round of game.playedTracks) {
                if (round.ownerUsername === username) {
                    for (const vote of round.votes) {
                        if (vote.guessed !== username) {
                            hiddenCount++;
                        }
                    }
                }
            }
            nominations.mysteryMaster = hiddenCount;

            playerNominations.push(nominations);
        }

        // Most Liked Track is calculated globally across all tracks
        const allPlayedTracks = game.playedTracks;
        if (allPlayedTracks.length > 0) {
            const topTrack = allPlayedTracks.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))[0];
            const winnerUsername = topTrack.ownerUsername;
            const winnerNomination = playerNominations.find(p => p.username === winnerUsername);
            if (winnerNomination) {
                // We use the nomination value to store the number of likes for the top track
                winnerNomination.mostLikedTrack = topTrack.likes.length;
            }
        }

        return {
            players: playerNominations,
            finalLeaderboard: this.getLeaderboard(game)
        };
    }

    // Add more methods for game flow, track submission, voting, etc.
}
