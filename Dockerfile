# syntax=docker/dockerfile:1

# --- build ------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Copy manifests first so `npm ci` is cached independently of source changes.
COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./
COPY common/package.json common/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci

COPY . .
RUN npm run build && npm run test

# --- runtime ----------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY package.json package-lock.json ./
COPY common/package.json common/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
# `npm ci` recreates the workspace symlink for @secret-dj/common, which the
# compiled backend imports by package name.
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build /app/common/dist   ./common/dist
COPY --from=build /app/backend/dist  ./backend/dist
COPY --from=build /app/frontend/dist ./frontend/dist

USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "backend/dist/server.js"]
