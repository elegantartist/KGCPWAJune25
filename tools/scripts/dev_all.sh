#!/bin/bash

# KGC Healthcare Platform - Local Development Setup Script
# This script installs dependencies and starts all local services for development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

error() {
    echo -e "${RED}❌${NC} $1"
}

# Check if running from project root
if [ ! -f "package.json" ]; then
    error "Please run this script from the project root directory"
    exit 1
fi

log "Starting KGC Healthcare Platform local development setup..."

# Detect package manager
PACKAGE_MANAGER="npm"
if [ -f "pnpm-lock.yaml" ]; then
    PACKAGE_MANAGER="pnpm"
elif [ -f "yarn.lock" ]; then
    PACKAGE_MANAGER="yarn"
fi

log "Detected package manager: $PACKAGE_MANAGER"

# Check environment files
log "Checking environment configuration..."

if [ ! -f ".env" ] && [ ! -f ".env.local" ]; then
    warning "No .env file found. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        success "Created .env from .env.example"
    else
        warning "No .env.example found. You'll need to create .env manually with required variables."
    fi
fi

# Environment variables check
check_env_var() {
    local var_name="$1"
    local var_value="${!var_name}"
    
    if [ -z "$var_value" ]; then
        warning "Environment variable $var_name is not set"
        return 1
    else
        success "$var_name is configured"
        return 0
    fi
}

log "Validating critical environment variables..."

# Load environment variables
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Check critical variables
MISSING_VARS=0

# Database
if ! check_env_var "DATABASE_URL"; then
    MISSING_VARS=$((MISSING_VARS + 1))
    log "  Hint: DATABASE_URL should be PostgreSQL connection string"
fi

# Session security
if ! check_env_var "SESSION_SECRET"; then
    MISSING_VARS=$((MISSING_VARS + 1))
    log "  Hint: Generate with: openssl rand -base64 64"
fi

# AI Services (optional for basic dev)
if ! check_env_var "OPENAI_API_KEY"; then
    warning "OPENAI_API_KEY not set - AI features will be disabled"
fi

if ! check_env_var "ANTHROPIC_API_KEY"; then
    warning "ANTHROPIC_API_KEY not set - Anthropic AI features will be disabled"
fi

# Communication services (optional for basic dev)
if ! check_env_var "TWILIO_ACCOUNT_SID"; then
    warning "Twilio credentials not set - SMS features will be disabled"
fi

if ! check_env_var "SENDGRID_API_KEY"; then
    warning "SendGrid API key not set - Email features will be disabled"
fi

if [ $MISSING_VARS -gt 0 ]; then
    error "$MISSING_VARS critical environment variables are missing"
    log "Please update your .env file with the required variables and run this script again"
    exit 1
fi

# Install dependencies
log "Installing dependencies with $PACKAGE_MANAGER..."

case $PACKAGE_MANAGER in
    pnpm)
        if ! command -v pnpm &> /dev/null; then
            log "Installing pnpm..."
            npm install -g pnpm
        fi
        pnpm install
        ;;
    yarn)
        if ! command -v yarn &> /dev/null; then
            log "Installing yarn..."
            npm install -g yarn
        fi
        yarn install
        ;;
    *)
        npm install
        ;;
esac

success "Dependencies installed successfully"

# Check if ports are available
check_port() {
    local port=$1
    local service=$2
    
    if lsof -i :$port >/dev/null 2>&1; then
        warning "Port $port is already in use (needed for $service)"
        return 1
    else
        success "Port $port is available for $service"
        return 0
    fi
}

log "Checking port availability..."
check_port 5000 "Backend API"
check_port 5173 "Frontend Dev Server"

# Database setup
log "Setting up database..."

# Check if we can connect to the database
if command -v psql &> /dev/null && [ -n "$DATABASE_URL" ]; then
    if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
        success "Database connection successful"
        
        # Run database migrations/setup
        log "Running database setup..."
        case $PACKAGE_MANAGER in
            pnpm)
                pnpm db:push || warning "Database migration failed - you may need to run this manually"
                ;;
            *)
                npm run db:push || warning "Database migration failed - you may need to run this manually"
                ;;
        esac
    else
        warning "Cannot connect to database. Please check your DATABASE_URL"
    fi
