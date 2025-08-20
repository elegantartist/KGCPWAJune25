# KGC Healthcare Application - Enhanced AWS Security Deployment

## Overview
Keep Going Care (KGC) with **Enhanced Enterprise Security** using AWS Cognito User Pools and IAM integration alongside existing healthcare authentication features.

## Security Architecture Enhancement
- **Existing**: Email PIN + SMS authentication for healthcare users
- **Enhanced**: AWS Cognito + IAM for admin/enterprise access
- **Hybrid**: Dual authentication system for maximum flexibility

## Deployment Package Ready
✅ **File**: `keep-going-care-aws-deployment.tar.gz` (6.3MB)  
✅ **Platform**: Node.js 20 with enhanced Cognito integration  
✅ **Security**: Healthcare + Enterprise-grade authentication  

## AWS Services Required

### 1. Primary Hosting
**AWS Elastic Beanstalk**
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
- Purpose: Session storage + Cognito token cache

### 4. Enhanced Security Services

#### AWS Cognito User Pool
```bash
# Create Cognito User Pool for admin access
aws cognito-idp create-user-pool \
  --pool-name "KGC-Healthcare-Admin-Pool" \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 12,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": true,
      "TemporaryPasswordValidityDays": 1
    }
  }' \
  --mfa-configuration "ON" \
  --account-recovery-setting '{
    "RecoveryMechanisms": [
      {"Name": "verified_email", "Priority": 1},
      {"Name": "verified_phone_number", "Priority": 2}
    ]
  }' \
  --user-pool-tags '{
    "Application": "KGC-Healthcare",
    "Environment": "Production",
    "Compliance": "HIPAA-Ready"
  }'
```

#### Cognito User Pool Client
```bash
# Create app client for admin dashboard
aws cognito-idp create-user-pool-client \
  --user-pool-id [USER_POOL_ID] \
  --client-name "KGC-Admin-Client" \
  --generate-secret \
  --supported-identity-providers "COGNITO" \
  --callback-urls "https://yourdomain.com/admin/callback" \
  --logout-urls "https://yourdomain.com/admin/logout" \
  --allowed-o-auth-flows "code" \
  --allowed-o-auth-scopes "openid" "email" "profile" \
  --allowed-o-auth-flows-user-pool-client
```

#### IAM Roles for Healthcare Compliance
```bash
# Create admin role with healthcare permissions
aws iam create-role \
  --role-name KGC-Healthcare-Admin \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Federated": "arn:aws:iam::[ACCOUNT]:oidc-provider/cognito-idp.[REGION].amazonaws.com/[USER_POOL_ID]"
        },
        "Action": "sts:AssumeRoleWithWebIdentity",
        "Condition": {
          "StringEquals": {
            "cognito-idp.[REGION].amazonaws.com/[USER_POOL_ID]:aud": "[CLIENT_ID]"
          }
        }
      }
    ]
  }'

# Create doctor role with limited permissions
aws iam create-role \
  --role-name KGC-Healthcare-Doctor \
  --assume-role-policy-document '[SIMILAR_POLICY_FOR_DOCTORS]'

# Create comprehensive healthcare policy
aws iam create-policy \
  --policy-name KGC-Healthcare-Access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "rds:DescribeDBInstances",
          "elasticache:DescribeCacheClusters",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "cloudwatch:PutMetricData"
        ],
        "Resource": "*",
        "Condition": {
          "StringEquals": {
            "aws:RequestedRegion": "[YOUR_REGION]"
          }
        }
      }
    ]
  }'
```

### 5. Security Groups with Enhanced Rules

**Application Security Group (Enhanced):**
```bash
aws ec2 create-security-group \
  --group-name KGC-App-Enhanced \
  --description "KGC Healthcare App with Cognito Integration"

# Allow HTTPS traffic
aws ec2 authorize-security-group-ingress \
  --group-id [SG_ID] \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Allow ALB health checks
aws ec2 authorize-security-group-ingress \
  --group-id [SG_ID] \
  --protocol tcp \
  --port 5000 \
  --source-group [ALB_SG_ID]
```

## Enhanced Environment Variables

### Core Application (Existing)
```env
# Database (Required)
DATABASE_URL=postgresql://[user]:[pass]@[rds-endpoint]:5432/kgc_healthcare
NODE_ENV=production
PORT=5000

# Cache (Required)
REDIS_URL=redis://[elasticache-endpoint]:6379
SESSION_SECRET=[generate-32-char-secure-string]

# Healthcare Authentication (Existing)
SENDGRID_API_KEY=[your-sendgrid-key]
TWILIO_ACCOUNT_SID=[your-twilio-sid]
TWILIO_AUTH_TOKEN=[your-twilio-token]
TWILIO_PHONE_NUMBER=[your-twilio-phone]

# AI Services (Required)
OPENAI_API_KEY=[your-openai-key]
ANTHROPIC_API_KEY=[your-anthropic-key]
TAVILY_API_KEY=[your-tavily-key]
```

