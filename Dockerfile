# 1. Base image for installing all dependencies
FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

FROM node:18-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json .
COPY --from=builder /app/package-lock.json .
COPY --from=builder /app/common/package.json ./common/
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/frontend/package.json ./frontend/

RUN npm install --production

COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 4000

CMD ["node", "backend/dist/server.js"] 
