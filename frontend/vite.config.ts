import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const BACKEND = process.env.BACKEND_ORIGIN ?? 'http://localhost:4000';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        // v1 had no proxy, so every `/api/...` call from the dev server 404'd and
        // metadata previews silently never worked outside production.
        proxy: {
            '/api': { target: BACKEND, changeOrigin: true },
            '/socket.io': { target: BACKEND, ws: true, changeOrigin: true },
        },
    },
    optimizeDeps: {
        // Workspace package: let Vite read it straight from the built output
        // instead of pre-bundling a stale copy.
        exclude: ['@secret-dj/common'],
    },
    build: {
        target: 'es2022',
        sourcemap: true,
    },
});
