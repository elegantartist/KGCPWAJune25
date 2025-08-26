# Keep Going Care (KGC) - Macro Architecture Overview

**System Type:** Healthcare SaaS Platform (Class I Software as Medical Device)  
**Compliance:** TGA (Australia), HIPAA-ready  
**Architecture:** Microservices with AI Integration  
**Target Scale:** 1 Admin → 10 Doctors → Millions of Patients

## Important: Non-Diagnostic Scope

**KGC is non-diagnostic software.** The platform provides:
- Educational health content and guidance
- Care plan directive management and tracking
- Motivational support and engagement tools
- Progress monitoring and milestone tracking
- AI-powered health assistant for general wellness guidance

**KGC does NOT:**
- Provide medical diagnoses
- Replace professional medical advice
- Make treatment recommendations
- Interpret medical test results
- Provide emergency medical services

All health-related guidance is educational and supportive in nature, designed to complement professional healthcare under doctor supervision.

## System Context Diagram

```mermaid
C4Context
    title System Context - Keep Going Care Healthcare Platform

    Person(admin, "KGC Admin", "System administrator managing doctors and platform")
    Person(doctor, "Doctor/Clinician", "Healthcare provider managing patient care plans")
    Person(patient, "Patient/User", "Individual receiving care guidance and support")

    System(kgc_platform, "KGC Platform", "Healthcare management platform with AI assistance<br/>Class I Software as Medical Device<br/>NON-DIAGNOSTIC")

    System_Ext(openai, "OpenAI", "GPT-4o for AI responses")
    System_Ext(anthropic, "Anthropic", "Claude 3.7 Sonnet for AI responses")
    System_Ext(sendgrid, "SendGrid", "Email authentication and notifications")
    System_Ext(twilio, "Twilio", "SMS authentication and alerts")
    System_Ext(tavily, "Tavily", "Web search for health content")
    System_Ext(neon, "Neon Database", "PostgreSQL serverless hosting")

    Rel(admin, kgc_platform, "Manages system", "HTTPS/Email Auth")
    Rel(doctor, kgc_platform, "Sets care plan directives", "HTTPS/Email Auth")
    Rel(patient, kgc_platform, "Tracks health, gets guidance", "HTTPS/SMS Auth")

    Rel(kgc_platform, openai, "AI responses", "API/TLS")
    Rel(kgc_platform, anthropic, "AI responses", "API/TLS")
    Rel(kgc_platform, sendgrid, "Authentication emails", "API/TLS")
    Rel(kgc_platform, twilio, "SMS verification", "API/TLS")
    Rel(kgc_platform, tavily, "Health content search", "API/TLS")
    Rel(kgc_platform, neon, "Data persistence", "PostgreSQL/TLS")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="2")
```

## Container Diagram

