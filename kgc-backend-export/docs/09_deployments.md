# Deployment Guide

## Overview
The KGC Healthcare Platform uses a multi-service deployment strategy with frontend hosting on Vercel and backend services on AWS. This guide covers setup, configuration, and deployment processes for both preview and production environments.

## Architecture Overview
```mermaid
graph TB
    A[GitHub Repository] --> B[GitHub Actions CI/CD]
    B --> C[Vercel - Web Application]
    B --> D[AWS App Runner - API Service]
    B --> E[AWS Lambda - Privacy Proxy]
    
    C --> F[Vercel Edge Network]
    D --> G[PostgreSQL - Neon]
    D --> H[Redis - ElastiCache]
    E --> I[AWS Secrets Manager]
    
    F --> J[Global CDN]
    G --> K[Australian Data Centers]
    H --> K
    I --> K
```

## Deployment Targets

### Frontend Deployment - Vercel
- **Platform**: Vercel Edge Functions + Global CDN
- **Repository**: Auto-deploy from GitHub
- **Domains**: Production + Preview branches
- **Features**: Serverless functions, Edge middleware, Analytics

### Backend Deployment - AWS
- **API Service**: AWS App Runner (containerized)
- **Privacy Proxy**: AWS Lambda (serverless)
- **Database**: Neon PostgreSQL (serverless)
- **Caching**: ElastiCache Redis (optional)
- **Region**: ap-southeast-2 (Sydney) for Australian compliance

## GitHub Secrets Configuration

### Required Secrets for All Deployments
Navigate to: **Repository Settings → Secrets and variables → Actions**

#### Vercel Deployment Secrets
```bash
# Vercel Platform Integration
VERCEL_TOKEN=your_vercel_token_here
VERCEL_ORG_ID=your_vercel_org_id_here  
VERCEL_PROJECT_ID=your_vercel_project_id_here
```

#### AWS Deployment Secrets (Option 1 - OIDC Recommended)
```bash
# AWS OIDC Role (Recommended)
AWS_ROLE_ARN=arn:aws:iam::123456789012:role/GitHubActions-KGC-Deploy
```

#### AWS Deployment Secrets (Option 2 - IAM User Fallback)
```bash
# AWS IAM User Credentials (Fallback)
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

#### Application Secrets (Production)
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/kgc_production

# Authentication & Security
SESSION_SECRET=64_character_random_string_for_jwt_signing
ENCRYPTION_KEY=32_byte_base64_encryption_key_for_pii_protection

# AI Services
OPENAI_API_KEY=sk-proj-your-production-openai-key
ANTHROPIC_API_KEY=sk-ant-your-production-anthropic-key

# Communication Services  
TWILIO_ACCOUNT_SID=ACyour-production-twilio-account-sid
TWILIO_AUTH_TOKEN=your-production-twilio-auth-token
TWILIO_PHONE_NUMBER=+61412345678
SENDGRID_API_KEY=SG.your-production-sendgrid-key
SENDGRID_FROM_EMAIL=welcome@keepgoingcare.com

# Search & External APIs
TAVILY_API_KEY=tvly-your-production-tavily-key

# Healthcare Compliance
AUDIT_LOGGING_LEVEL=info
DATA_RESIDENCY_REGION=AU
REDACTION_POLICY_VERSION=v2.1
```

### GitHub Variables (Repository Settings → Variables)
```bash
# Frontend Build Configuration
VITE_API_BASE_URL=https://api.keepgoingcare.com
VITE_APP_ENV=production
VITE_ENABLE_DEBUG=false

# AWS Configuration
AWS_REGION=ap-southeast-2
ECR_REGISTRY=123456789012.dkr.ecr.ap-southeast-2.amazonaws.com
```

## Setting up Vercel Integration

### Step 1: Link Vercel Project
1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Link Project**:
   ```bash
   cd /path/to/kgc-healthcare
   vercel link
   ```

