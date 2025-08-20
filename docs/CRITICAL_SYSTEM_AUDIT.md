# KGC Critical System Audit - READ ONLY ANALYSIS
*Generated: July 26, 2025*
*Purpose: Map working features without touching any code*

## 🔒 CRITICAL WORKING SYSTEMS (DO NOT TOUCH)

### 1. Authentication Flow (ESSENTIAL)
**Status: WORKING PERFECTLY - User confirmed all 3 types tested successfully**

**Frontend Components:**
- `client/src/pages/kgc-landing.tsx` - Main landing page
- `client/src/pages/auth-wrapper.tsx` - Authentication routing logic
- `client/src/context/auth-context.tsx` - Authentication state management

**Backend Infrastructure:**
- `server/routes/emailAuth.ts` - Email PIN authentication system
- `server/services/emailAuthService.ts` - PIN generation and verification
- `server/middleware/security.ts` - Rate limiting and security (IPv6 fixed)
- `server/index.ts` - Trust proxy configuration (production-ready)

**Database Tables:**
- `users` - User accounts (admin/doctor/patient)
- `userRoles` - Role definitions
- Sessions table managed by express-session

### 2. User Creation Workflows (ESSENTIAL)
**Status: WORKING - Scalable UIN system operational**

**Admin Dashboard:**
- Creates doctors with real human-provided contact info
- UIN Service generates KGC-DOC-001, KGC-DOC-002, etc.

**Doctor Dashboard:**
- Creates patients with real human-provided contact info  
- UIN Service generates KGC-PAT-001, KGC-PAT-002, etc.

**Backend Services:**
- `server/services/uinService.ts` - Unlimited scalability UIN generation
- `server/routes.ts` - User creation endpoints with validation

### 3. Dashboard Routing System (ESSENTIAL)
**Status: WORKING - Email-based auto-detection confirmed**

**Router Logic:**
```
/ → AuthWrapper → Email detection → Dashboard routing
admin@keepgoingcare.com → Admin Dashboard
marijke.collins@keepgoingcare.com → Doctor Dashboard  
reuben.collins@keepgoingcare.com → Patient Dashboard
```

**Frontend Files:**
- `client/src/App.tsx` - Main router configuration
- `client/src/pages/admin-dashboard.tsx` - Admin interface
- `client/src/pages/doctor-dashboard.tsx` - Doctor interface
- `client/src/pages/dashboard.tsx` - Patient interface (with Layout wrapper)

### 4. Supervisor Agent & AI System (ESSENTIAL)
**Status: WORKING - User confirmed for real patients**

**Architecture:**
- MCP (Model Context Protocol) implementation
- Privacy Protection Agent - anonymizes PII before external AI
- Multi-AI evaluation (OpenAI GPT-4o + Anthropic Claude 3.7 Sonnet)
- CBT/MI therapeutic techniques integrated

**Key Files:**
- `server/ai/mcpService.ts` - MCP protocol implementation
- `server/services/privacyService.ts` - PII anonymization
- `client/src/pages/enhanced-chatbot.tsx` - Chatbot interface
- Various MCP tool implementations in server/ai/

### 5. Care Plan Directives (CPD) System (ESSENTIAL)
**Status: WORKING - CPD-driven AI decision making confirmed**

**Features:**
- Doctors create max 3 CPDs per patient
- All AI features use CPD context for recommendations
- Real-time CPD loading with automatic updates

**Implementation:**
- Database: `carePlanDirectives` table
- Hook: `client/src/hooks/useCPD.ts` - Unified CPD loading
- Integration across all patient features

### 6. Daily Self-Scores System (ESSENTIAL) 
**Status: WORKING - 24-hour enforcement operational**

**Dual Storage System:**
- `patientScores` table - Official daily submissions (integers 1-10)
- `healthMetrics` table - Legacy real-time tracking (decimals)
- Server-side 24-hour duplicate prevention
- Supervisor Agent awareness of latest scores

### 7. Security & Data Protection (ESSENTIAL)
**Status: PRODUCTION-READY - All vulnerabilities fixed**

**Security Features:**
- Rate limiting with IPv6 support (fixed)
- Trust proxy configuration (production-ready)
- PII/PHI protection and anonymization
- Data segregation between patients
- Comprehensive error handling
- Healthcare compliance (TGA SaMD ready)

## ⚠️ REPLIT-SPECIFIC CODE (NEEDS AWS MIGRATION)

### Environment Detection
- `server/environmentConfig.ts` - Detects Replit vs production
- Environment-specific security configurations
- In-memory session storage (development only)

### Development Tools
- Vite development server configuration
- Hot reload and development middleware
- Console-based logging (needs CloudWatch for AWS)

## 🧹 POTENTIAL CLEANUP CANDIDATES (SAFE TO INVESTIGATE)

### Unused Routes/Components
- Need to verify which App.tsx routes are actually used
- Some components may be legacy (LoginDemo, old authentication)
- Multiple chatbot implementations - verify which is active

### Duplicate Code
- Multiple email sending implementations
- Legacy vs new routing systems
- Old vs new authentication flows

## NEXT STEPS (PROPOSED)

1. **Route Usage Analysis** - Verify which App.tsx routes are actively used
2. **Component Dependency Mapping** - Trace which components are actually rendered
3. **API Endpoint Audit** - Test which backend routes are called by working features
4. **Database Query Analysis** - Identify which tables/fields are actively used

**STRICT RULE: NO CODE CHANGES until user explicitly approves specific cleanup actions**