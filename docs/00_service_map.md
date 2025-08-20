# KGC Service Architecture Map

## System Overview
**Keep Going Care (KGC)** is a healthcare platform with a **Client-Server + AI Services** architecture, designed for TGA compliance and scalable healthcare delivery.

## Core Components

### 1. Frontend Application (React SPA)
**Location:** `/client/`  
**Technology:** React 18 + TypeScript + Vite  
**Port:** Served via Express static middleware  
**Responsibilities:**
- Patient dashboard with health tracking interfaces
- Doctor dashboard for patient management and PPR analysis
- Admin dashboard for user management and system oversight
- Real-time AI chatbot interface (Supervisor Agent)
- PWA functionality with offline capability

**Key Services:**
- Authentication state management
- Care Plan Directive (CPD) synchronization
- Badge/achievement tracking
- Real-time health score submission
- Responsive mobile-optimized interfaces

### 2. Backend API Server (Express.js)
**Location:** `/server/`  
**Technology:** Express.js + TypeScript  
**Port:** 5000 (development), 3000 (production)  
**Responsibilities:**
- RESTful API with 50+ healthcare endpoints
- Session-based authentication with JWT tokens
- Real-time WebSocket connections for alerts
- Business logic coordination
- Security middleware and rate limiting

**Key Endpoints:**
- `/api/auth/*` - Authentication and authorization
- `/api/users/*` - User management and profiles
- `/api/chat` - AI Supervisor Agent interface
- `/api/health-metrics` - Real-time health tracking
- `/api/care-plan-directives` - Medical directive management
- `/api/progress-milestones` - Achievement system
- `/api/mcp/*` - Model Context Protocol tool access

### 3. AI Services Layer
**Location:** `/server/ai/` + `/server/mcp/`  
**Architecture:** Multi-provider AI with MCP implementation  
**Responsibilities:**
- Supervisor Agent coordination (healthcare AI assistant)
- Privacy Protection Agent (PII anonymization)
- 9 specialized MCP healthcare tools
- Multi-AI provider routing (OpenAI + Anthropic)
- Emergency detection and safety monitoring

**MCP Tools:**
1. **health-metrics** - Real-time health tracking and analysis
2. **care-plan-directives** - Medical directive management
3. **food-database** - Nutrition guidance with Australian standards
4. **inspiration-machine-d** - Video recommendation engine
5. **ew-support** - Exercise & wellness facility search
6. **progress-milestones** - Achievement tracking and badge system
7. **journaling** - Patient reflection and goal tracking
8. **mbp-wizard** - Meal planning assistant
9. **motivational-imaging** - Image enhancement for patient motivation

### 4. Data Layer
**Location:** `/shared/schema.ts` + `/server/storage.ts`  
**Technology:** PostgreSQL (Neon) + Drizzle ORM  
**Responsibilities:**
- Healthcare data persistence (15+ tables)
- User hierarchy management (admin → doctor → patient)
- Real-time health metrics storage
- Audit logging for compliance
- Session management

**Key Tables:**
- `users` - Hierarchical user system with UIN scaling
- `carePlanDirectives` - Medical care plans and targets
- `healthMetrics` - Real-time health scores
- `patientScores` - Official daily submissions
- `progressMilestones` - Achievement tracking
- `emergencyAlerts` - Safety monitoring logs

## Inter-Service Communication

### Frontend ↔ Backend API
**Protocol:** HTTP/HTTPS with TanStack Query  
**Authentication:** Session cookies + JWT tokens  
**Data Format:** JSON with Zod validation  
**Features:**
- Optimistic updates for health scores
- Real-time synchronization of CPDs
- Cached queries with automatic invalidation
- Error boundaries with user-friendly messaging

### Backend ↔ AI Services
**Protocol:** Internal TypeScript modules  
**Flow:**
1. User request → Express route handler
2. Privacy Protection Agent → PII anonymization
3. Supervisor Agent → AI provider selection
4. MCP Tool execution → Specialized healthcare logic
5. Response aggregation → Safety validation
6. Return to user → Formatted healthcare guidance

