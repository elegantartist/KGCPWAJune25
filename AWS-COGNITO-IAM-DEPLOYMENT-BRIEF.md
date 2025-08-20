# KGC Healthcare - Enhanced Security AWS Deployment Brief

## Application Overview
**Keep Going Care (KGC)** - Class I Software as Medical Device (SaMD)  
Healthcare platform with **Enhanced Enterprise Security** using AWS Cognito + IAM alongside existing healthcare authentication.

## Security Architecture
- **Healthcare Users**: Email PIN + SMS authentication (preserved)
- **Admin/Enterprise**: AWS Cognito User Pools + IAM roles + MFA
- **Hybrid System**: Dual authentication for maximum security and flexibility

## Deployment Package Ready
✅ **File**: `keep-going-care-aws-deployment.tar.gz` (6.3MB)  
✅ **Platform**: Node.js 20 with Cognito integration capability  
✅ **Security**: Healthcare + Enterprise-grade authentication  

## AWS Services Required

### Core Services (Existing)
- **Elastic Beanstalk**: Node.js 20, t3.small minimum
- **RDS PostgreSQL**: 15.4, db.t3.micro, 20GB encrypted
- **ElastiCache Redis**: cache.t3.micro for sessions + token cache

### Enhanced Security Services (NEW)
- **AWS Cognito User Pool**: Admin authentication with MFA
- **IAM Roles**: Role-based healthcare permissions
- **CloudTrail**: Enhanced audit logging
- **CloudWatch**: Security monitoring and alerts

## AWS Cognito Setup Required

### 1. Create User Pool
```bash
aws cognito-idp create-user-pool \
  --pool-name "KGC-Healthcare-Admin-Pool" \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 12,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": true
    }
  }' \
  --mfa-configuration "ON"
```

### 2. Create App Client
```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id [POOL_ID] \
  --client-name "KGC-Admin-Client" \
  --generate-secret \
  --callback-urls "https://yourdomain.com/admin/callback" \
  --allowed-o-auth-flows "code"
```

## IAM Roles Setup Required

### 1. Admin Role
```bash
aws iam create-role \
  --role-name KGC-Healthcare-Admin \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::[ACCOUNT]:oidc-provider/cognito-idp.[REGION].amazonaws.com/[POOL_ID]"
      },
      "Action": "sts:AssumeRoleWithWebIdentity"
    }]
  }'
```

### 2. Healthcare Permissions Policy
```bash
aws iam create-policy \
  --policy-name KGC-Healthcare-Access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "rds:DescribeDBInstances",
        "elasticache:DescribeCacheClusters",
        "logs:*",
        "cloudwatch:PutMetricData"
      ],
      "Resource": "*"
    }]
  }'
```

## Environment Variables (Enhanced)

### Existing Healthcare Variables (Preserve All)
```env
DATABASE_URL=postgresql://[user]:[pass]@[rds-endpoint]:5432/kgc_healthcare
REDIS_URL=redis://[elasticache-endpoint]:6379
SESSION_SECRET=[32-char-secure-string]
SENDGRID_API_KEY=[sendgrid-key]
TWILIO_ACCOUNT_SID=[twilio-sid]
TWILIO_AUTH_TOKEN=[twilio-token]
TWILIO_PHONE_NUMBER=[twilio-phone]
OPENAI_API_KEY=[openai-key]
ANTHROPIC_API_KEY=[anthropic-key]
```

### Enhanced Security Variables (NEW)
```env
# Cognito Configuration
AWS_REGION=[aws-region]
COGNITO_USER_POOL_ID=[user-pool-id]
COGNITO_CLIENT_ID=[client-id]
COGNITO_CLIENT_SECRET=[client-secret]
COGNITO_DOMAIN=[domain].auth.[region].amazoncognito.com

# IAM Integration
ADMIN_ROLE_ARN=arn:aws:iam::[account]:role/KGC-Healthcare-Admin
ENABLE_COGNITO_ADMIN=true
ENABLE_MFA_ENFORCEMENT=true

# Enhanced Compliance
AUDIT_LOG_LEVEL=comprehensive
HIPAA_COMPLIANCE_MODE=enabled
```

## Authentication Flow Design

### 1. Admin Access (Enhanced)
```
Admin → Cognito Login → MFA → JWT + IAM Role → Enhanced Admin Dashboard
```

### 2. Healthcare Users (Preserved)
```
Doctor/Patient → Email Entry → PIN Verification → Session → Healthcare Dashboards
```

