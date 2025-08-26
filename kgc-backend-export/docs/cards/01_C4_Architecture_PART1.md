SIZE: 18456 bytes

# Knowledge Card 01: C4 Architecture Model

## Level 1: System Context

### KGC Healthcare Platform Context
```
┌─────────────────────────────────────────────────────────────┐
│                    External Systems                          │
├─────────────────────────────────────────────────────────────┤
│  [OpenAI API]     [Anthropic API]    [Twilio SMS]           │
│  [SendGrid Email] [Neon Database]    [AWS Secrets]          │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    │   KGC Platform    │
                    │   (Healthcare     │
                    │    SaMD)          │
                    │                   │
                    └─────────┬─────────┘
                              │
┌─────────────────────────────┴─────────────────────────────────┐
│                    Human Users                                │
├───────────────────────────────────────────────────────────────┤
│  [Patients]       [Doctors]         [Administrators]         │
│  Submit health    Manage care       System oversight         │
│  scores, chat     plans, monitor    User management          │
│  with AI          patient progress  Compliance reporting     │
└───────────────────────────────────────────────────────────────┘
```

### External Dependencies
```yaml
OpenAI GPT-4o:
  Purpose: Primary AI chat responses, health guidance
  Protocol: HTTPS REST API
  Authentication: Bearer token
  Rate Limits: 500 RPM, 30K TPM
  Fallback: Anthropic Claude

Anthropic Claude 3.7 Sonnet:
  Purpose: Secondary AI provider, complex reasoning
  Protocol: HTTPS REST API  
  Authentication: API key
  Rate Limits: 50 RPM, 40K TPM
  Fallback: Error response with support contact

Twilio SMS:
  Purpose: Multi-factor authentication, notifications
  Protocol: HTTPS REST API
  Authentication: Account SID + Auth Token
  Rate Limits: 100 SMS/second
  Fallback: Email-based verification

SendGrid Email:
  Purpose: System notifications, password resets
  Protocol: HTTPS REST API
  Authentication: API key
  Rate Limits: 100 emails/day (free tier)
  Fallback: SMS-only communications

Neon PostgreSQL:
  Purpose: Primary data persistence
  Protocol: PostgreSQL wire protocol over TLS
  Authentication: Username/password + connection string
  Backup: Automated daily snapshots
  Fallback: Connection retry with exponential backoff

AWS Secrets Manager:
  Purpose: Production secrets storage
  Protocol: AWS API (HTTPS)
  Authentication: IAM roles
  Region: ap-southeast-2 (Australia)
  Fallback: Environment variables
```

## Level 2: Container Architecture

### High-Level Container View
```
┌───────────────────────────────────────────────────────────────┐
│                        Web Browser                            │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              React Frontend (SPA)                      │  │
│  │  • Patient Dashboard    • Doctor Dashboard             │  │
│  │  • Admin Panel         • AI Chat Interface            │  │
│  │  • Authentication UI   • Health Data Entry            │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────┬───────────────────────────────────────┘
                        │ HTTPS/WSS
                        │
┌───────────────────────┴───────────────────────────────────────┐
│                   Express.js API Server                       │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                 API Gateway Layer                      │  │
│  │  • Authentication    • Rate Limiting                   │  │
│  │  • Input Validation  • Audit Logging                  │  │
│  │  • CORS Handling     • Security Headers               │  │
│  └─────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              Business Logic Services                   │  │
│  │  • User Management   • Health Data Processing          │  │
│  │  • AI Chat Service   • Care Plan Management           │  │
│  │  • SMS Service       • Email Service                  │  │
│  └─────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │               Data Access Layer                        │  │
│  │  • Drizzle ORM       • Query Optimization             │  │
│  │  • Connection Pool   • Migration Management           │  │
│  │  • Audit Trail       • Data Validation                │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────┬───────────────────────────────────────┘
                        │ PostgreSQL Wire Protocol
                        │
┌───────────────────────┴───────────────────────────────────────┐
│                  PostgreSQL Database                          │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                   Core Tables                          │  │
│  │  • users             • daily_scores                    │  │
│  │  • care_plans        • ai_interactions                 │  │
│  │  • audit_logs        • sessions                        │  │
│  └─────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                Security Features                       │  │
│  │  • Row Level Security • Encryption at Rest            │  │
│  │  • Audit Triggers     • Backup Automation             │  │
│  │  • Connection Limits  • Performance Monitoring        │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

### Container Responsibilities

#### React Frontend Container
```typescript
Responsibilities:
- User interface rendering and interaction
- Client-side routing and navigation
- Form validation and submission
- Real-time data synchronization
- Local state management
- Authentication token management