```mermaid
C4Container
    title Container Diagram - KGC Platform Internal Architecture

    Person(admin, "Admin")
    Person(doctor, "Doctor") 
    Person(patient, "Patient")

    Container_Boundary(kgc_platform, "KGC Platform") {
        Container(web_app, "Web Frontend", "React 18 + TypeScript + Vite", "Patient/Doctor/Admin dashboards<br/>Real-time health tracking<br/>PWA with offline support")
        
        Container(api_server, "Backend API", "Express.js + TypeScript", "RESTful API (50+ endpoints)<br/>Session-based authentication<br/>Business logic coordination")
        
        Container(ai_layer, "AI Services Layer", "Node.js + TypeScript", "Supervisor Agent<br/>Privacy Protection Agent<br/>9 MCP Healthcare Tools")
        
        Container(privacy_proxy, "Privacy Proxy", "TypeScript Service", "PII anonymization<br/>Secure AI interaction gateway<br/>Data protection compliance")
    }

    ContainerDb(postgres, "PostgreSQL", "Neon Serverless", "User hierarchy<br/>Health metrics<br/>Care plan directives<br/>15+ healthcare tables")
    
    ContainerDb(redis, "Redis Cache", "Optional/In-Memory", "Session storage<br/>Real-time data caching<br/>Performance optimization")

    Container_Ext(email_queue, "Email Service", "SendGrid API", "Authentication codes<br/>Progress reports<br/>Alert notifications")
    
    System_Ext(llm_providers, "AI Providers", "OpenAI + Anthropic", "Multi-provider AI responses<br/>Fallback capability")

    Rel(admin, web_app, "Manages system", "HTTPS")
    Rel(doctor, web_app, "Sets CPDs", "HTTPS") 
    Rel(patient, web_app, "Health tracking", "HTTPS")

    Rel(web_app, api_server, "API calls", "JSON/HTTPS")
    Rel(api_server, ai_layer, "AI coordination", "Internal")
    Rel(ai_layer, privacy_proxy, "Data anonymization", "Internal")
    Rel(privacy_proxy, llm_providers, "Safe AI queries", "API/TLS")

    Rel(api_server, postgres, "Data operations", "SQL/TLS")
    Rel(api_server, redis, "Session storage", "Redis Protocol")
    Rel(api_server, email_queue, "Email dispatch", "API/TLS")

    UpdateLayoutConfig($c4ShapeInRow="2", $c4BoundaryInRow="1")
```

## Sequence Diagrams

### 1. Passwordless Sign-in via SendGrid

```mermaid
sequenceDiagram
    participant U as User (Patient/Doctor/Admin)
    participant F as Web Frontend
    participant API as Backend API
    participant EA as Email Auth Service
    participant SG as SendGrid
    participant DB as PostgreSQL

    U->>F: Enter email address
    F->>API: POST /api/email-auth/send-pin
    API->>DB: Check user exists & role
    DB-->>API: User record + role
    API->>EA: Generate 6-digit PIN
    EA->>SG: Send authentication email
    SG-->>EA: Email sent confirmation
    EA-->>API: PIN sent successfully
    API-->>F: {success: true, message: "Check email"}
    F-->>U: "PIN sent to your email"
    
    Note over U,SG: User checks email and gets PIN
    
    U->>F: Enter PIN code
    F->>API: POST /api/email-auth/verify-pin
    API->>EA: Validate PIN
    EA->>DB: Store session data
    DB-->>EA: Session created
    EA-->>API: Authentication successful
    API-->>F: {authenticated: true, role: "patient", dashboardType: "patient"}
    F-->>U: Redirect to appropriate dashboard
```

### 2. Patient Daily Self-Scores Update

```mermaid
sequenceDiagram
    participant P as Patient
    participant F as Frontend
    participant API as Backend API  
    participant HS as Health Metrics Service
    participant SA as Supervisor Agent
    participant BS as Badge Service
    participant DB as PostgreSQL

    P->>F: Submit daily scores (medication: 8, diet: 6, exercise: 7)
    F->>API: POST /api/health-metrics
    API->>HS: Process health scores
    HS->>DB: Insert into healthMetrics table
    DB-->>HS: Record saved with timestamp
    
    HS->>SA: Trigger milestone check
    SA->>DB: Query progress milestones
    DB-->>SA: Current milestone status
    SA->>BS: Calculate badge eligibility
    BS->>DB: Update patient badges if earned
    DB-->>BS: Badge status updated
    
    BS-->>SA: Badge achievement result
    SA-->>HS: Progress analysis complete
    HS-->>API: {success: true, badgeEarned: true, milestone: "7-day streak"}
    API-->>F: Success response with achievements
    F-->>P: "Scores saved! 🏆 You earned a streak badge!"
    
    Note over SA,DB: Real-time CPD compliance scoring
    SA->>DB: Update compliance metrics
    DB-->>SA: Compliance scores updated
```

### 3. Doctor Sets Care Plan Directives → Agent Guidance

