# 1. Base image for installing all dependencies
FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

# 2. Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy all package.json and package-lock.json files
COPY --from=builder /app/package.json .
COPY --from=builder /app/package-lock.json .
COPY --from=builder /app/common/package.json ./common/
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/frontend/package.json ./frontend/

# Install production dependencies
RUN npm install --production

# Copy build artifacts
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 4000

# Start the server
CMD ["node", "backend/dist/server.js"] 
