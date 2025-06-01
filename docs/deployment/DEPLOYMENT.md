# Keep Going Care - Deployment Guide

This guide provides comprehensive instructions for deploying the Keep Going Care healthcare platform across different environments.

## 🚀 Quick Deploy Options

### Option 1: Local Development
```bash
npm install
cp .env.example .env
# Configure .env with your API keys
npm run db:push
npm run dev
```

### Option 2: Docker Deployment
```bash
docker build -t kgc-healthcare .
docker run -p 5000:5000 --env-file .env kgc-healthcare
```

### Option 3: AWS Cloud Deployment
```bash
npm run deploy:aws
```

## 📋 Pre-Deployment Checklist

### ✅ Environment Setup
- [ ] PostgreSQL database provisioned and accessible
- [ ] All API keys obtained and configured in `.env`
- [ ] SMS service (Twilio) configured and tested
- [ ] Email service (SendGrid) configured and tested
- [ ] Session secrets generated (64+ character random strings)

### ✅ Healthcare Compliance
- [ ] Data retention policies configured (7-10 years by Australian state)
- [ ] Patient privacy anonymization verified
- [ ] Emergency contact systems tested
- [ ] Admin override capabilities confirmed
- [ ] Audit logging enabled

### ✅ Security Configuration
- [ ] HTTPS enabled for production
- [ ] Session timeouts configured (5 min doctors, 30 min patients)
- [ ] Database connections secured with SSL
- [ ] API keys stored securely (not in code)
- [ ] Emergency monitoring systems active

## 🔧 Environment Configuration

### Required API Services

#### 1. Database (PostgreSQL)
```env
DATABASE_URL=postgresql://user:pass@host:port/db
```
**Setup Options:**
- **Neon** (Recommended): https://neon.tech/
- **Supabase**: https://supabase.com/
- **AWS RDS**: https://aws.amazon.com/rds/
- **Self-hosted**: PostgreSQL 14+

#### 2. AI Services
```env
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
```
**Required for:**
- Healthcare chatbot responses
- Patient interaction analysis
- Emergency detection algorithms

#### 3. Communication Services
```env
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+61400000000
SENDGRID_API_KEY=SG.xxxxx
```
**Required for:**
- SMS-based authentication
- Welcome email automation
- Emergency alert notifications

## 🏥 Healthcare-Specific Setup

### 1. Care Plan Directives Configuration
```javascript
// Maximum 3 CPDs per patient (regulatory requirement)
const MAX_CPDS_PER_PATIENT = 3;

// Standard categories: Diet, Exercise, Medication
const CPD_CATEGORIES = ['Diet', 'Exercise', 'Medication'];
```

### 2. Emergency Monitoring Keywords
Configure monitoring for patient safety:
```javascript
const EMERGENCY_KEYWORDS = [
  'suicide', 'self-harm', 'hurt myself', 'end it all',
  'chest pain', 'can\'t breathe', 'overdose', 'emergency'
];
```

### 3. Daily Self-Score Targets
```javascript
// Target range for optimal patient outcomes
const OPTIMAL_SCORE_RANGE = { min: 8, max: 10 };
const REWARD_THRESHOLD = 8; // Minimum for earning rewards
```

## 🚀 Deployment Environments

### Development Environment
```bash
# Local development with hot reload
npm run dev

# Database development mode
npm run db:studio  # Opens Drizzle Studio for database management
```

### Staging Environment
```bash
# Build for staging
npm run build:staging

# Deploy to staging
npm run deploy:staging
```

### Production Environment
```bash
# Production build with optimizations
npm run build

# Production deployment
npm run deploy:production
```

## 📦 Docker Deployment

### Single Container
```dockerfile
# Dockerfile (included in project)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

### Docker Compose (with database)
```yaml
version: '3.8'
services:
  kgc-app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/kgc
    depends_on:
      - db
  
  db:
    image: postgres:14
    environment:
      POSTGRES_DB: kgc
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## ☁️ AWS Cloud Deployment

