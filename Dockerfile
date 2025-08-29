# Multi-stage build for Google Cloud Run - Healthcare optimized
FROM node:20-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY drizzle.config.ts ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application (frontend only, backend uses tsx)
RUN npm run build

# Production stage
FROM node:20-slim AS production

# Install production dependencies only
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r kgc && useradd -r -g kgc kgc

# Set working directory
WORKDIR /app

# Copy package files for production install
COPY package*.json ./
COPY tsconfig*.json ./
COPY drizzle.config.ts ./

# Install ALL dependencies (needed for tsx runtime)
RUN npm ci && npm cache clean --force

# Copy entire application (TypeScript source + built frontend)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/client ./client
COPY --from=builder /app/attached_assets ./attached_assets

# Create necessary directories and set permissions
RUN mkdir -p /app/logs && chown -R kgc:kgc /app

# Switch to non-root user for security
USER kgc

# Expose port (Google Cloud Run uses PORT environment variable)
EXPOSE 8080

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "const http = require('http'); const options = { hostname: 'localhost', port: process.env.PORT || 8080, path: '/api/health', timeout: 5000 }; const req = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.end();"

# Use tsx for TypeScript execution in production
CMD ["npx", "tsx", "server/index.ts"]