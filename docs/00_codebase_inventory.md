# Keep Going Care (KGC) - Codebase Inventory

## Project Overview
**Type:** Healthcare SaaS Platform (Class I Software as Medical Device)  
**Architecture:** Full-stack TypeScript monorepo with React frontend + Express backend  
**Target:** Australian TGA compliance for up to millions of healthcare users  
**Scan Date:** August 20, 2025

## Directory Structure Analysis

### `/` (Root)
**Core Configuration Files:**
- `package.json` - Main dependencies (75 packages including AI SDKs, healthcare libs)
- `tsconfig.json` - TypeScript ESNext configuration with path aliases
- `vite.config.ts` - Vite bundler with React + custom Replit plugins
- `drizzle.config.ts` - PostgreSQL ORM configuration
- `replit.md` - Project documentation and user preferences

**Deployment Configuration:**
- `Dockerfile` - Container configuration for cloud deployment
- `apprunner.yaml` - AWS App Runner deployment specification
- `Procfile` - Process file for cloud platforms
- 15x `AWS-*.md` files - Comprehensive deployment guides

### `/client/` (Frontend - 95 files, ~32K LOC)
**React + TypeScript SPA with healthcare-specific components**

#### `/client/src/pages/` (35 files)
- `patient-dashboard.tsx` - Main patient interface with health tracking
- `doctor-dashboard.tsx` - Doctor interface for patient management  
- `admin-dashboard.tsx` - Administrative controls and user management
- `chatbot.tsx` - AI-powered Supervisor Agent interface
- `daily-self-scores.tsx` - Patient health score submission
- `food-database.tsx` - Nutritional guidance system
- `progress-milestones.tsx` - Achievement tracking with badge system
- `health-snapshots.tsx` - Visual health analytics
- Authentication pages: `login.tsx`, `doctor-login.tsx`, `admin-login.tsx`

#### `/client/src/components/` (89 files)
**Organized by feature domains:**
- `ui/` - shadcn/ui component library (25 components)
- `chatbot/` - Supervisor Agent with MCP integration (5 components)
- `health/` - Healthcare widgets and visualizations (6 components)
- `doctor/` - Doctor-specific interfaces (4 components)
- `patient/` - Patient-focused components (2 components)
- `achievement-badge.tsx` - Dynamic badge system with CSS filters

#### `/client/src/services/` (12 files)
- API service layer for healthcare operations
- Recipe/nutrition services with Tavily integration
- Authentication and user management services

#### `/client/src/hooks/` (8 files)
- `useCPD.ts` - Care Plan Directives management
- `useBadges.ts` - Achievement badge system
- `useAuth.ts` - Authentication state management
- `use-mobile.ts` - Mobile responsiveness detection

### `/server/` (Backend - 89 files, ~28K LOC)
**Express.js API with healthcare compliance and AI integration**

#### `/server/routes/` (12 files)
- `routes.ts` - Main API router with 50+ healthcare endpoints
- `supervisorAgent.ts` - AI chatbot integration routes
- `emailAuth.ts` - SMS/email authentication system
- `admin-features.ts` - Administrative functionality
- `ppr-analysis.ts` - Patient Progress Report generation

#### `/server/services/` (25 files)
**Business logic layer:**
- `supervisorAgent.ts` - Main AI coordinator service
- `privacyProtectionAgent.ts` - PII anonymization for AI processing
- `emergencyDetectionService.ts` - Safety keyword monitoring
- `badgeService.ts` - Achievement system logic
- `emailService.ts` - SendGrid email integration
- `smsService.ts` - Twilio SMS authentication
- `userManagementService.ts` - Hierarchical user system

#### `/server/mcp/` (10 files)
**Model Context Protocol implementation with 9 healthcare tools:**
- `core/MCPServer.ts` - MCP server foundation
- `tools/health-metrics.ts` - Real-time health tracking
- `tools/care-plan-directives.ts` - Medical directive management
- `tools/food-database.ts` - Nutrition guidance system
- `tools/inspiration-machine-d.ts` - Video recommendation engine
- `tools/ew-support.ts` - Exercise & wellness search
- `tools/progress-milestones.ts` - Achievement tracking
- `tools/journaling.ts` - Patient journaling system
- `tools/mbp-wizard.ts` - Meal planning assistant