### Backend ↔ Database
**Protocol:** Drizzle ORM with connection pooling  
**Features:**
- Type-safe queries with schema validation
- Automatic migrations with `drizzle-kit`
- Connection fallback (Neon → in-memory for dev)
- Audit logging for all healthcare data changes

### External Service Integrations
**AI Providers:**
- OpenAI GPT-4o - Primary AI responses
- Anthropic Claude 3.7 - Secondary AI provider
- Tavily API - Web search for healthcare content

**Communication Services:**
- Twilio - SMS authentication and alerts
- SendGrid - Email notifications and reports

**Cloud Services:**
- AWS Secrets Manager - Secure credential storage
- Neon Database - PostgreSQL hosting
- Redis (optional) - Session storage and caching

## Data Flow Patterns

### 1. Patient Health Score Submission
```
Patient Dashboard → /api/health-metrics → 
Privacy Agent → healthMetrics table → 
Badge Service → Achievement calculation → 
Real-time UI update
```

### 2. AI Chatbot Interaction
```
Chat Interface → /api/chat → 
Supervisor Agent → Privacy Protection → 
MCP Tool Selection → AI Provider → 
Safety Validation → Formatted Response
```

### 3. Doctor-Patient Management
```
Doctor Dashboard → /api/users/{patientId} →
CPD Updates → carePlanDirectives table →
Real-time sync → Patient Dashboard
```

## Security Architecture

### Authentication Flow
1. **SMS/Email Verification** - Twilio/SendGrid integration
2. **Session Creation** - Secure HTTP-only cookies
3. **JWT Token Generation** - Role-based access control
4. **Middleware Validation** - Every API request verified

### Healthcare Compliance
- **TGA Class I SaMD** - Software as Medical Device compliance
- **HIPAA Protections** - Data encryption and audit trails
- **Emergency Detection** - Real-time safety keyword monitoring
- **PII Anonymization** - Before external AI processing

### Security Layers
1. **Input Validation** - Zod schemas + sanitization
2. **Rate Limiting** - Express middleware protection
3. **Security Headers** - Helmet.js integration
4. **Audit Logging** - All healthcare actions logged
5. **Environment Hardening** - Production security configuration

## Deployment Architecture

### Development Environment
- **Replit Hosting** - Unified frontend + backend serving
- **In-memory Storage** - Development database fallback
- **Hot Reloading** - Vite + tsx for rapid development

### Production Deployment Options
1. **AWS App Runner** - Containerized deployment with secrets
2. **Google Cloud Run** - Serverless container platform
3. **Docker** - Standardized container deployment

### Infrastructure Dependencies
- **PostgreSQL Database** - Neon serverless or self-hosted
- **Redis** (optional) - Session storage for production
- **CDN** - Static asset delivery
- **Load Balancer** - Multi-instance traffic distribution

## Monitoring & Observability

### Application Monitoring
- **Alert Monitor Service** - Patient engagement tracking
- **Emergency Detection** - Real-time safety monitoring
- **Audit Logging** - Compliance trail for all actions
- **Performance Metrics** - API response times and errors

### Healthcare-Specific Monitoring
- **Daily Score Compliance** - Patient submission tracking
- **7PM Reminder System** - Automated engagement alerts
- **Badge Achievement Tracking** - Progress milestone monitoring
- **CPD Compliance Scoring** - Medical directive adherence

## Service Dependencies

### Critical Dependencies
- **OpenAI API** - Primary AI functionality
- **PostgreSQL** - Core data persistence
- **Twilio** - SMS authentication system
- **SendGrid** - Email communication

### Optional Dependencies
- **Anthropic API** - Secondary AI provider
- **Redis** - Session caching (fallback to memory)
- **Tavily API** - Enhanced web search capabilities
- **AWS Secrets** - Production credential management

## Scalability Considerations

### Horizontal Scaling
- **Stateless Backend** - Session data in external store
- **Database Connection Pooling** - Efficient resource usage
- **CDN Integration** - Global asset distribution
- **Load Balancer Ready** - Multiple instance support

### Vertical Scaling
- **Efficient ORM Queries** - Drizzle optimization
- **Cached API Responses** - TanStack Query management
- **Optimized Bundle Size** - Vite tree shaking
- **Memory Management** - In-memory fallbacks for dev