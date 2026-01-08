# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

# Install dependencies
RUN npm install

# Copy shared and backend source
COPY shared/ ./shared/
COPY backend/ ./backend/

# Build shared first, then backend
RUN npm run build --workspace=shared
RUN npm run build --workspace=backend

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/backend/package*.json ./backend/
COPY --from=builder /app/shared/package*.json ./shared/

# Install production dependencies only
RUN npm install --production

# Copy built files
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/shared/dist ./shared/dist

WORKDIR /app/backend

EXPOSE 3000

CMD ["node", "dist/server.js"]