Technology Choices:
- React 18 (declarative UI, concurrent features)
- TypeScript (type safety, developer experience)
- TanStack Query (server state management, caching)
- wouter (lightweight routing)
- shadcn/ui (accessible component library)
- Tailwind CSS (utility-first styling)

Security Boundaries:
- XSS prevention through React's built-in protections
- CSP headers for additional script injection protection
- Secure token storage in httpOnly cookies
- Input sanitization before API calls

Performance Optimizations:
- Code splitting by route and feature
- Image optimization and lazy loading
- Bundle size monitoring and optimization
- Service worker for offline functionality
```

#### Express.js API Container
```typescript
Responsibilities:
- HTTP request/response handling
- Authentication and authorization
- Business logic orchestration
- External service integration
- Rate limiting and security enforcement
- Audit logging and compliance

Technology Choices:
- Express.js (mature, extensive middleware ecosystem)
- TypeScript (type safety across full stack)
- express-session (secure session management)
- helmet (security headers)
- express-rate-limit (DDoS protection)

Security Implementation:
- JWT token validation
- Role-based access control (RBAC)
- Input validation with Zod schemas
- SQL injection prevention through ORM
- CORS configuration for trusted origins
- Security headers (CSP, HSTS, etc.)

Scalability Features:
- Stateless request handling
- Connection pooling
- Graceful shutdown handling
- Health check endpoints
```

#### PostgreSQL Database Container
```sql
Responsibilities:
- Primary data persistence
- ACID transaction support
- Data integrity enforcement
- Query optimization and indexing
- Backup and recovery
- Audit trail maintenance

Schema Design Principles:
- Normalized relational structure
- Foreign key constraints
- Check constraints for data validation
- Indexed columns for query performance
- Audit columns (created_at, updated_at)

