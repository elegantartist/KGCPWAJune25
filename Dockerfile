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
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
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

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Create necessary directories and set permissions
RUN mkdir -p /app/logs && chown -R kgc:kgc /app

# Switch to non-root user for security
USER kgc

# Expose port (Google Cloud Run uses PORT environment variable)
EXPOSE 8080

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "const http = require('http'); const options = { hostname: 'localhost', port: process.env.PORT || 8080, path: '/api/health', timeout: 5000 }; const req = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.end();"

# Use production-optimized startup command
CMD ["node", "dist/index.js"]