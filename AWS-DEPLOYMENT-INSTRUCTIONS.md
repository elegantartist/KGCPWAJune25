# Keep Going Care (KGC) AWS Deployment Instructions

## Overview
The Keep Going Care healthcare application is ready for production AWS deployment. This guide provides complete instructions for AWS integration and deployment.

## Pre-Deployment Checklist
✅ Application built and packaged (`keep-going-care-aws-deployment.tar.gz`)  
✅ Healthcare-grade security implemented with bcryptjs  
✅ Session management configured for Redis production storage  
✅ Email PIN authentication system operational  
✅ Database schema ready for PostgreSQL deployment  

## Required AWS Services

### 1. Database Setup - Amazon RDS PostgreSQL
```bash
# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier kgc-healthcare-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username kgcadmin \
  --master-user-password [SECURE_PASSWORD] \
  --allocated-storage 20 \
  --vpc-security-group-ids [YOUR_SECURITY_GROUP] \
  --backup-retention-period 7 \
  --storage-encrypted
```

### 2. Cache Setup - Amazon ElastiCache Redis
```bash
# Create Redis cluster for session storage
aws elasticache create-cache-cluster \
  --cache-cluster-id kgc-sessions \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --security-group-ids [YOUR_SECURITY_GROUP]
```

### 3. Application Hosting Options

#### Option A: AWS Elastic Beanstalk (Recommended)
1. Create new Elastic Beanstalk application:
```bash
eb init kgc-healthcare --region us-east-1 --platform "Node.js 20"
eb create kgc-production --instance-type t3.small
```

2. Upload deployment package:
   - Use `keep-going-care-aws-deployment.tar.gz` file
   - Select Node.js 20 platform version

#### Option B: AWS ECS with Fargate
1. Create ECS cluster:
```bash
aws ecs create-cluster --cluster-name kgc-healthcare-cluster
```

2. Create task definition using provided Dockerfile
3. Create service with load balancer

#### Option C: AWS EC2 Instance
1. Launch EC2 instance (t3.small minimum)
2. Install Node.js 20, PM2, and Nginx
3. Extract deployment package and configure

## Required Environment Variables

Set these in your AWS deployment environment:

### Database Configuration
```env
DATABASE_URL=postgresql://kgcadmin:[PASSWORD]@[RDS_ENDPOINT]:5432/kgc_healthcare
NODE_ENV=production
PORT=5000
```

### Session & Cache Configuration
```env
REDIS_URL=redis://[ELASTICACHE_ENDPOINT]:6379
SESSION_SECRET=[GENERATE_SECURE_32_CHAR_STRING]
```

### Email Authentication System
```env
SENDGRID_API_KEY=[YOUR_SENDGRID_API_KEY]
EMAIL_FROM=welcome@keepgoingcare.com
```

### SMS Authentication (Twilio)
```env
TWILIO_ACCOUNT_SID=[YOUR_ACCOUNT_SID]
TWILIO_AUTH_TOKEN=[YOUR_AUTH_TOKEN]
TWILIO_PHONE_NUMBER=[YOUR_TWILIO_PHONE]
```

### AI Services
```env
OPENAI_API_KEY=[YOUR_OPENAI_KEY]
ANTHROPIC_API_KEY=[YOUR_ANTHROPIC_KEY]
TAVILY_API_KEY=[YOUR_TAVILY_KEY]
```

### Security Configuration
```env
ADMIN_EMAIL=admin@keepgoingcare.com
DOCTOR_EMAIL=marijke.collins@keepgoingcare.com
PATIENT_EMAIL=reuben.collins@keepgoingcare.com
```

## Database Migration Steps

1. **Connect to RDS Instance:**
```bash
psql postgresql://kgcadmin:[PASSWORD]@[RDS_ENDPOINT]:5432/postgres
```

2. **Create Application Database:**
```sql
CREATE DATABASE kgc_healthcare;
CREATE USER kgc_app WITH PASSWORD '[APP_PASSWORD]';
GRANT ALL PRIVILEGES ON DATABASE kgc_healthcare TO kgc_app;
```

3. **Run Database Migrations:**
```bash
# After deployment, run migrations
npm run db:push
```

4. **Seed Initial Users (Optional):**
```bash
# For demo purposes only - use real user data in production
NODE_ENV=production npm run seed:quick
```

## Security Configuration

### 1. AWS Security Groups
Create security groups with these rules:

**Web Application Security Group:**
- Port 80 (HTTP) - Inbound from 0.0.0.0/0
- Port 443 (HTTPS) - Inbound from 0.0.0.0/0
- Port 5000 (App) - Inbound from Load Balancer only

**Database Security Group:**
- Port 5432 (PostgreSQL) - Inbound from Web Application SG only

**Cache Security Group:**
- Port 6379 (Redis) - Inbound from Web Application SG only