4. **Get Project Configuration**:
   ```bash
   vercel env pull .env.local
   cat .vercel/project.json
   ```

### Step 2: Configure Vercel Project Settings
1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your KGC project**
3. **Configure Settings**:
   - **Framework Preset**: Other (or Vite if detected)
   - **Root Directory**: `.` (monorepo root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Step 3: Environment Variables in Vercel
Navigate to: **Project Settings → Environment Variables**

#### Production Environment Variables
```bash
NODE_ENV=production
VITE_API_BASE_URL=https://api.keepgoingcare.com
VITE_APP_ENV=production
VITE_ENABLE_DEBUG=false
```

#### Preview Environment Variables  
```bash
NODE_ENV=development
VITE_API_BASE_URL=https://api-preview.keepgoingcare.com
VITE_APP_ENV=preview
VITE_ENABLE_DEBUG=true
```

### Step 4: Get Vercel Integration Secrets
```bash
# Get Vercel Token (Personal Access Token)
# Visit: https://vercel.com/account/tokens
# Create token with appropriate scopes

# Get Organization ID
vercel teams list
# Copy the ID for your organization

# Get Project ID  
vercel project list
# Copy the ID for your KGC project
```

## Setting up AWS Integration

### Option 1: OIDC Authentication (Recommended)

#### Step 1: Create AWS IAM OIDC Identity Provider
```bash
# Via AWS CLI
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
  --client-id-list sts.amazonaws.com
```

#### Step 2: Create IAM Role for GitHub Actions
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT-ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:your-username/kgc-healthcare:*"
        },
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
```

#### Step 3: Attach Required Policies
```bash
# App Runner deployment
aws iam attach-role-policy \
  --role-name GitHubActions-KGC-Deploy \
  --policy-arn arn:aws:iam::aws:policy/AWSAppRunnerFullAccess

# ECR image management  
aws iam attach-role-policy \
  --role-name GitHubActions-KGC-Deploy \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser

# Secrets Manager access
aws iam attach-role-policy \
  --role-name GitHubActions-KGC-Deploy \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite

# Custom policy for KGC-specific resources
aws iam put-role-policy \
  --role-name GitHubActions-KGC-Deploy \
  --policy-name KGCDeploymentPolicy \
  --policy-document file://aws-deployment-policy.json
```

### Option 2: IAM User Authentication (Fallback)

#### Step 1: Create IAM User
```bash
aws iam create-user --user-name github-actions-kgc
```

#### Step 2: Create Access Keys
```bash
aws iam create-access-key --user-name github-actions-kgc
```

#### Step 3: Attach Policies (Same as OIDC option)
```bash
aws iam attach-user-policy \
  --user-name github-actions-kgc \
  --policy-arn arn:aws:iam::aws:policy/AWSAppRunnerFullAccess
```

### AWS IAM Policy for KGC Deployment
Create `aws-deployment-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "apprunner:*",
        "ecr:*",
        "secretsmanager:*",
        "logs:*",
        "iam:PassRole",
        "elasticache:*",
        "rds:*",
        "lambda:*",
        "apigateway:*"
      ],
      "Resource": [
        "arn:aws:apprunner:ap-southeast-2:*:service/kgc-*",
        "arn:aws:ecr:ap-southeast-2:*:repository/kgc-*",
        "arn:aws:secretsmanager:ap-southeast-2:*:secret:kgc/*",
        "arn:aws:logs:ap-southeast-2:*:log-group:/aws/apprunner/kgc-*",
        "arn:aws:lambda:ap-southeast-2:*:function:kgc-*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "iam:GetRole",
        "iam:CreateRole",
        "iam:AttachRolePolicy"
      ],
      "Resource": "arn:aws:iam::*:role/kgc-*"
    }
  ]
}
```

## Deployment Workflows

### Vercel Deployment Triggers
```yaml
Automatic Deployments:
  - Push to main → Production deployment
  - Pull Request → Preview deployment
  - Branch push → Development deployment

