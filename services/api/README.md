# KGC Healthcare API Service

## Overview
This is the main backend API service for the Keep Going Care (KGC) Healthcare Platform. It provides RESTful endpoints, AI integrations, and database operations with healthcare compliance.

## Technology Stack
- **Runtime**: Node.js 20 + TypeScript + ESM
- **Framework**: Express.js with middleware
- **Database**: PostgreSQL (Neon serverless) + Drizzle ORM
- **Authentication**: Session-based + SMS verification (Twilio)
- **AI Integration**: OpenAI GPT-4o + Anthropic Claude 3.5 Sonnet
- **Privacy**: PII/PHI anonymization agent
- **Caching**: Redis (optional) + in-memory fallback
- **Email**: SendGrid integration
- **Search**: Tavily API integration

## Current Implementation
The API service is currently implemented in the monorepo root under:
- `server/` - Express.js backend application
- `shared/` - Shared types and schemas

## Migration Plan (P11)
In Phase 11, the current server code will be moved to this `services/api/` directory with:
- `services/api/src/` ← `server/`
- `services/api/package.json` - API-specific dependencies
- `services/api/tsconfig.json` - Extends base config
- `services/api/Dockerfile` - Container configuration

## Deployment Targets
- **Primary**: AWS App Runner (auto-scaling containers)
- **Alternative**: Google Cloud Run (serverless containers)
- **Legacy**: AWS Elastic Beanstalk
- **Development**: Local Node.js server on port 5000

## Environment Variables
API service requires these environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - JWT/session encryption key
- `OPENAI_API_KEY` - OpenAI API access
- `ANTHROPIC_API_KEY` - Anthropic API access
- `TWILIO_*` - SMS verification credentials
- `SENDGRID_API_KEY` - Email service
- `TAVILY_API_KEY` - Search integration

See `docs/06_env_vars.md` for complete variable reference.

## API Architecture

### Core Services
- **Authentication Service**: SMS-based verification, role-based access
- **User Management**: Hierarchical (Admin → Doctor → Patient)
- **AI Services**: Multi-provider with privacy protection
- **Privacy Protection Agent**: PII/PHI anonymization
- **Audit Logger**: Healthcare compliance trail
- **Emergency Detection**: Safety monitoring

### API Groups
1. **Authentication** (`/api/auth/*`)
   - Login, logout, session management
   - SMS verification flows
   - Role-based access control

2. **User Management** (`/api/users/*`)
   - Patient, doctor, admin CRUD
   - Profile management
   - UIN generation

3. **Health Data** (`/api/patients/*`)
   - Daily self-scores
   - Health metrics tracking
   - Progress reports

4. **Care Management** (`/api/care/*`)
   - Care Plan Directives (CPDs)
   - Doctor-patient assignments
   - Treatment adherence

5. **AI Integration** (`/api/chat/*`)
   - Supervisor Agent chatbot
   - MCP tool endpoints
   - Emergency detection

6. **Admin Operations** (`/api/admin/*`)
   - System monitoring
   - User management
   - Audit trail access

### Database Schema
- **Users**: Hierarchical user management with roles
- **Patient Data**: Health scores, metrics, progress
- **Care Plans**: Doctor-created directives
- **AI Interactions**: Chat history, tool usage
- **Audit Logs**: Compliance and security events

## Security Features

### Healthcare Compliance
- **TGA Class I SaMD**: Non-diagnostic scope limitation
- **HIPAA Alignment**: PHI protection and audit trails
- **Australian Privacy Principles**: Data residency and consent

### Security Measures
- **Input Sanitization**: XSS and injection prevention
- **Rate Limiting**: API abuse protection
- **CORS Configuration**: Origin restrictions
- **Security Headers**: Helmet.js middleware
- **Encryption**: AES-256 for sensitive data
- **Session Security**: HttpOnly, Secure, SameSite cookies

### Privacy Protection
- **PII Anonymization**: Before external AI processing
- **Data Minimization**: Only necessary data collection
- **Audit Logging**: All data access and modifications
- **Emergency Detection**: Safety keyword monitoring

## Development
```bash
# Run development server
pnpm dev

# Type checking
pnpm type-check

# Database operations
pnpm db:push    # Push schema changes
pnpm db:studio  # Visual database editor

# Build for production
pnpm build

# Start production server
pnpm start
```

## Testing
```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# API tests
pnpm test:api

# Load testing
pnpm test:load
```

## Health Checks
- `GET /api/health` - Service health status
- `GET /api/health/detailed` - Component health details
- `GET /api/metrics` - Performance metrics

## Monitoring
- Application performance monitoring (APM)
- Error tracking and alerting
- Audit log analysis
- Healthcare compliance monitoring