else
    warning "PostgreSQL client (psql) not found or DATABASE_URL not set"
    log "  Install with: brew install postgresql (macOS) or apt-get install postgresql-client (Ubuntu)"
fi

# Create startup script
STARTUP_SCRIPT="#!/bin/bash

# KGC Healthcare Platform - Development Servers
# Generated by dev_all.sh

set -e

# Load environment variables
if [ -f \".env\" ]; then
    export \$(grep -v '^#' .env | xargs)
fi

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e \"\${BLUE}[\$(date +'%H:%M:%S')]\${NC} \$1\"
}

success() {
    echo -e \"\${GREEN}✅\${NC} \$1\"
}

log \"Starting KGC Healthcare Platform development servers...\"

# Function to handle cleanup
cleanup() {
    log \"Shutting down development servers...\"
    jobs -p | xargs -r kill
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend server
log \"Starting backend API server on port 5000...\"
$PACKAGE_MANAGER run dev &
BACKEND_PID=\$!

# Wait a moment for backend to start
sleep 3

# Check if backend started successfully
if kill -0 \$BACKEND_PID 2>/dev/null; then
    success \"Backend server started (PID: \$BACKEND_PID)\"
else
    echo \"❌ Backend server failed to start\"
    exit 1
fi

log \"KGC Healthcare Platform is running:\"
echo \"  🏥 Frontend: http://localhost:5173 (Vite dev server)\"
echo \"  🔧 Backend API: http://localhost:5000 (Express server)\"
echo \"  📊 Database: \${DATABASE_URL:-Not configured}\"
echo \"\"
echo \"Press Ctrl+C to stop all servers\"

# Keep script running
wait
"

echo "$STARTUP_SCRIPT" > tools/scripts/start_dev_servers.sh
chmod +x tools/scripts/start_dev_servers.sh

# Health check function
health_check() {
    log "Running health checks..."
    
    # Check backend health (if running)
    if curl -f http://localhost:5000/api/health >/dev/null 2>&1; then
        success "Backend API is healthy"
    else
        warning "Backend API health check failed (may not be running yet)"
    fi
    
    # Check frontend (if running)
    if curl -f http://localhost:5173 >/dev/null 2>&1; then
        success "Frontend dev server is healthy"
    else
        warning "Frontend dev server health check failed (may not be running yet)"
    fi
}

# Start services
log "Starting development servers..."

# Check if user wants to start servers now
echo ""
echo "Development environment setup complete!"
echo ""
echo "Choose an option:"
echo "1) Start all services now"
echo "2) Exit (start manually later with: ./tools/scripts/start_dev_servers.sh)"
echo ""
read -p "Enter your choice (1-2): " choice

case $choice in
    1)
        log "Starting all development services..."
        exec ./tools/scripts/start_dev_servers.sh
        ;;
    2)
        success "Setup complete. Start services manually when ready:"
        echo "  ./tools/scripts/start_dev_servers.sh"
        ;;
    *)
        warning "Invalid choice. Setup complete. Start services manually:"
        echo "  ./tools/scripts/start_dev_servers.sh"
        ;;
esac

success "KGC Healthcare Platform development environment is ready!"

echo ""
echo "📝 Quick Start Guide:"
echo "  1. Configure API keys in .env for full functionality"
echo "  2. Start development: ./tools/scripts/start_dev_servers.sh"
echo "  3. Open browser: http://localhost:5173"
echo "  4. API documentation: http://localhost:5000/api/docs (if available)"
echo ""
echo "🔧 Development Tools:"
echo "  - Database Studio: $PACKAGE_MANAGER run db:studio"
echo "  - Type Check: $PACKAGE_MANAGER run type-check"
echo "  - Lint Code: $PACKAGE_MANAGER run lint"
echo "  - Run Tests: $PACKAGE_MANAGER test"
echo ""
echo "📚 Documentation: ./docs/"
echo "🏥 Healthcare Features: Patient dashboard, AI chat, progress tracking"