Manual Deployments:
  - GitHub Actions workflow_dispatch
  - Vercel CLI deployment
  - Vercel dashboard deployment
```

### AWS Deployment Triggers
```yaml
Automatic Deployments:
  - Push to main → Production backend deployment
  - Commit message contains '[deploy-infra]' → Infrastructure update

Manual Deployments:
  - GitHub Actions workflow_dispatch
  - AWS CLI deployment
  - Infrastructure as Code (Terraform/CDK)
```

## Environment Configuration

### Development Environment
```yaml
Frontend: Vite dev server (http://localhost:5173)
Backend: Express dev server (http://localhost:5000)
Database: Local PostgreSQL or Neon development
AI Services: Test/sandbox API keys
SMS/Email: Test/sandbox services
```

### Preview Environment (Vercel)
```yaml
Frontend: Vercel preview deployment
Backend: AWS development/staging environment
Database: Staging database
AI Services: Limited production API keys
SMS/Email: Test/sandbox services  
Domain: https://kgc-healthcare-git-{branch}-{username}.vercel.app
```

### Production Environment
```yaml
Frontend: Vercel production deployment
Backend: AWS App Runner production
Database: Neon PostgreSQL production
AI Services: Full production API keys
SMS/Email: Production services
Domain: https://keepgoingcare.com (custom domain)
```

## Custom Domain Setup

### Vercel Custom Domain
1. **Add Domain in Vercel**:
   - Go to Project Settings → Domains
   - Add `keepgoingcare.com` and `www.keepgoingcare.com`

2. **Configure DNS Records**:
   ```dns
   # A Record
   @ → 76.76.19.61

   # CNAME Record  
   www → cname.vercel-dns.com

   # TXT Record (verification)
   _vercel → vc-domain-verify=keepgoingcare.com,xyz123
   ```

### AWS API Custom Domain
1. **Create Route 53 Hosted Zone** (if using Route 53)
2. **Request SSL Certificate** (AWS Certificate Manager)
3. **Configure API Gateway Custom Domain**
4. **Update DNS Records**

## Healthcare Compliance Configuration

### TGA Class I SaMD Compliance
```yaml
Deployment Features:
  - Non-diagnostic scope validation
  - Medical professional oversight boundaries
  - Emergency detection and routing
  - Australian data residency (ap-southeast-2)
  
Security Headers:
  - HSTS enforcement
  - Content Security Policy
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
```

### Australian Privacy Principles (APP)
```yaml
Data Protection:
  - PII anonymization before external processing
  - Audit logging for all data access
  - Encryption in transit and at rest
  - Data residency in Australian regions
  
Compliance Monitoring:
  - Cross-border data transfer logging
  - Access control validation
  - Data retention policy enforcement
  - Breach detection and notification
```

## Monitoring & Observability

### Vercel Analytics
```yaml
Built-in Features:
  - Web Vitals monitoring
  - Real User Monitoring (RUM)
  - Function execution metrics
  - Error tracking
```

### AWS Monitoring  
```yaml
CloudWatch Integration:
  - Application performance metrics
  - Container resource utilization
  - Database connection monitoring
  - Healthcare-specific KPIs

Custom Alerts:
  - Response time > 2 seconds
  - Error rate > 1%
  - Database connection failures
  - AI service rate limit approaching
```

## Rollback Procedures

### Frontend Rollback (Vercel)
```bash
# Via Vercel CLI
vercel rollback https://deployment-url.vercel.app

# Via Vercel Dashboard
# Go to Deployments → Select previous deployment → Promote
```

### Backend Rollback (AWS)
```bash
# App Runner service rollback
aws apprunner start-deployment \
  --service-arn arn:aws:apprunner:ap-southeast-2:account:service/kgc-api \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "previous-image-tag",
      "ImageConfiguration": {...}
    }
  }'