#### `/server/ai/` (12 files)
**Multi-AI provider integration:**
- `openai.ts` - GPT-4o integration
- `anthropic.ts` - Claude 3.7 Sonnet integration
- `tavilyClient.ts` - Web search for healthcare content
- `mcpService.ts` - MCP coordination layer
- `memoryTools.ts` - Enhanced context management

#### `/server/middleware/` (7 files)
**Security and compliance:**
- `authentication.ts` - JWT and session management
- `security.ts` - Input validation and sanitization
- `hipaaCompliance.ts` - Healthcare data protection
- `auditLogging.ts` - Compliance audit trails

#### `/server/config/` (2 files)
- `awsSecrets.ts` - AWS Secrets Manager integration
- `security.ts` - Environment-aware security configuration

### `/shared/` (2 files, ~1.2K LOC)
**TypeScript type definitions and database schema**

#### `schema.ts` (980 LOC)
**Comprehensive PostgreSQL schema with 15+ tables:**
- `users` - Hierarchical user management (admin/doctor/patient)
- `userRoles` - Role-based access control
- `carePlanDirectives` - Medical care plans
- `healthMetrics` - Real-time health scores
- `patientScores` - Official daily submissions
- `progressMilestones` - Achievement tracking
- `motivationalImages` - Patient image storage
- `emergencyAlerts` - Safety monitoring
- `doctorPatientRelationships` - Care assignments

#### `types.ts` (220 LOC)
- Shared TypeScript interfaces
- API request/response types
- Healthcare domain types

### `/attached_assets/` (156 files, ~4.2MB)
**Healthcare media and documentation:**
- Patient photography (KGC branded images)
- Deployment logs and debugging artifacts
- 100+ text files with project documentation
- Healthcare compliance documents

### `/scripts/` (8 files)
**Deployment and utility scripts:**
- `deploy-aws.sh` - AWS deployment automation
- `create-deployment-package.sh` - Build preparation
- Local development setup scripts

### `/public/` (6 files)
**Static assets and PWA configuration:**
- `manifest.json` - Progressive Web App configuration
- `service-worker.js` - Offline functionality
- Audio files for therapeutic sounds (110Hz gong)

## Key Architecture Files

### Primary Entry Points
1. **`server/index.ts`** - Express server initialization with security hardening
2. **`client/src/main.tsx`** - React application bootstrap
3. **`client/src/App.tsx`** - Main application router and layout

### Database Layer
1. **`shared/schema.ts`** - Complete data model (15 tables, healthcare-focused)
2. **`server/storage.ts`** - Data access layer with in-memory dev fallback
3. **`drizzle.config.ts`** - ORM configuration for PostgreSQL

### AI Integration
1. **`server/services/supervisorAgent.ts`** - Main AI coordinator
2. **`server/mcp/`** - 9 specialized healthcare tools
3. **`server/ai/`** - Multi-provider AI integration layer

### Security & Compliance
1. **`server/middleware/`** - Security, auth, audit logging
2. **`server/config/security.ts`** - Environment-aware hardening
3. **`server/services/privacyProtectionAgent.ts`** - PII protection

## Notable Implementation Patterns

### Healthcare Compliance
- TGA Class I Software as Medical Device architecture
- HIPAA-compliant data handling with audit trails
- Emergency detection with safety keyword monitoring
- Hierarchical user management (1 admin → 10 doctors → 50+ patients)

### AI Integration
- True MCP (Model Context Protocol) implementation
- Multi-provider support (OpenAI GPT-4o + Anthropic Claude)
- Privacy-first: PII anonymization before external AI processing
- 9 specialized healthcare tools with CBT/MI integration

### Frontend Architecture
- React 18 with TypeScript and Vite
- shadcn/ui component library for consistency
- Wouter for lightweight routing
- TanStack Query for efficient data fetching
- Progressive Web App with offline capabilities

### Backend Architecture
- Express.js with comprehensive middleware stack
- Drizzle ORM with PostgreSQL (Neon serverless)
- Session-based authentication with JWT tokens
- Rate limiting and security hardening
- Real-time WebSocket connections for alerts

## Development Workflow

### Package Management
- **npm** - Primary package manager
- **75 dependencies** including healthcare-specific libraries
- **tsx** for TypeScript execution in development
- **esbuild** for production builds

### Database Management
- **Drizzle Kit** for schema migrations
- **`npm run db:push`** for schema deployment
- PostgreSQL with connection pooling

### Build & Deploy
- **Vite** for frontend bundling
- **esbuild** for backend compilation
- Multi-platform deployment (AWS App Runner, Google Cloud Run, Docker)