Security Features:
- Row Level Security (RLS) policies
- Encrypted connections (TLS)
- Encrypted storage at rest
- Regular security updates
- Access logging and monitoring
```

## Level 3: Component Architecture

### Frontend Component Breakdown
```
src/
├── components/
│   ├── ui/                          # shadcn/ui base components
│   │   ├── Button.tsx              # Reusable button component
│   │   ├── Input.tsx               # Form input with validation
│   │   ├── Card.tsx                # Content containers
│   │   └── Dialog.tsx              # Modal dialogs
│   │
│   ├── layout/                      # Layout components
│   │   ├── Header.tsx              # App header with navigation
│   │   ├── Sidebar.tsx             # Role-based navigation
│   │   ├── Footer.tsx              # App footer
│   │   └── AuthGuard.tsx           # Authentication wrapper
│   │
│   ├── features/                    # Feature-specific components
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx       # SMS-based login
│   │   │   ├── SMSVerification.tsx # 6-digit code input
│   │   │   └── LogoutButton.tsx    # Logout functionality
│   │   │
│   │   ├── patient/
│   │   │   ├── DashboardWidget.tsx # Score submission widget
│   │   │   ├── ScoreHistory.tsx    # Historical score charts
│   │   │   ├── ProgressReport.tsx  # Progress visualization
│   │   │   └── CarePlanView.tsx    # Care directive display
│   │   │
│   │   ├── doctor/
│   │   │   ├── PatientList.tsx     # Assigned patients
│   │   │   ├── PatientDetail.tsx   # Individual patient view
│   │   │   ├── CarePlanEditor.tsx  # Care directive creation
│   │   │   └── ProgressAnalysis.tsx # Patient analytics
│   │   │
│   │   ├── admin/
│   │   │   ├── UserManagement.tsx  # User CRUD operations
│   │   │   ├── SystemMetrics.tsx   # Performance dashboard
│   │   │   ├── AuditLogViewer.tsx  # Compliance reporting
│   │   │   └── SettingsPanel.tsx   # System configuration
│   │   │
│   │   └── chat/
│   │       ├── ChatInterface.tsx   # AI chat UI
│   │       ├── MessageBubble.tsx   # Individual messages
│   │       ├── EmergencyAlert.tsx  # Emergency response UI
│   │       └── ChatHistory.tsx     # Previous conversations
│   │
│   └── shared/                      # Shared utility components
│       ├── LoadingSpinner.tsx      # Loading states
│       ├── ErrorBoundary.tsx       # Error handling
│       ├── Toast.tsx               # Notifications
│       └── DataTable.tsx           # Reusable data tables
```

### Backend Component Breakdown
```
server/
├── middleware/                      # Request processing middleware
│   ├── auth.ts                     # JWT validation, role checking
│   ├── validation.ts               # Zod schema validation
│   ├── rateLimit.ts                # Request rate limiting
│   ├── audit.ts                    # Audit log generation
│   ├── emergency.ts                # Emergency keyword detection
│   └── errors.ts                   # Error handling and logging
│
├── routes/                         # API endpoint handlers
│   ├── auth.ts                     # Authentication endpoints
│   │   ├── POST /request-sms       # Initiate SMS verification
│   │   ├── POST /verify-sms        # Verify SMS code
│   │   ├── GET /status             # Check auth status
│   │   └── POST /logout            # Session termination
│   │
│   ├── users.ts                    # User management endpoints
│   │   ├── GET /profile            # User profile data
│   │   ├── PUT /profile            # Update profile
│   │   ├── GET /patients           # List patients (doctors)
│   │   └── POST /create            # Create user (admins)
│   │
│   ├── patients.ts                 # Patient data endpoints
│   │   ├── GET /:id/scores         # Daily score history
│   │   ├── POST /:id/scores        # Submit daily scores
│   │   ├── GET /:id/progress       # Progress analytics
│   │   └── GET /:id/cpd            # Care plan directives
│   │
│   ├── chat.ts                     # AI chat endpoints
│   │   ├── POST /                  # Send chat message
│   │   ├── GET /history            # Chat conversation history
│   │   └── POST /emergency         # Emergency detection
│   │
│   └── admin.ts                    # Administrative endpoints
│       ├── GET /users              # All users list
│       ├── GET /metrics            # System metrics
│       ├── GET /audit-logs         # Compliance logs
│       └── POST /system-config     # System configuration
│
├── services/                       # Business logic services
│   ├── authService.ts              # Authentication logic
│   │   ├── generateSMSCode()       # SMS verification codes
│   │   ├── validateSMSCode()       # Code verification
│   │   ├── createSession()         # Session creation
│   │   └── validateSession()       # Session validation
│   │
│   ├── chatService.ts              # AI chat service
│   │   ├── processMessage()        # Message processing
│   │   ├── detectEmergency()       # Emergency keyword detection
│   │   ├── callOpenAI()            # OpenAI API integration
│   │   └── callAnthropic()         # Anthropic API integration
│   │
│   ├── healthService.ts            # Health data processing
│   │   ├── validateScores()        # Score validation
│   │   ├── calculateProgress()     # Progress calculations
│   │   ├── generateReports()       # Progress reports
│   │   └── checkCompliance()       # Care plan compliance
│   │
│   ├── notificationService.ts      # Communication services
│   │   ├── sendSMS()               # Twilio SMS sending
│   │   ├── sendEmail()             # SendGrid email sending
│   │   ├── scheduleReminders()     # Daily score reminders
│   │   └── sendEmergencyAlert()    # Emergency notifications
│   │
│   └── auditService.ts             # Compliance and logging
│       ├── logUserAction()         # User action logging
│       ├── logDataAccess()         # Data access logging
│       ├── generateComplianceReport() # Compliance reporting
│       └── exportUserData()        # Data export for privacy requests
│
└── storage/                        # Data access layer
    ├── storage.ts                  # Main storage interface
    ├── userRepository.ts           # User data operations
    ├── healthRepository.ts         # Health data operations
    ├── chatRepository.ts           # Chat history operations
    └── auditRepository.ts          # Audit log operations
