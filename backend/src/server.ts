import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { GameManager } from './gameManager.js';
import { GameState, GameSettings } from '../../common/types.js';
import { TrackMetadataService } from './trackMetadataService.js';
import fetch from 'node-fetch';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());

// --- API Routes ---
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Track metadata endpoint
app.get('/api/track-metadata', async (req, res) => {
    const url = req.query.url;

    if (typeof url !== 'string') {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
        const metadataService = TrackMetadataService.getInstance();
        const metadata = await metadataService.getTrackMetadata(url);

        if (metadata) {
            res.json(metadata);
        } else {
            res.status(404).json({ error: 'Could not fetch metadata for this URL' });
        }
    } catch (error) {
        console.error('Error fetching track metadata:', error);
        res.status(500).json({ error: 'Failed to fetch track metadata' });
    }
});

// URL resolution endpoint
app.get('/api/resolve-url', async (req, res) => {
    const url = req.query.url;

    if (typeof url !== 'string') {
        return res.status(400).json({ error: 'URL parameter is required' });
    }

    try {
        // Follow redirects to get the final URL
        const response = await fetch(url, { 
            method: 'HEAD', 
            redirect: 'follow',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SecretDJ/1.0)'
            }
        });

        if (response.ok) {
            res.json({ resolvedUrl: response.url });
        } else {
            res.status(404).json({ error: 'Could not resolve URL' });
        }
    } catch (error) {
        console.error('Error resolving URL:', error);
        res.status(500).json({ error: 'Failed to resolve URL' });
    }
});

// --- Production-only: Serve static frontend ---
if (process.env.NODE_ENV === 'production') {
    const __dirname = path.resolve();
    const frontendDistPath = path.join(__dirname, 'frontend', 'dist');

    // Serve static files from the React app
    app.use(express.static(frontendDistPath));

    app.get('/resolve-url', async (req, res) => {
        const urlToResolve = req.query.url;

        if (typeof urlToResolve !== 'string') {
            return res.status(400).json({ error: 'URL parameter is missing or invalid.' });
        }

        try {
            const response = await fetch(urlToResolve, { redirect: 'follow' });
            res.json({ resolvedUrl: response.url });
        } catch (error) {
            console.error('Error resolving URL:', error);
            res.status(500).json({ error: 'Failed to resolve URL.' });
        }
    });

    // The "catchall" handler: for any request that doesn't
    // match one above, send back React's index.html file.
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
}
// ---------------------------------------------

const PORT = process.env.PORT || 4000;
const gameManager = new GameManager();

function log(...args: any[]) {
    console.log('[Server]', ...args);
}

function emitGameState(gameId: string) {
    const roomSockets = io.sockets.adapter.rooms.get(gameId);
    if (!roomSockets) return;

    for (const socketId of roomSockets) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket && socket.data.username) {
            const personalizedGameState = gameManager.getGameState(gameId, socket.data.username);
            if (personalizedGameState) {
                socket.emit('gameState', personalizedGameState);
                console.log(`[Server] Emitted personalized gameState to ${socket.data.username} (${socket.id})`);
            }
        }
    }
}