### 2. SSL/TLS Certificate
```bash
# Request SSL certificate through AWS Certificate Manager
aws acm request-certificate \
  --domain-name yourdomain.com \
  --validation-method DNS \
  --subject-alternative-names www.yourdomain.com
```

### 3. Load Balancer Configuration
- Enable HTTPS redirect (HTTP → HTTPS)
- Configure health check endpoint: `/api/ping`
- Set up sticky sessions for authentication

## DNS and Domain Setup

### 1. Route 53 Configuration
```bash
# Create hosted zone
aws route53 create-hosted-zone \
  --name yourdomain.com \
  --caller-reference kgc-$(date +%s)
```

### 2. Point Domain to Load Balancer
Create A record pointing to Application Load Balancer

## Monitoring and Logging

### 1. CloudWatch Configuration
- Enable application logs
- Set up custom metrics for healthcare compliance
- Configure alerts for system health

### 2. AWS WAF (Web Application Firewall)
```bash
# Create WAF for additional security
aws wafv2 create-web-acl \
  --name kgc-healthcare-waf \
  --scope CLOUDFRONT
```

## Healthcare Compliance Features

### 1. HIPAA Compliance Checklist
✅ Encryption in transit (HTTPS/TLS)  
✅ Encryption at rest (RDS encryption)  
✅ Access logging (CloudWatch)  
✅ Session management (Redis)  
✅ Role-based access control  
✅ Audit trail implementation  

### 2. TGA SaMD Compliance
✅ Class I Software as Medical Device standards  
✅ Privacy Protection Agent for PII anonymization  
✅ Healthcare-appropriate authentication timeouts  
✅ Comprehensive error handling and logging  

## Deployment Commands

### Initial Deployment
```bash
# 1. Upload deployment package to S3
aws s3 cp keep-going-care-aws-deployment.tar.gz s3://your-deployment-bucket/

# 2. Deploy to Elastic Beanstalk
eb deploy kgc-production

# 3. Set environment variables
eb setenv DATABASE_URL="[DB_URL]" REDIS_URL="[REDIS_URL]" [OTHER_VARS]

# 4. Verify deployment
curl https://your-domain.com/api/ping
```

### Post-Deployment Verification
1. Test authentication endpoints:
   - `POST /api/email-auth/send-pin`
   - `POST /api/email-auth/verify-pin`

2. Verify database connectivity:
   - Check application logs for successful database connection

3. Test session management:
   - Confirm Redis connection in CloudWatch logs

4. Validate healthcare features:
   - Admin dashboard access
   - Doctor dashboard functionality
   - Patient authentication flow

## Scaling Configuration

### Auto Scaling Settings
```bash
# Configure auto scaling group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name kgc-asg \
  --min-size 2 \
  --max-size 10 \
  --desired-capacity 2 \
  --health-check-type ELB \
  --health-check-grace-period 300
```

### Performance Optimization
- Enable CloudFront CDN for static assets
- Configure Redis clustering for high availability
- Set up RDS read replicas for reporting queries

## Backup and Disaster Recovery

### 1. Database Backups
- RDS automated backups (7-day retention)
- Weekly manual snapshots
- Cross-region backup replication

### 2. Application Backups
- CodeCommit repository backup
- S3 deployment package versioning
- Configuration parameter backup

## Support and Maintenance

### Monitoring Endpoints
- Health check: `GET /api/ping`
- Authentication status: `GET /api/auth/status`
- Database connectivity: Application logs

### Log Locations
- Application logs: CloudWatch `/aws/elasticbeanstalk/kgc-production/var/log/eb-docker/containers/eb-current-app/`
- Database logs: RDS CloudWatch logs
- Cache logs: ElastiCache CloudWatch logs

### Emergency Contacts
- Technical: Set up CloudWatch alarms with SNS notifications
- Healthcare Compliance: Configure audit log monitoring

## Cost Optimization

### Estimated Monthly Costs (USD)
- Elastic Beanstalk (t3.small): ~$25
- RDS PostgreSQL (db.t3.micro): ~$20
- ElastiCache Redis (cache.t3.micro): ~$15
- CloudWatch/Logging: ~$10
- **Total: ~$70/month**

### Cost Reduction Tips
- Use Reserved Instances for 1-3 year commitments
- Enable CloudWatch detailed monitoring selectively
- Set up automated instance scheduling for non-production

---

## Quick Start Summary

1. **Upload**: Use `keep-going-care-aws-deployment.tar.gz`
2. **Deploy**: Via Elastic Beanstalk with Node.js 20 platform
3. **Configure**: Set all environment variables listed above
4. **Connect**: RDS PostgreSQL + ElastiCache Redis
5. **Secure**: Enable HTTPS, WAF, and security groups
6. **Verify**: Test all authentication and healthcare endpoints

The application is production-ready with healthcare-grade security, unlimited user scaling, and comprehensive compliance features.