### Enhanced Security (New)
```env
# AWS Cognito Configuration
AWS_REGION=[your-aws-region]
COGNITO_USER_POOL_ID=[user-pool-id-from-creation]
COGNITO_CLIENT_ID=[client-id-from-creation]
COGNITO_CLIENT_SECRET=[client-secret-from-creation]
COGNITO_DOMAIN=[your-cognito-domain].auth.[region].amazoncognito.com

# IAM Role ARNs
ADMIN_ROLE_ARN=arn:aws:iam::[ACCOUNT]:role/KGC-Healthcare-Admin
DOCTOR_ROLE_ARN=arn:aws:iam::[ACCOUNT]:role/KGC-Healthcare-Doctor

# Enhanced Security Features
ENABLE_COGNITO_ADMIN=true
ENABLE_MFA_ENFORCEMENT=true
SESSION_TIMEOUT_ADMIN=300000
SESSION_TIMEOUT_DOCTOR=1800000
SESSION_TIMEOUT_PATIENT=1800000

# Audit and Compliance
AUDIT_LOG_LEVEL=comprehensive
HIPAA_COMPLIANCE_MODE=enabled
TGA_SAMD_MODE=enabled
```

## Hybrid Authentication Flow

### 1. Admin Access (Enhanced with Cognito)
```
Admin → Cognito Login → MFA Challenge → JWT + IAM Role → Admin Dashboard
```

### 2. Healthcare Users (Existing System Preserved)
```
Doctor/Patient → Email Entry → PIN Verification → Session → Healthcare Dashboards
```

### 3. Emergency Admin Access (Failsafe)
```
Admin → Emergency Email PIN → Temporary Session → Limited Admin Access
```

## Security Implementation Code Changes

### Enhanced Authentication Middleware
```typescript
// server/middleware/cognitoAuth.ts (NEW FILE)
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { STSClient, AssumeRoleWithWebIdentityCommand } from '@aws-sdk/client-sts';

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse: 'access',
  clientId: process.env.COGNITO_CLIENT_ID!
});

export async function requireCognitoAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new Error('No token provided');
    
    const payload = await verifier.verify(token);
    
    // Assume IAM role based on user attributes
    const roleArn = payload['custom:role'] === 'admin' 
      ? process.env.ADMIN_ROLE_ARN 
      : process.env.DOCTOR_ROLE_ARN;
    
    const stsClient = new STSClient({ region: process.env.AWS_REGION });
    const assumeRoleCommand = new AssumeRoleWithWebIdentityCommand({
      RoleArn: roleArn,
      RoleSessionName: `KGC-${payload.sub}`,
      WebIdentityToken: token
    });
    
    const credentials = await stsClient.send(assumeRoleCommand);
    req.user = { ...payload, awsCredentials: credentials };
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid Cognito token' });
  }
}
```

### Hybrid Route Protection
```typescript
// server/routes/adminRoutes.ts (ENHANCED)
import { requireCognitoAuth } from '../middleware/cognitoAuth';
import { requireAuth } from '../middleware/authentication'; // Existing

// Enhanced admin routes with dual auth support
app.get('/api/admin/users', 
  // Try Cognito first, fallback to existing auth
  (req, res, next) => {
    if (req.headers.authorization?.startsWith('Bearer ')) {
      return requireCognitoAuth(req, res, next);
    } else {
      return requireAuth(req, res, next);
    }
  },
  async (req, res) => {
    // Admin functionality with enhanced security
  }
);
```

## Post-Deployment Setup

### 1. Create Cognito Users
```bash
# Create admin user
aws cognito-idp admin-create-user \
  --user-pool-id [USER_POOL_ID] \
  --username admin@keepgoingcare.com \
  --user-attributes Name=email,Value=admin@keepgoingcare.com Name=custom:role,Value=admin \
  --temporary-password TempPass123! \
  --message-action SUPPRESS

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id [USER_POOL_ID] \
  --username admin@keepgoingcare.com \
  --password [SECURE_PERMANENT_PASSWORD] \
  --permanent
```

### 2. Configure MFA
```bash
# Enable MFA for admin user
aws cognito-idp admin-set-user-mfa-preference \
  --user-pool-id [USER_POOL_ID] \
  --username admin@keepgoingcare.com \
  --sms-mfa-settings Enabled=true,PreferredMfa=true
```

### 3. Database Migration with Enhanced Schema
```sql
-- Add Cognito integration table
CREATE TABLE cognito_user_mappings (
  id SERIAL PRIMARY KEY,
  cognito_sub VARCHAR(255) UNIQUE NOT NULL,
  kgc_user_id INTEGER REFERENCES users(id),
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  mfa_enabled BOOLEAN DEFAULT false
);

-- Add audit table for enhanced security
CREATE TABLE security_audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  cognito_sub VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN,
  timestamp TIMESTAMP DEFAULT NOW(),
  additional_data JSONB
);
```