io.on('connection', (socket: Socket) => {
    log(`Socket connected: ${socket.id}`);

    // Create game
    socket.on('createGame', (
        data: { username: string; settings: any },
        cb: (result: any) => void
    ) => {
        const { username, settings } = data;
        try {
            const game = gameManager.createGame(username, settings);
            socket.join(game.id);
            socket.data.username = username;
            gameManager.socketToUsername.set(socket.id, { gameId: game.id, username });
            emitGameState(game.id);
            cb({ success: true, gameId: game.id });
            log(`Game created by ${username} (${socket.id})`);
        } catch (err) {
            log('Error creating game:', err);
            cb({ success: false, error: 'Failed to create game' });
        }
    });

    // Join game
    socket.on('joinGame', (
        data: { gameId: string; username: string },
        cb: (result: any) => void
    ) => {
        const { gameId, username } = data;
        try {
            const game = gameManager.joinGame(gameId, username);
            if (!game) {
                cb({ success: false, error: 'Game not found' });
                return;
            }
            socket.join(gameId);
            socket.data.username = username;
            gameManager.socketToUsername.set(socket.id, { gameId, username });
            emitGameState(gameId);
            cb({ success: true });
            log(`Player ${username} joined game ${gameId} (${socket.id})`);
        } catch (err) {
            log('Error joining game:', err);
            cb({ success: false, error: 'Failed to join game' });
        }
    });

    // Reconnect
    socket.on('reconnectPlayer', (
        data: { gameId: string; username: string },
        cb: (result: any) => void
    ) => {
        const { gameId, username } = data;
        try {
            gameManager.reconnectPlayer(gameId, username);
            socket.join(gameId);
            socket.data.username = username;
            gameManager.socketToUsername.set(socket.id, { gameId, username });
            emitGameState(gameId);
            cb({ success: true });
            log(`Player ${username} reconnected to game ${gameId} (${socket.id})`);
        } catch (err) {
            log('Error reconnecting player:', err);
            cb({ success: false, error: 'Failed to reconnect' });
        }
    });

    // Leave game
    socket.on('leaveGame', (
        data: { gameId: string; username: string },
        cb: (result: any) => void
    ) => {
        const { gameId, username } = data;
        try {
            gameManager.removePlayer(gameId, username);
            socket.leave(gameId);
            gameManager.socketToUsername.delete(socket.id);
            emitGameState(gameId);
            cb({ success: true });
            log(`Player ${username} left game ${gameId} (${socket.id})`);
        } catch (err) {
            log('Error leaving game:', err);
            cb({ success: false, error: 'Failed to leave game' });
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        const info = gameManager.socketToUsername.get(socket.id);
        if (info) {
            gameManager.disconnectPlayer(info.gameId, info.username);
            emitGameState(info.gameId);
            log(`Player ${info.username} disconnected from game ${info.gameId} (${socket.id})`);
            gameManager.socketToUsername.delete(socket.id);
        } else {
            log(`Socket disconnected: ${socket.id} (no game info)`);
        }
    });

    // Submit track
    socket.on('submitTrack', async ({ gameId, username, track }, cb) => {
        try {
            const ok = await gameManager.submitTrack(gameId, username, track);
            if (ok) {
                emitGameState(gameId);
                cb({ success: true });
                log(`Track submitted by ${username} in game ${gameId}`);
            } else {
                cb({ success: false, error: 'Failed to submit track' });
                log(`Track submission failed for ${username} in game ${gameId}`);
            }
        } catch (err) {
            log('Error submitting track:', err);
            cb({ success: false, error: 'Failed to submit track' });
        }
    });

    // Remove track
    socket.on('removeTrack', ({ gameId, username, trackId }, cb) => {
        try {
            const ok = gameManager.removeTrack(gameId, username, trackId);
            if (ok) {
                emitGameState(gameId);
                cb({ success: true });
                log(`Track removed by ${username} in game ${gameId}`);
            } else {
                cb({ success: false, error: 'Failed to remove track' });
                log(`Track removal failed for ${username} in game ${gameId}`);
            }
        } catch (err) {
            log('Error removing track:', err);
            cb({ success: false, error: 'Failed to remove track' });
        }
    });

    // Admin starts the game
    socket.on('startGame', (
        data: { gameId: string; username: string },
        cb: (result: any) => void
    ) => {
        const { gameId, username } = data;
        try {
            const ok = gameManager.startGame(gameId, username);
            if (ok) {
                emitGameState(gameId);
                cb({ success: true });
                log(`Game started by ${username} in game ${gameId}`);
            } else {
                cb({ success: false, error: 'Failed to start game' });
                log(`Game start failed for ${username} in game ${gameId}`);
            }
        } catch (err) {
            log('Error starting game:', err);
            cb({ success: false, error: 'Failed to start game' });
        }
    });

    // Add this inside io.on('connection', ...) after other handlers
    socket.on('getGameState', (
        data: { gameId: string },
        cb: (result: any) => void
    ) => {
        const { gameId } = data;
        const info = gameManager.socketToUsername.get(socket.id);
        const state = gameManager.getGameState(gameId, info?.username);
        log('Manual getGameState request from', socket.id, 'for game', gameId, '->', state);
        cb({ state });
    });

    // Add this after other handlers
    socket.on('vote', (
        data: { gameId: string; username: string; voteFor: string },
        cb: (result: any) => void
    ) => {
        const { gameId, username, voteFor } = data;
        log('vote event received:', { gameId, username, voteFor });
        const ok = gameManager.submitVote(gameId, username, voteFor);
        if (ok) {
            emitGameState(gameId);
            cb({ success: true });
        } else {
            cb({ success: false, error: 'Failed to submit vote' });
        }
    });

    socket.on('revealResults', (
        data: { gameId: string; username: string },
        cb: (result: any) => void
    ) => {
        const { gameId, username } = data;
        log('revealResults event received:', { gameId, username });
        const ok = gameManager.revealResults(gameId);
        if (ok) {
            emitGameState(gameId);
            cb({ success: true });
        } else {
            cb({ success: false, error: 'Failed to reveal results' });
        }
    });

    socket.on('nextRound', (
        data: { gameId: string; username: string },
        cb: (result: any) => void
    ) => {
        const { gameId, username } = data;
        log('nextRound event received:', { gameId, username });
        const ok = gameManager.nextRound(gameId);
        if (ok) {
            emitGameState(gameId);
            cb({ success: true });
        } else {
            cb({ success: false, error: 'Failed to start next round' });
        }
    });

    socket.on('changeGameSetting', (
        data: { gameId: string; username: string; newSettings: any },
        cb: (result: any) => void
    ) => {
        const { gameId, username, newSettings } = data;
        try {
            const ok = gameManager.changeGameSetting(gameId, username, newSettings);
            if (ok) {
                emitGameState(gameId);
                cb({ success: true });
            } else {
                cb({ success: false, error: 'Failed to change setting' });
            }
        } catch (err) {
            log('Error changing game setting:', err);
            cb({ success: false, error: 'Failed to change setting' });
        }
    });

    // Like track
    socket.on('likeTrack', (
        data: { gameId: string; username: string },
        cb: (result: any) => void
    ) => {
        const { gameId, username } = data;
        log('likeTrack event received:', { gameId, username });
        const ok = gameManager.likeTrack(gameId, username);
        if (ok) {
            emitGameState(gameId);
            cb({ success: true });
        } else {
            cb({ success: false, error: 'Failed to like track' });
        }
    });

    // Get game nominations
    socket.on('getGameNominations', (
        data: { gameId: string },
        cb: (result: any) => void
    ) => {
        const { gameId } = data;
        log('getGameNominations event received:', { gameId });
        const nominations = gameManager.getGameNominations(gameId);
        if (nominations) {
            cb({ success: true, nominations });
        } else {
            cb({ success: false, error: 'Failed to get nominations' });
        }
    });
});

server.listen(PORT, () => {
    log(`Server listening on port ${PORT}`);
});