```mermaid
sequenceDiagram
    participant D as Doctor
    participant F as Frontend  
    participant API as Backend API
    participant CPD as CPD Service
    participant SA as Supervisor Agent
    participant PF as Patient Frontend
    participant DB as PostgreSQL

    D->>F: Create new CPD "Reduce sodium to <2300mg daily"
    F->>API: POST /api/users/{patientId}/care-plan-directives
    API->>CPD: Validate and process directive
    CPD->>DB: Insert into carePlanDirectives table
    DB-->>CPD: CPD saved with ID
    
    CPD->>SA: Notify new directive for patient
    SA->>DB: Link CPD to patient context
    DB-->>SA: Patient profile updated
    SA-->>CPD: Directive integration complete
    CPD-->>API: {success: true, id: 123, active: true}
    API-->>F: CPD created successfully
    F-->>D: "Care plan directive saved"
    
    Note over SA,PF: Real-time sync to patient
    SA->>PF: WebSocket: New CPD available
    PF->>PF: Update patient dashboard
    PF->>P: "New care guidance from Dr. Smith available"
    
    Note over SA,DB: Agent learns new directive
    SA->>DB: Update patient context for AI
    DB-->>SA: Context enriched with CPD goals
```

### 4. KGC Chat Turn with Privacy-Redaction Proxy

```mermaid
sequenceDiagram
    participant P as Patient
    participant F as Frontend
    participant API as Backend API
    participant SA as Supervisor Agent  
    participant PPA as Privacy Protection Agent
    participant MCP as MCP Service
    participant AI as OpenAI/Anthropic
    participant DB as PostgreSQL

    P->>F: "I'm struggling with my diabetes medication timing"
    F->>API: POST /api/chat
    API->>SA: Process patient message
    SA->>DB: Load patient context (CPDs, health metrics)
    DB-->>SA: Patient profile + recent scores
    
    SA->>PPA: Anonymize message for AI
    PPA->>PPA: Detect PII: "diabetes" → "CONDITION_A"
    PPA-->>SA: {anonymized: "I'm struggling with my CONDITION_A medication timing", sessionId: "uuid123"}
    
    SA->>MCP: Select appropriate healthcare tool
    MCP->>AI: Call with anonymized context
    AI-->>MCP: "For CONDITION_A medication timing, consider..."
    MCP-->>SA: AI response received
    
    SA->>PPA: De-anonymize response
    PPA->>PPA: Replace placeholders: "CONDITION_A" → "diabetes"
    PPA-->>SA: "For diabetes medication timing, consider..."
    
    SA->>DB: Log interaction for compliance
    DB-->>SA: Audit trail recorded
    SA-->>API: {message: "Helpful response", emergencyDetected: false}
    API-->>F: Chat response
    F-->>P: Display AI guidance with CPD alignment
```

### 5. Generating Progress Snapshots & Sentiment Rollups

```mermaid
sequenceDiagram
    participant D as Doctor
    participant F as Frontend
    participant API as Backend API
    participant PPR as PPR Analysis Service
    participant SA as Supervisor Agent
    participant EMAIL as Email Service
    participant DB as PostgreSQL

    D->>F: Request patient progress report
    F->>API: GET /api/users/{patientId}/progress-report
    API->>PPR: Generate comprehensive report
    
    PPR->>DB: Query health metrics (last 30 days)
    DB-->>PPR: Health score trends
    PPR->>DB: Query CPD compliance rates
    DB-->>PPR: Compliance percentages
    PPR->>DB: Query feature usage patterns  
    DB-->>PPR: Engagement metrics
    
    PPR->>SA: Analyze sentiment and progress
    SA->>SA: Calculate improvement trends
    SA->>SA: Assess CPD adherence patterns
    SA->>SA: Generate sentiment analysis
    SA-->>PPR: {sentiment: "positive", compliance: {diet: 82%, exercise: 78%, medication: 95%}}
    
    PPR->>PPR: Compile comprehensive report
    PPR->>DB: Save report to patientProgressReports table
    DB-->>PPR: Report saved with ID
    
    PPR->>EMAIL: Send report to doctor
    EMAIL-->>PPR: Email sent successfully
    PPR-->>API: {reportId: 456, summary: "Patient showing 15% improvement..."}
    API-->>F: Progress report generated
    F-->>D: Display comprehensive patient insights
```

