# AWS Secrets Manager Integration Guide for KGC Healthcare Application

## Overview
This guide shows how to configure AWS App Runner to access your KGC secrets stored in AWS Secrets Manager.

## Current Secret Configuration
Based on your screenshots, your secrets are stored under:
- **Secret Name**: `prod/KGC/sec`
- **Region**: `us-east-1`
- **Individual Keys**: `openaiapi`, `anthropicapi`, `twilioauthtoken`, `sendgridapi`, `tavilyapi`, `pgpassword`, `pguser`, `pghost`

## Step 1: Create IAM Service Role for App Runner

### 1.1 Create the IAM Role
1. Go to **IAM Console** → **Roles** → **Create Role**
2. Select **AWS Service** → **App Runner**
3. Role name: `KGC-AppRunner-SecretsRole`

### 1.2 Attach Custom Policy
Create and attach this policy to allow secrets access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "KGCSecretsManagerAccess",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:*:secret:prod/KGC/sec*"
      ]
    }
  ]
}
```

## Step 2: Configure App Runner Service

### 2.1 Create App Runner Service
1. Go to **App Runner Console**
2. **Create service**
3. **Source**: Repository (GitHub)
4. **Repository**: `elegantartist/KGCPWAJune25`
5. **Branch**: `main`

### 2.2 Configure Build Settings
Use the provided `apprunner.yaml` configuration:
- **Runtime**: Node.js 22
- **Build command**: `npm run build`
- **Start command**: `npm start`

### 2.3 Configure Service Settings
- **Service name**: `kgc-healthcare-app`
- **Port**: `3000`
- **Environment variables**: Already configured in `apprunner.yaml`

### 2.4 Configure Security (CRITICAL)
- **Instance role**: Select `KGC-AppRunner-SecretsRole` (created in Step 1)
- This allows your app to access AWS Secrets Manager

## Step 3: Database Configuration

### 3.1 If Using AWS RDS
Add these secrets to `prod/KGC/sec`:
- `pghost`: Your RDS endpoint
- `pguser`: Database username
- `pgpassword`: Database password
- `pgport`: `5432` (default PostgreSQL port)

### 3.2 If Using External Database (Neon, etc.)
Add the `DATABASE_URL` to your secrets:
- `database_url`: Your complete PostgreSQL connection string

## Step 4: Verify Integration

### 4.1 Check App Runner Logs
After deployment, check logs for:
```
🔐 Initializing KGC secrets from AWS Secrets Manager...
✅ KGC secrets loaded successfully
```

### 4.2 If Secrets Fail
App will automatically fallback to environment variables and log:
```
❌ Error loading KGC secrets: [error details]
ℹ️  Using environment variables as fallback
```

## Step 5: Security Best Practices

### 5.1 Least Privilege Access
The IAM policy only grants access to the specific secret `prod/KGC/sec`.

### 5.2 Secret Rotation
AWS Secrets Manager supports automatic rotation for database credentials.

### 5.3 Audit Logging
All secret access is logged in CloudTrail for compliance.

## Troubleshooting

### Common Issues:
1. **Permission Denied**: Ensure App Runner service role has the IAM policy attached
2. **Secret Not Found**: Verify secret name is exactly `prod/KGC/sec`
3. **Wrong Region**: Both App Runner and Secrets Manager must be in `us-east-1`

### Testing Secrets Access:
The application will log secret initialization during startup. Check App Runner logs for success/failure messages.

## Healthcare Compliance
This configuration maintains:
- ✅ **HIPAA Compliance**: Secrets encrypted at rest and in transit
- ✅ **TGA SaMD**: Secure API key management for medical device
- ✅ **Audit Trail**: All secret access logged for compliance
- ✅ **Encryption**: AWS KMS encryption for all secrets

## Cost Estimate
- **Secrets Manager**: ~$0.40/month per secret
- **App Runner**: ~$45-70/month for production workload
- **Total Additional Cost**: ~$3-4/month for secrets management