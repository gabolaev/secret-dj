/**
 * Process entry point. Wiring only — every decision lives in a module that can
 * be tested without opening a socket.
 */
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { createApiRouter } from './http/routes.js';
import { GameStore } from './game/store.js';
import { MetadataService } from './services/metadata.js';
import { attachGateway, type GameServer } from './realtime/gateway.js';
import { logger } from './logger.js';

const log = logger('server');

const PORT = Number(process.env.PORT ?? 4000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Comma-separated list of allowed browser origins. Defaults to "anything" in
 * development and to same-origin in production, where the API and the built
 * frontend are served by this very process.
 */
const CORS_ORIGIN = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(value => value.trim())
    : IS_PRODUCTION
      ? false
      : true;

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '32kb' }));

const store = new GameStore();
const metadata = new MetadataService();

app.use('/api', createApiRouter(metadata));

if (IS_PRODUCTION) {
    // dist/server.js -> ../../frontend/dist
    const here = path.dirname(fileURLToPath(import.meta.url));
    const frontendDist = process.env.FRONTEND_DIST ?? path.resolve(here, '../../frontend/dist');

    app.use(express.static(frontendDist, { maxAge: '1h', index: false }));
    // Single-page app fallback, but never for /api — a typo there should 404,
    // not silently return index.html (which is what v1 did).
    app.get(/^\/(?!api\/).*/, (_req, res) => {
        res.sendFile(path.join(frontendDist, 'index.html'));
    });
    log.info(`serving frontend from ${frontendDist}`);
}

const httpServer = createServer(app);
const io: GameServer = new Server(httpServer, {
    cors: { origin: CORS_ORIGIN === false ? false : CORS_ORIGIN, methods: ['GET', 'POST'] },
    // Games are chatty but tiny; a small payload cap is free abuse protection.
    maxHttpBufferSize: 64 * 1024,
    pingInterval: 20_000,
    pingTimeout: 25_000,
});

const stopGateway = attachGateway({ io, store, metadata });

httpServer.listen(PORT, () => {
    log.info(`Secret DJ v2 listening on :${PORT} (${IS_PRODUCTION ? 'production' : 'development'})`);
});

function shutdown(signal: string): void {
    log.info(`${signal} received, shutting down`);
    stopGateway();
    io.close(() => {
        httpServer.close(() => process.exit(0));
    });
    // Don't let a wedged socket keep the process alive forever.
    setTimeout(() => process.exit(0), 5_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', reason => log.error('unhandled rejection', reason));
