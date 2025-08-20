SIZE: 15987 bytes

# Knowledge Card 00: Sitemap and Stack Overview

## Project Identity
- **Name**: Keep Going Care (KGC) Healthcare Platform
- **Classification**: TGA Class I SaMD (Software as Medical Device)
- **Compliance**: Australian Privacy Principles, HIPAA-aligned
- **Scale**: 1 Admin, 10 Doctors, 50+ Patients (extensible to millions)

## Technology Stack

### Frontend Stack
```
Framework: React 18 + TypeScript + Vite
UI Library: shadcn/ui + Tailwind CSS + Radix UI
State Management: TanStack Query (React Query v5)
Routing: wouter
Forms: react-hook-form + zod validation
Icons: lucide-react, react-icons
Build Tool: Vite with HMR
```

### Backend Stack
```
Runtime: Node.js 20 + TypeScript
Framework: Express.js with middleware
ORM: Drizzle ORM + Drizzle Kit
Session: express-session + connect-pg-simple
Authentication: SMS-based MFA via Twilio
Rate Limiting: express-rate-limit
Security: helmet, cors, bcryptjs
```

### Database & Storage
```
Primary DB: PostgreSQL (Neon serverless)
Cache/Sessions: Redis (optional for production)
File Storage: Local filesystem (development)
Secrets: AWS Secrets Manager
```

### AI & External Services
```
AI Providers: OpenAI GPT-4o, Anthropic Claude 3.7 Sonnet
Email: SendGrid API
SMS: Twilio API
Monitoring: Winston logging
```

## File System Architecture

### Root Structure
```
/
├── client/                    # React frontend
├── server/                    # Express.js backend
├── shared/                    # Shared TypeScript schemas
├── docs/                      # Documentation
├── tools/                     # Scripts and utilities
├── public/                    # Static assets
├── attached_assets/           # User uploads
├── package.json              # Dependencies
├── vite.config.ts            # Build configuration
├── drizzle.config.ts         # Database configuration
└── replit.md                 # Project documentation
```

### Frontend Structure (`/client`)
```
client/
├── src/
│   ├── components/           # React components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── layout/          # Layout components
│   │   └── features/        # Feature-specific components
│   ├── pages/               # Page components
│   │   ├── auth/           # Authentication pages
│   │   ├── patient/        # Patient dashboard
│   │   ├── doctor/         # Doctor dashboard
│   │   └── admin/          # Admin dashboard
│   ├── lib/                # Utilities and configuration
│   │   ├── api.ts          # API client
│   │   ├── queryClient.ts  # TanStack Query setup
│   │   └── utils.ts        # Utility functions
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript type definitions
│   └── App.tsx             # Main application component
├── index.html              # HTML entry point
└── vite-env.d.ts          # Vite type definitions
```

### Backend Structure (`/server`)
```
server/
├── index.ts                # Application entry point
├── app.ts                  # Express app configuration
├── config/                 # Configuration files
│   ├── database.ts         # Database connection
│   ├── awsSecrets.ts      # AWS Secrets Manager
│   └── security.ts        # Security configuration
├── middleware/             # Express middleware
│   ├── auth.ts            # Authentication middleware
│   ├── validation.ts      # Input validation
│   ├── rateLimit.ts       # Rate limiting
│   └── audit.ts           # Audit logging
├── routes/                 # API route handlers
│   ├── auth.ts            # Authentication routes
│   ├── users.ts           # User management
│   ├── patients.ts        # Patient data
│   ├── doctors.ts         # Doctor features
│   ├── chat.ts            # AI chat endpoints
│   └── admin.ts           # Admin functions
├── services/               # Business logic services
│   ├── authService.ts     # Authentication logic
│   ├── chatService.ts     # AI chat service
│   ├── smsService.ts      # SMS notifications
│   └── emailService.ts    # Email notifications
├── storage.ts              # Data access layer
└── vite.ts                # Vite dev server integration
```

### Shared Structure (`/shared`)
```
shared/
├── schema.ts               # Database schema (Drizzle)
├── types.ts               # Shared TypeScript types
└── validation.ts          # Shared validation schemas
```

## Key API Endpoints

### Authentication APIs
```
POST /api/auth/request-sms          # Request SMS verification
POST /api/auth/verify-sms           # Verify SMS code
POST /api/auth/logout               # Logout user
GET  /api/auth/status               # Check auth status
```

