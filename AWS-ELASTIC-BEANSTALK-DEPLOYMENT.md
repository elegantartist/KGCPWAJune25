# AWS Elastic Beanstalk Deployment Guide for KGC Healthcare Application

## Why Elastic Beanstalk Instead of App Runner?
App Runner is not available in all AWS regions or account types. Elastic Beanstalk is universally available and perfect for the KGC healthcare platform.

## Prerequisites Completed
✅ **Secrets**: Your API keys are stored in AWS Secrets Manager under `prod/KGC/sec`  
✅ **Code**: Application updated to fetch secrets from AWS automatically  
✅ **GitHub**: Latest code pushed to `elegantartist/KGCPWAJune25`

## Step 1: Create IAM Role for Elastic Beanstalk

### 1.1 Create Service Role (You're doing this now)
In your current IAM screen:

1. **Create Role** (you're already here)
2. **Trusted entity type**: AWS Service
3. **Use case**: Search for "Elastic Beanstalk" → Select **"Elastic Beanstalk"**
4. **Role name**: `KGC-ElasticBeanstalk-ServiceRole`

### 1.2 Attach Required Policies
Add these AWS managed policies:
- `AWSElasticBeanstalkWebTier`
- `AWSElasticBeanstalkWorkerTier` 
- `AWSElasticBeanstalkMulticontainerDocker`

### 1.3 Add Custom Secrets Policy
Create and attach this custom policy for secrets access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:prod/KGC/sec*"
    }
  ]
}
```

## Step 2: Create Instance Profile Role

### 2.1 Create Second Role
1. **Create Role** → **AWS Service** → **EC2**
2. **Role name**: `KGC-ElasticBeanstalk-EC2Role`

### 2.2 Attach Policies
- `AWSElasticBeanstalkWebTier`
- `AWSElasticBeanstalkWorkerTier`
- Same custom secrets policy from Step 1.3

## Step 3: Deploy to Elastic Beanstalk

### 3.1 Create Application
1. Go to **Elastic Beanstalk Console**
2. **Create Application**
3. **Application name**: `kgc-healthcare-app`
4. **Platform**: Node.js
5. **Platform version**: Node.js 22 running on 64bit Amazon Linux 2023

### 3.2 Upload Source Code
**Option A: Direct GitHub (Recommended)**
1. Select **"Upload your code"**
2. Choose **"Upload from GitHub"**
3. Repository: `elegantartist/KGCPWAJune25`
4. Branch: `main`

**Option B: ZIP Upload**
1. Download your repository as ZIP from GitHub
2. Upload the ZIP file

### 3.3 Configure Environment
1. **Service role**: Select `KGC-ElasticBeanstalk-ServiceRole`
2. **EC2 instance profile**: Select `KGC-ElasticBeanstalk-EC2Role`
3. **Environment type**: Single instance (for cost efficiency)

### 3.4 Set Environment Variables
Add these in "Software" configuration:
```
NODE_ENV=production
PORT=8080
KGC_SECRET_NAME=prod/KGC/sec
AWS_REGION=us-east-1
```

## Step 4: Configure Build Process

Elastic Beanstalk will automatically use your `package.json` scripts:
- **Build**: `npm run build`
- **Start**: `npm start`

## Step 5: Database Setup (Choose One)

### Option A: AWS RDS (Recommended for Production)
1. **Create RDS Instance** → PostgreSQL
2. Add connection details to your `prod/KGC/sec` secret:
   - `pghost`: RDS endpoint
   - `pguser`: Database username  
   - `pgpassword`: Database password

### Option B: Keep Neon Database
1. Add your Neon connection string to `prod/KGC/sec`:
   - `database_url`: Your Neon PostgreSQL URL

## Step 6: Health Check & Monitoring

Elastic Beanstalk automatically:
- ✅ **Health monitoring** with automatic restart
- ✅ **Load balancing** (if needed later)
- ✅ **Auto-scaling** (if traffic increases)
- ✅ **Rolling deployments** for zero downtime updates

## Step 7: Test Deployment

After deployment, your app will be available at:
`https://your-app-name.region.elasticbeanstalk.com`

Check logs for:
```
🔐 Initializing KGC secrets from AWS Secrets Manager...
✅ KGC secrets loaded successfully
```

## Benefits of Elastic Beanstalk for KGC

### Healthcare Compliance
- ✅ **HIPAA Ready**: AWS managed infrastructure
- ✅ **TGA SaMD**: Enterprise-grade hosting
- ✅ **Audit Logging**: Full CloudTrail integration
- ✅ **Encryption**: Data encrypted at rest and in transit

### Cost Efficiency
- **Development**: ~$20-30/month (single instance)
- **Production**: ~$50-80/month (with monitoring)
- **Scaling**: Pay only for what you use

### Easy Management
- **One-click deployments** from GitHub
- **Automatic updates** when you push code
- **Built-in monitoring** and health checks
- **Easy rollback** if issues occur

## Troubleshooting

### Common Issues:
1. **Permission Denied**: Ensure both IAM roles have the secrets policy
2. **Port Issues**: App must listen on `process.env.PORT || 8080`
3. **Build Failures**: Check that `npm run build` works locally

### Next Steps After Deployment:
1. **Custom Domain**: Add your own domain name
2. **SSL Certificate**: Enable HTTPS (free with AWS)
3. **Monitoring**: Set up CloudWatch alerts
4. **Backup**: Configure automated database backups

Ready to proceed with IAM role creation?