# ==========================================
# Stage 1: Build Vue 3 Frontend with Vite
# ==========================================
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ==========================================
# Stage 2: Production Server with SQLite
# ==========================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Build tools for native better-sqlite3 compilation on alpine
RUN apk add --no-cache python3 make g++

# Install server dependencies
COPY server/package.json server/package-lock.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev

WORKDIR /app
COPY server/ ./server/
COPY --from=builder /app/dist ./dist

# Create persistent data directory for SQLite
RUN mkdir -p /app/data

VOLUME ["/app/data"]
EXPOSE 8080

CMD ["node", "server/server.js"]