### 4. Verification Endpoints
```bash
# Test existing healthcare auth
curl -X POST https://yourdomain.com/api/email-auth/send-pin \
  -H "Content-Type: application/json" \
  -d '{"email": "marijke.collins@keepgoingcare.com"}'

# Test enhanced Cognito auth
curl -X GET https://yourdomain.com/api/admin/cognito-status \
  -H "Authorization: Bearer [COGNITO_JWT_TOKEN]"

# Test hybrid admin access
curl -X GET https://yourdomain.com/api/admin/users \
  -H "Authorization: Bearer [COGNITO_JWT_TOKEN]"
```

## Enhanced Security Features

### 1. Multi-Factor Authentication
- **SMS MFA**: Required for all admin Cognito users
- **TOTP MFA**: Optional authenticator app support
- **Backup Codes**: Emergency access codes

### 2. Session Management
- **Cognito JWT**: Short-lived access tokens (1 hour)
- **Refresh Tokens**: Secure token renewal
- **Session Invalidation**: Immediate logout across devices

### 3. Audit and Compliance
- **AWS CloudTrail**: All Cognito API calls logged
- **Enhanced Audit Log**: Security events in PostgreSQL
- **Real-time Monitoring**: Suspicious activity detection

### 4. Role-Based Access Control
```typescript
// Enhanced permissions matrix
const PERMISSIONS = {
  admin: [
    'users:create', 'users:read', 'users:update', 'users:delete',
    'doctors:assign', 'patients:reassign', 'audit:read',
    'system:configure', 'security:manage'
  ],
  doctor: [
    'patients:read', 'patients:update', 'cpd:create', 'cpd:update',
    'reports:generate', 'alerts:read'
  ],
  patient: [
    'profile:read', 'profile:update', 'scores:submit',
    'chat:access', 'features:use'
  ]
};
```

## Cost Estimate (Enhanced)
- **Existing Services**: ~$70/month
- **Cognito User Pool**: ~$5/month (50 MAU)
- **Additional IAM**: ~$0/month (included)
- **Enhanced Monitoring**: ~$10/month
- **Total: ~$85/month**

## Healthcare Compliance Enhancement

### HIPAA Compliance (Enhanced)
✅ Encryption in transit and at rest  
✅ Access logging with Cognito integration  
✅ Role-based access control with IAM  
✅ MFA enforcement for admin access  
✅ Session management with JWT tokens  
✅ Comprehensive audit trail  

### TGA SaMD Compliance (Enhanced)
✅ Class I medical device standards maintained  
✅ Enhanced user authentication and authorization  
✅ Comprehensive security monitoring  
✅ Professional healthcare user management  

## Deployment Commands (Enhanced)

### Initial Setup
```bash
# 1. Create Cognito resources
aws cognito-idp create-user-pool --cli-input-json file://cognito-config.json

# 2. Create IAM roles and policies
aws iam create-role --cli-input-json file://iam-roles.json

# 3. Upload deployment package
aws s3 cp keep-going-care-aws-deployment.tar.gz s3://your-deployment-bucket/

# 4. Deploy with enhanced environment variables
eb deploy kgc-production
eb setenv [ALL_ENHANCED_ENVIRONMENT_VARIABLES]

# 5. Verify enhanced security
curl https://your-domain.com/api/ping
curl https://your-domain.com/api/admin/cognito-health
```

## Security Monitoring Dashboard

### CloudWatch Metrics
- Cognito login attempts and failures
- MFA challenge success rates
- Session duration and patterns
- API endpoint access frequency

### Alerts Configuration
- Failed login attempts (>5 in 15 minutes)
- Unusual access patterns
- MFA bypass attempts
- Privilege escalation attempts

## Emergency Procedures

### 1. Cognito Service Unavailable
- Automatic fallback to existing email PIN system
- Emergency admin access via SMS verification
- Audit log of fallback authentication events

### 2. Compromise Detection
- Immediate session invalidation via Cognito
- Force password reset for affected users
- Temporary role privilege revocation

### 3. Disaster Recovery
- Cognito user pool backup and restore
- IAM role recreation procedures
- Enhanced audit log preservation

---

## Quick Start Summary (Enhanced)

1. **Upload**: Use `keep-going-care-aws-deployment.tar.gz`
2. **Deploy**: Via Elastic Beanstalk with Node.js 20
3. **Create**: Cognito User Pool and IAM roles
4. **Configure**: All environment variables (existing + enhanced)
5. **Connect**: RDS + Redis + Cognito + IAM
6. **Secure**: Enable MFA, HTTPS, WAF, and enhanced monitoring
7. **Verify**: Test both healthcare auth and Cognito admin access

**Result**: Enterprise-grade healthcare application with dual authentication systems, enhanced security, and full AWS integration while preserving all existing healthcare features.