### User Management APIs
```
GET    /api/users/profile           # Get user profile
PUT    /api/users/profile           # Update profile
GET    /api/users/patients          # List patients (doctors/admins)
POST   /api/users/create            # Create new user (admins)
DELETE /api/users/:id               # Delete user (admins)
```

### Health Data APIs
```
GET  /api/patients/:id/scores       # Get daily scores
POST /api/patients/:id/scores       # Submit daily score
GET  /api/patients/:id/progress     # Get progress report
GET  /api/patients/:id/cpd          # Get care plan directives
PUT  /api/patients/:id/cpd          # Update care plan (doctors)
```

### AI Chat APIs
```
POST /api/chat                      # Send message to AI
GET  /api/chat/history              # Get chat history
POST /api/chat/emergency            # Emergency detection endpoint
```

## Environment Configuration

### Development Environment
```
NODE_ENV=development
PORT=5000
DEBUG=true
LOG_LEVEL=debug

# Local database
DATABASE_URL=postgresql://localhost:5432/kgc_dev

# Development API keys (placeholder)
OPENAI_API_KEY=sk-dev-...
TWILIO_ACCOUNT_SID=dev_sid
SENDGRID_API_KEY=dev_key
```

### Production Environment
```
NODE_ENV=production
PORT=5000
DEBUG=false
LOG_LEVEL=info

# Production secrets (from AWS Secrets Manager)
DATABASE_URL=${from_aws_secrets}
SESSION_SECRET=${from_aws_secrets}
ENCRYPTION_KEY=${from_aws_secrets}

# External service keys
OPENAI_API_KEY=${from_aws_secrets}
ANTHROPIC_API_KEY=${from_aws_secrets}
TWILIO_ACCOUNT_SID=${from_aws_secrets}
TWILIO_AUTH_TOKEN=${from_aws_secrets}
SENDGRID_API_KEY=${from_aws_secrets}

# AWS configuration
AWS_REGION=ap-southeast-2
AWS_SECRET_NAME=prod/KGC/sec
```

## Deployment Architecture

### Current Deployment (Replit)
```
Frontend: Vite dev server (port 5173)
Backend: Express server (port 5000)
Database: Neon PostgreSQL (external)
Domain: *.replit.app
SSL: Automatic (Replit managed)
```

### Target Production Deployment
```
Frontend: Vercel (static deployment)
├── Domain: keepgoingcare.com
├── CDN: Global edge network
└── SSL: Automatic certificate

Backend: AWS App Runner
├── Region: ap-southeast-2 (Australia)
├── Auto-scaling: 1-10 instances
├── Health checks: /api/health
└── Domain: api.keepgoingcare.com

Database: Neon PostgreSQL
├── Region: Australia/Asia-Pacific
├── Backup: Automated daily
└── Connection pooling: Enabled

Secrets: AWS Secrets Manager
├── Encryption: KMS managed keys
├── Rotation: Automated quarterly
└── Access: IAM role-based
```

## User Journey Map

### Patient Journey
```
1. Registration/Login
   ├── Enter phone number
   ├── Receive SMS verification
   ├── Enter 6-digit code
   └── Access patient dashboard

2. Daily Health Scoring
   ├── View current scores widget
   ├── Submit daily scores (1-10 scale)
   ├── Add optional notes
   └── View progress trends

3. AI Chat Interaction
   ├── Ask health-related questions
   ├── Receive CBT/MI-guided responses
   ├── Emergency detection (if needed)
   └── View chat history

4. Care Plan Review
   ├── View assigned care directives
   ├── Mark items as completed
   ├── Track compliance scores
   └── Request doctor consultation
```

### Doctor Journey
```
1. Authentication
   ├── SMS-based login
   ├── Role verification
   └── Access doctor dashboard

2. Patient Management
   ├── View assigned patients list
   ├── Review patient progress
   ├── Analyze score trends
   └── Identify at-risk patients

3. Care Plan Management
   ├── Create new care directives
   ├── Modify existing plans
   ├── Set compliance targets
   └── Monitor patient adherence

4. Patient Communication
   ├── Review AI chat summaries
   ├── Flag concerning interactions
   ├── Provide clinical guidance
   └── Schedule interventions
```

### Admin Journey
```
1. System Administration
   ├── User account management
   ├── Role assignment
   ├── System health monitoring
   └── Audit log review

2. Compliance Management
   ├── Generate compliance reports
   ├── Privacy impact assessments
   ├── Data retention management
   └── Security incident response

3. Platform Analytics
   ├── Usage statistics
   ├── Performance metrics
   ├── AI effectiveness tracking
   └── Patient outcome analysis
```