```

### Database Rollback
```bash
# PostgreSQL point-in-time recovery (if using RDS)
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier kgc-production \
  --target-db-instance-identifier kgc-rollback \
  --restore-time 2025-01-20T10:30:00Z

# Neon database branch restoration
# Use Neon console or API to restore from branch
```

## Troubleshooting

### Common Vercel Issues
```yaml
Build Failures:
  - Check build logs in Vercel dashboard
  - Verify environment variables are set
  - Ensure build command matches package.json
  - Check for memory/timeout limits

Domain Issues:
  - Verify DNS propagation (dig/nslookup)
  - Check SSL certificate status
  - Validate domain verification TXT record

Performance Issues:
  - Check bundle size and optimization
  - Verify CDN cache settings
  - Monitor Core Web Vitals
```

### Common AWS Issues
```yaml
Container Deployment Failures:
  - Check ECR image availability
  - Verify App Runner IAM role permissions
  - Review CloudWatch container logs
  - Check resource allocation limits

Database Connectivity:
  - Verify security group rules
  - Check VPC/subnet configuration
  - Validate connection string format
  - Monitor connection pool metrics

External Service Issues:
  - Validate API keys in Secrets Manager
  - Check rate limiting and quotas
  - Verify network connectivity
  - Monitor third-party service status
```

### Healthcare Compliance Issues
```yaml
Data Residency Violations:
  - Check AWS region configuration
  - Verify data storage locations
  - Monitor cross-border data transfers
  - Validate compliance audit logs

Privacy Protection Failures:
  - Check PII anonymization pipeline
  - Verify encryption key rotation
  - Monitor data access patterns
  - Review audit trail completeness
```

## Security Considerations

### Secrets Management
```yaml
Best Practices:
  - Rotate secrets regularly (quarterly)
  - Use separate secrets for each environment
  - Never commit secrets to version control
  - Monitor secret usage and access

GitHub Secrets Security:
  - Enable secret scanning
  - Use OIDC instead of long-lived credentials
  - Limit repository access permissions
  - Review secret access logs regularly
```

### Network Security
```yaml
Frontend (Vercel):
  - HTTPS enforcement
  - Security headers configuration
  - Content Security Policy (CSP)
  - XSS and CSRF protection

Backend (AWS):
  - VPC isolation (if applicable)
  - Security group restrictions
  - WAF protection (if using ALB)
  - Private subnet deployment
```

### Healthcare Data Security
```yaml
Encryption:
  - TLS 1.3 for data in transit
  - AES-256 for data at rest
  - Customer-managed encryption keys
  - Field-level encryption for PII/PHI

Access Control:
  - Multi-factor authentication
  - Role-based access control (RBAC)
  - Principle of least privilege
  - Regular access reviews
```

## Cost Optimization

### Vercel Costs
```yaml
Optimization Strategies:
  - Optimize bundle sizes
  - Use efficient image formats
  - Implement proper caching
  - Monitor bandwidth usage

Pro Plan Benefits:
  - Custom domains
  - Advanced analytics
  - Team collaboration
  - Priority support
```

### AWS Costs
```yaml
App Runner Optimization:
  - Right-size container resources
  - Use auto-scaling efficiently
  - Monitor idle time
  - Optimize container images

Database Optimization:
  - Use connection pooling
  - Implement query optimization
  - Monitor IOPS usage
  - Consider read replicas for scaling
```

## Support & Documentation

### Vercel Resources
- **Documentation**: https://vercel.com/docs
- **Community**: https://github.com/vercel/vercel/discussions  
- **Support**: https://vercel.com/support (Pro plans)

### AWS Resources
- **Documentation**: https://docs.aws.amazon.com/apprunner/
- **Community**: AWS Developer Forums
- **Support**: AWS Support (paid plans)
- **Training**: AWS Training and Certification

### KGC-Specific Support
- **Repository Issues**: GitHub Issues tab
- **Documentation**: `/docs` directory
- **Architecture**: `replit.md` system overview