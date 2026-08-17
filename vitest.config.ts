import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            // Tests run against the sources, so a failing test points at a line
            // you can edit rather than at generated output.
            '@secret-dj/common': new URL('./common/src/index.ts', import.meta.url).pathname,
        },
    },
    test: {
        include: ['{common,backend,frontend}/test/**/*.test.{ts,tsx}'],
        // Node by default; component tests opt into jsdom with a file pragma.
        environment: 'node',
        globals: false,
        css: false,
    },
});