### 3. Emergency Fallback
```
Admin → Emergency Email PIN → Temporary Session → Limited Admin Access
```

## Database Schema Enhancement

Add these tables to existing schema:
```sql
-- Cognito user mapping
CREATE TABLE cognito_user_mappings (
  id SERIAL PRIMARY KEY,
  cognito_sub VARCHAR(255) UNIQUE NOT NULL,
  kgc_user_id INTEGER REFERENCES users(id),
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  mfa_enabled BOOLEAN DEFAULT false
);

-- Enhanced security audit
CREATE TABLE security_audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  cognito_sub VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  ip_address INET,
  success BOOLEAN,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

## Post-Deployment Configuration

### 1. Create Admin User in Cognito
```bash
aws cognito-idp admin-create-user \
  --user-pool-id [POOL_ID] \
  --username admin@keepgoingcare.com \
  --user-attributes Name=email,Value=admin@keepgoingcare.com \
  --temporary-password TempPass123!

aws cognito-idp admin-set-user-password \
  --user-pool-id [POOL_ID] \
  --username admin@keepgoingcare.com \
  --password [SECURE_PASSWORD] \
  --permanent
```

### 2. Enable MFA
```bash
aws cognito-idp admin-set-user-mfa-preference \
  --user-pool-id [POOL_ID] \
  --username admin@keepgoingcare.com \
  --sms-mfa-settings Enabled=true,PreferredMfa=true
```

## Security Groups Enhancement

### Application Security Group (Enhanced)
- Port 443: HTTPS from internet (0.0.0.0/0)
- Port 5000: From Load Balancer only
- **NEW**: Cognito callback URLs whitelisted

### Database Security Group
- Port 5432: From Application SG only
- **NEW**: Enhanced audit logging

### Cache Security Group  
- Port 6379: From Application SG only
- **NEW**: Cognito token caching

## Verification Endpoints

### Healthcare Authentication (Existing)
```bash
# Email PIN system
POST /api/email-auth/send-pin
POST /api/email-auth/verify-pin

# SMS verification
POST /api/auth/sms-verify
```

### Enhanced Security (NEW)
```bash
# Cognito integration
GET /api/admin/cognito-status
GET /api/admin/mfa-status
POST /api/admin/cognito-refresh

# Enhanced admin endpoints
GET /api/admin/users (with Cognito JWT)
GET /api/admin/security-audit
```

## Enhanced Monitoring

### CloudWatch Metrics
- Cognito login attempts/failures
- MFA challenge success rates
- JWT token usage patterns
- Healthcare endpoint access

### Security Alerts
- Failed admin login attempts (>5 in 15 min)
- MFA bypass attempts
- Unusual access patterns
- Healthcare data access anomalies

## Cost Estimate (Enhanced)
- **Existing Services**: ~$70/month
- **Cognito User Pool**: ~$5/month (50 MAU)
- **Enhanced Monitoring**: ~$10/month
- **Total: ~$85/month** (17% increase for enterprise security)

## Healthcare Compliance (Enhanced)

### HIPAA Compliance
✅ Multi-factor authentication enforced  
✅ Role-based access with IAM  
✅ Enhanced audit logging  
✅ JWT token security  
✅ Emergency access procedures  

### TGA SaMD Class I Compliance
✅ Medical device standards maintained  
✅ Enhanced user authentication  
✅ Professional healthcare user management  
✅ Comprehensive security monitoring  

## Key Benefits of Enhancement

1. **Enterprise Security**: Cognito + IAM + MFA for admin access
2. **Healthcare Compliance**: Maintains existing PIN/SMS system for medical users
3. **Audit Trail**: Enhanced logging for regulatory compliance
4. **Scalability**: Professional user management for healthcare organizations
5. **Flexibility**: Dual authentication supports different user types
6. **Emergency Access**: Fallback systems ensure system availability

## Deployment Steps Summary

1. **Deploy Application**: Upload `keep-going-care-aws-deployment.tar.gz` to Elastic Beanstalk
2. **Setup Cognito**: Create User Pool with MFA enforcement
3. **Configure IAM**: Create roles with healthcare-appropriate permissions
4. **Set Environment Variables**: Both existing healthcare + new Cognito variables
5. **Create Admin User**: Set up initial Cognito admin with MFA
6. **Verify Systems**: Test both authentication flows
7. **Enable Monitoring**: Configure CloudWatch alerts for security events

**Result**: Enterprise-grade healthcare application with dual authentication, enhanced security, and full AWS integration while preserving all existing healthcare features.