### Automated AWS Deployment
```bash
# Install AWS CLI
aws configure

# Deploy using included script
npm run deploy:aws
```

### Manual AWS Setup

#### 1. Elastic Beanstalk
```bash
# Initialize EB application
eb init kgc-healthcare

# Create environment
eb create kgc-production

# Deploy
eb deploy
```

#### 2. ECS (Container Service)
```bash
# Build and push to ECR
aws ecr create-repository --repository-name kgc-healthcare
docker build -t kgc-healthcare .
docker tag kgc-healthcare:latest YOUR_ECR_URI/kgc-healthcare:latest
docker push YOUR_ECR_URI/kgc-healthcare:latest
```

#### 3. Lambda (Serverless)
```bash
# Package for Lambda
npm run package:lambda

# Deploy with SAM
sam deploy --guided
```

## 🔍 Post-Deployment Verification

### Health Checks
```bash
# Check application health
curl https://your-domain.com/api/health

# Verify database connection
curl https://your-domain.com/api/db/status

# Test authentication flow
curl -X POST https://your-domain.com/api/sms/send-verification
```

### Healthcare Feature Tests
- [ ] SMS authentication working
- [ ] Email notifications sending
- [ ] AI chatbot responding with British English
- [ ] Care Plan Directives creating (max 3)
- [ ] Daily self-scores recording
- [ ] Emergency detection active
- [ ] Patient data anonymization working

### Performance Monitoring
```bash
# Load testing
npm run test:load

# Performance metrics
npm run monitor:performance

# Healthcare compliance audit
npm run audit:healthcare
```

## 📊 Monitoring & Maintenance

### Application Monitoring
- **Health endpoint**: `/api/health`
- **Database status**: `/api/db/status`
- **AI service status**: `/api/ai/status`
- **Emergency system**: `/api/emergency/status`

### Log Monitoring
```bash
# Application logs
tail -f logs/application.log

# Healthcare audit logs
tail -f logs/healthcare-audit.log

# Emergency alerts
tail -f logs/emergency-alerts.log
```

### Backup Procedures
```bash
# Database backup
npm run backup:database

# Patient data export (compliance)
npm run export:patient-data

# System configuration backup
npm run backup:config
```

## 🚨 Emergency Procedures

### System Downtime
1. **Alert healthcare providers** via SMS
2. **Activate backup communication channels**
3. **Ensure patient safety protocols** are followed
4. **Document incident** for compliance

### Data Recovery
```bash
# Restore from backup
npm run restore:database --backup-date=YYYY-MM-DD

# Verify data integrity
npm run verify:patient-data

# Test system functionality
npm run test:healthcare-features
```

## 🔒 Security Hardening

### Production Security Checklist
- [ ] HTTPS/TLS enabled and configured
- [ ] Database connections encrypted
- [ ] API keys in secure environment variables
- [ ] Session cookies secured (httpOnly, secure, sameSite)
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Vulnerability scanning completed

### Healthcare Data Protection
- [ ] Patient data anonymization verified
- [ ] Privacy Protection Agent active
- [ ] Audit logging comprehensive
- [ ] Data retention policies enforced
- [ ] Emergency access protocols tested

## 📞 Support & Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check database connectivity
npm run db:test-connection

# Reset database schema
npm run db:reset

# Re-run migrations
npm run db:push
```

#### AI Services Not Responding
```bash
# Test AI service connections
npm run test:ai-services

# Check API key validity
npm run verify:api-keys
```

#### SMS/Email Not Working
```bash
# Test communication services
npm run test:communications

# Verify service credentials
npm run verify:twilio
npm run verify:sendgrid
```

### Contact Information
- **Technical Support**: support@keepgoingcare.com
- **Healthcare Compliance**: compliance@keepgoingcare.com
- **Emergency Issues**: emergency@keepgoingcare.com
- **Admin Override**: admin@anthrocytai.com / +61433509441

---

**Remember**: This is healthcare software. Patient safety and data privacy are paramount. Always test thoroughly before deploying to production environments.