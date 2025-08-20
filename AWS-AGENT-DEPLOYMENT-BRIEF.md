# KGC Healthcare Application - AWS Deployment Brief

## Application Overview
**Keep Going Care (KGC)** - Class I Software as Medical Device (SaMD)  
Healthcare platform with AI-powered patient management, doctor dashboards, and compliance features.

## Deployment Package Ready
✅ **File**: `keep-going-care-aws-deployment.tar.gz` (6.3MB)  
✅ **Platform**: Node.js 20 application  
✅ **Architecture**: Express.js backend + React frontend (pre-built)  
✅ **Security**: Healthcare-grade authentication with bcryptjs  

## AWS Services Required

### 1. Primary Hosting
**Recommended**: AWS Elastic Beanstalk
- Platform: Node.js 20
- Instance: t3.small minimum
- Upload: `keep-going-care-aws-deployment.tar.gz`

### 2. Database
**Amazon RDS PostgreSQL**
- Engine: PostgreSQL 15.4
- Instance: db.t3.micro minimum
- Storage: 20GB encrypted
- Backup: 7-day retention

### 3. Session Cache
**Amazon ElastiCache Redis**
- Engine: Redis
- Node: cache.t3.micro
- Purpose: Session storage for healthcare compliance

### 4. Security
- **SSL Certificate**: AWS Certificate Manager
- **Load Balancer**: Application Load Balancer with HTTPS
- **Security Groups**: Restrict database/cache access to application only

## Critical Environment Variables

```env
# Database (Required)
DATABASE_URL=postgresql://[user]:[pass]@[rds-endpoint]:5432/kgc_healthcare
NODE_ENV=production

# Cache (Required)
REDIS_URL=redis://[elasticache-endpoint]:6379
SESSION_SECRET=[generate-32-char-secure-string]

# Email Authentication (Required)
SENDGRID_API_KEY=[your-sendgrid-key]

# SMS Authentication (Required)  
TWILIO_ACCOUNT_SID=[your-twilio-sid]
TWILIO_AUTH_TOKEN=[your-twilio-token]
TWILIO_PHONE_NUMBER=[your-twilio-phone]

# AI Services (Required)
OPENAI_API_KEY=[your-openai-key]
ANTHROPIC_API_KEY=[your-anthropic-key]

# Authorized Users (Required)
ADMIN_EMAIL=admin@keepgoingcare.com
DOCTOR_EMAIL=marijke.collins@keepgoingcare.com
PATIENT_EMAIL=reuben.collins@keepgoingcare.com
```

## Healthcare Compliance Features
✅ HIPAA-ready security implementation  
✅ TGA SaMD Class I compliance  
✅ Privacy Protection Agent (anonymizes PII before AI processing)  
✅ Role-based access control (Admin/Doctor/Patient)  
✅ Comprehensive audit logging  
✅ Healthcare-appropriate session timeouts  

## Post-Deployment Setup

### 1. Database Migration
```bash
# Run after first deployment
npm run db:push
```

### 2. Verification Endpoints
- Health: `GET /api/ping` (should return "pong")
- Auth: `GET /api/auth/status`
- Email auth: `POST /api/email-auth/send-pin`

### 3. User Access Flow
1. User visits landing page
2. Enters authorized email address
3. Receives PIN via SendGrid email
4. Authenticates and accesses appropriate dashboard

## Security Groups Configuration

**Application Security Group:**
- Port 80/443: Inbound from internet (0.0.0.0/0)
- Port 5000: Inbound from Load Balancer only

**Database Security Group:**
- Port 5432: Inbound from Application SG only

**Cache Security Group:**
- Port 6379: Inbound from Application SG only

## Estimated AWS Costs
- **Total: ~$70/month** (t3.small + db.t3.micro + cache.t3.micro)
- Production-ready with auto-scaling capability

## Application Architecture
- **Frontend**: React SPA (pre-built, served from Express)
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Email PIN + SMS verification
- **AI Integration**: OpenAI GPT-4o + Anthropic Claude
- **Session Management**: Redis-based for healthcare compliance

## Key Features for Healthcare
- **Unlimited user scaling** with professional healthcare UIDs
- **AI-powered patient analysis** with privacy protection
- **Doctor dashboard** with Patient Progress Reports (PPR)
- **Patient engagement** with daily self-scoring and AI chatbot
- **Care Plan Directives (CPD)** management system
- **Emergency detection** across all patient interactions

## Ready for Production
✅ Build completed successfully  
✅ All healthcare features operational  
✅ Security hardening complete  
✅ AWS deployment package prepared  
✅ Database schema ready  
✅ Environment configuration documented  

**This application is production-ready for immediate AWS deployment with healthcare-grade security and compliance.**