## Data Flow Architecture

### Core Data Entities
- **Users** (hierarchical: admin → doctor → patient)
- **Care Plan Directives** (doctor-defined health goals)
- **Health Metrics** (real-time patient scores)
- **Patient Scores** (official daily submissions)
- **Progress Milestones** (achievement tracking)
- **Chat Memory** (AI context and learning)

### Real-time Data Flows
1. **Health Score Submission** → Immediate CPD compliance calculation
2. **CPD Updates** → Real-time patient dashboard sync
3. **Chat Interactions** → Context-aware AI responses
4. **Achievement Triggers** → Badge system activation
5. **Emergency Detection** → Immediate alert escalation

## Deployment Architecture

### Target Deployment Environments

#### Primary: AWS Asia Pacific (Sydney) - ap-southeast-2
- **Compute:** AWS App Runner (containerized deployment)
- **Database:** Neon PostgreSQL (serverless, auto-scaling)
- **Secrets:** AWS Secrets Manager
- **CDN:** CloudFront for static assets
- **Monitoring:** CloudWatch for healthcare compliance logging

#### Alternative: Google Cloud Platform
- **Compute:** Google Cloud Run (serverless containers)
- **Database:** Cloud SQL PostgreSQL or Neon
- **Secrets:** Google Secret Manager
- **CDN:** Cloud CDN

#### Development: Replit
- **Environment:** Unified development platform
- **Database:** In-memory fallback for rapid development
- **Hot Reload:** Vite + tsx for instant feedback

### Security & Compliance Considerations
- **TLS/HTTPS:** All communications encrypted
- **PII Protection:** Privacy proxy before external AI calls
- **Audit Logging:** All healthcare interactions logged
- **Session Security:** HTTP-only cookies + JWT tokens
- **Rate Limiting:** Protection against abuse
- **Emergency Detection:** Real-time safety monitoring

### Scalability Patterns
- **Stateless Backend:** Horizontal scaling ready
- **Database Connection Pooling:** Efficient resource usage
- **CDN Integration:** Global asset delivery
- **Microservice Architecture:** Independent service scaling
- **AI Provider Failover:** Multi-provider reliability

## Technology Stack Summary

### Frontend
- **React 18** with TypeScript for type safety
- **Vite** for fast development and optimized builds
- **Tailwind CSS + shadcn/ui** for consistent design
- **TanStack Query** for efficient data fetching
- **PWA** capabilities for offline access

### Backend  
- **Express.js** with TypeScript for API services
- **Drizzle ORM** for type-safe database operations
- **PostgreSQL** for healthcare data persistence
- **WebSocket** for real-time patient updates

### AI Integration
- **Model Context Protocol (MCP)** for healthcare tools
- **OpenAI GPT-4o** for primary AI responses
- **Anthropic Claude 3.7** for secondary AI provider  
- **Privacy Protection Agent** for PII anonymization

### External Services
- **SendGrid** for email authentication and notifications
- **Twilio** for SMS verification and alerts
- **Tavily** for validated health content search
- **AWS/GCP** for production infrastructure

### Healthcare Compliance
- **TGA Class I SaMD** architecture
- **HIPAA-ready** data protection
- **Audit logging** for regulatory compliance
- **Emergency detection** for patient safety

## TODO: Architecture Verification Needed

- **Load balancing configuration** for high availability
- **Database backup and disaster recovery** procedures  
- **Performance monitoring** integration beyond basic logging
- **Multi-region deployment** strategy for global access
- **Container orchestration** beyond single instance deployment
- **API versioning** strategy for healthcare integrations
- **Clinical workflow integration** with existing hospital systems
- **Medication interaction checking** capabilities validation
- **Healthcare outcome tracking** methodology confirmation