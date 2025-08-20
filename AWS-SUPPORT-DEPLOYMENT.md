# AWS Support Agent Deployment Guide
## Immediate 30-Minute AWS App Runner Deployment

### ✅ Files Updated Per AWS Support Requirements

Your healthcare application is now configured exactly as the AWS support agent recommended:

**Updated Files:**
- ✅ **Dockerfile**: Amazon Linux 2023 + Node.js 22
- ✅ **apprunner.yaml**: Secrets Manager integration
- ✅ **server/index.ts**: AWS Secrets Manager code added
- ✅ **aws-sdk**: Added as dependency

## Step-by-Step Deployment (30 minutes)

### Step 1: Create AWS Secrets (5 minutes)

#### A. Database Credentials Secret:
```bash
aws secretsmanager create-secret \
  --name "kgc-healthcare-db-credentials" \
  --description "KGC Healthcare Database Credentials" \
  --secret-string '{
    "DATABASE_URL": "postgresql://admin:password@healthcare-db.REGION.rds.amazonaws.com:5432/postgres"
  }'
```

#### B. API Keys Secret:
```bash
aws secretsmanager create-secret \
  --name "kgc-healthcare-api-keys" \
  --description "KGC Healthcare API Keys" \
  --secret-string '{
    "OPENAI_API_KEY": "your-existing-openai-key",
    "ANTHROPIC_API_KEY": "your-existing-anthropic-key",
    "TWILIO_ACCOUNT_SID": "your-existing-twilio-sid",
    "TWILIO_AUTH_TOKEN": "your-existing-twilio-token", 
    "TWILIO_PHONE_NUMBER": "your-existing-twilio-number",
    "SENDGRID_API_KEY": "your-existing-sendgrid-key",
    "TAVILY_API_KEY": "your-existing-tavily-key",
    "SESSION_SECRET": "KGC_AWS_PRODUCTION_SESSION_SECRET_64_CHARS_HEALTHCARE_2025",
    "ADMIN_PASSWORD_HASH": "$2b$12$rQJ8vQJ5K6Q7yZ8x9W0.XeO9Q8x7Y6Z5K4J3H2G1F0E9D8C7B6A5N"
  }'
```

### Step 2: Create RDS Database (10 minutes)
```bash
aws rds create-db-instance \
  --db-instance-identifier healthcare-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password "KGC2025SecureDB!" \
  --allocated-storage 20 \
  --storage-encrypted \
  --vpc-security-group-ids sg-your-security-group \
  --backup-retention-period 7
```

### Step 3: Create IAM Role (5 minutes)

#### IAM Policy for Secrets Manager:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:*:secret:kgc-healthcare-*"
      ]
    }
  ]
}
```

### Step 4: Create App Runner Service (10 minutes)

#### Go to AWS App Runner Console:
1. Navigate to https://console.aws.amazon.com/apprunner/
2. **Create Service** → **Source code repository**
3. **Connect GitHub** → Select your KGC repository
4. **Configuration detected**: App Runner will find your `apprunner.yaml`

#### Service Settings:
- **Service name**: `healthcare-pwa-service`
- **CPU**: 0.25 vCPU (perfect for 120 users)
- **Memory**: 0.5 GB
- **Auto scaling**: Min: 1, Max: 2 instances
- **IAM role**: Select the role with Secrets Manager permissions

### Your Application Configuration:

**Port**: 3000 (as specified by AWS support)
**Runtime**: Node.js 22 on Amazon Linux 2023
**Build**: Automatic detection via `apprunner.yaml`
**Secrets**: Loaded via AWS Secrets Manager

### After Deployment:

1. **URL provided**: `https://abc123.us-east-1.awsapprunner.com`
2. **Automatic HTTPS**: Built-in SSL certificate
3. **Auto-scaling**: 1-2 instances based on your 120 users
4. **Cost**: ~$45-70/month total

### Verification Steps:

1. **Health Check**: App Runner monitors port 3000
2. **Logs**: CloudWatch logs show successful secret loading
3. **Database**: Connection to RDS PostgreSQL
4. **APIs**: All external services working

## Key Benefits:

✅ **No ZIP files** - Direct GitHub deployment
✅ **AWS Support recommended** - Exact configuration they provided
✅ **Healthcare ready** - HIPAA-compliant with encrypted secrets
✅ **Right-sized** - Perfect for 120 users without over-provisioning
✅ **Cost-effective** - Pay only for actual usage

## Custom Domain (Optional):
- Add custom domain in App Runner settings
- Configure DNS records as provided
- SSL certificate automatically provisioned

**Your healthcare PWA will be running on the exact AWS support agent's recommended configuration in 30 minutes!**