```

## Level 4: Code Architecture

### Authentication Flow Sequence
```
Patient                 Frontend              Backend               Twilio
  │                        │                     │                    │
  │ 1. Enter phone number  │                     │                    │
  ├─────────────────────→  │                     │                    │
  │                        │ 2. POST /auth/      │                    │
  │                        │    request-sms      │                    │
  │                        ├───────────────────→ │                    │
  │                        │                     │ 3. Generate code   │
  │                        │                     │    Send SMS        │
  │                        │                     ├──────────────────→ │
  │                        │                     │                    │
  │ 4. Receive SMS         │                     │                    │
  ├────────────────────────┴─────────────────────┴──────────────────→ │
  │                        │                     │                    │
  │ 5. Enter 6-digit code  │                     │                    │
  ├─────────────────────→  │                     │                    │
  │                        │ 6. POST /auth/      │                    │
  │                        │    verify-sms       │                    │
  │                        ├───────────────────→ │                    │
  │                        │                     │ 7. Validate code   │
  │                        │                     │    Create session  │
  │                        │ 8. Session cookie   │                    │
  │                        │ ←─────────────────── │                    │
  │ 9. Redirect to dashboard                     │                    │
  │ ←──────────────────────                      │                    │
```

### AI Chat Processing Flow
```typescript
// Simplified service interface
interface ChatService {
  async processMessage(
    message: string, 
    userId: string, 
    context: ChatContext
  ): Promise<ChatResponse>
  
  async detectEmergency(message: string): Promise<EmergencyResponse>
  
  async callAIProvider(
    prompt: string, 
    provider: 'openai' | 'anthropic'
  ): Promise<AIResponse>
}

// Data flow sequence
ChatInterface → validateInput() → emergencyDetection() → 
aiServiceCall() → responseProcessing() → auditLogging() → 
storeConversation() → returnResponse()
```

### Data Model Relationships
```typescript
// Core entity relationships
User (1) ──→ (N) DailyScores
User (1) ──→ (N) ChatInteractions  
User (N) ──→ (M) CarePlanDirectives [Doctor creates, Patient follows]
User (1) ──→ (N) AuditLogs
User (1) ──→ (N) Sessions

// Healthcare-specific constraints
Patient.role = 'patient'
Doctor.role = 'doctor' 
Admin.role = 'admin'

DailyScore.value BETWEEN 1 AND 10
CarePlan.status IN ('active', 'completed', 'paused')
AuditLog.retention_period = '7 years'
```

### Security Architecture Layers
```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  • Input validation    • Business logic authorization       │
│  • Output sanitization • Audit logging                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                   Transport Layer                           │
│  • TLS encryption     • Certificate validation             │
│  • HSTS headers       • Security headers (CSP, etc.)       │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                   Network Layer                             │
│  • Rate limiting      • DDoS protection                    │
│  • IP whitelisting    • Firewall rules                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                    Data Layer                               │
│  • Encryption at rest • Row level security                 │
│  • Access controls    • Audit triggers                     │
└─────────────────────────────────────────────────────────────┘
```