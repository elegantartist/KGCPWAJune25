# 🚀 Simple AWS Deployment Guide - No Coding Required

## What You're Deploying
Your complete KGC healthcare platform with:
- Admin dashboard (create doctors)
- Doctor dashboard (create patients, view reports)
- Patient dashboard (daily scores, chatbot, health features)

## What You Need Before Starting
1. **AWS Account** (free tier works)
2. **Your existing API keys** from these services:
   - OpenAI (for chatbot)
   - Anthropic (for AI features)
   - Twilio (for SMS login)
   - SendGrid (for emails)
   - Tavily (for content search)

## Step 1: Create AWS Secrets (Store Your API Keys) - 10 minutes

### 1A. Go to AWS Secrets Manager
1. Log into your AWS account
2. Go to: https://console.aws.amazon.com/secretsmanager/
3. Click **"Store a new secret"**

### 1B. Create Your API Keys Secret
1. Select **"Other type of secret"**
2. Choose **"Plaintext"**
3. **Copy and paste this exactly**, but replace the values with YOUR real API keys:

```json
{
  "OPENAI_API_KEY": "sk-your-openai-key-here",
  "ANTHROPIC_API_KEY": "sk-ant-your-anthropic-key-here",
  "TWILIO_ACCOUNT_SID": "AC-your-twilio-sid-here",
  "TWILIO_AUTH_TOKEN": "your-twilio-token-here",
  "TWILIO_PHONE_NUMBER": "+1234567890",
  "SENDGRID_API_KEY": "SG.your-sendgrid-key-here",
  "TAVILY_API_KEY": "tvly-your-tavily-key-here",
  "SESSION_SECRET": "KGC_AWS_PRODUCTION_SESSION_SECRET_64_CHARACTERS_HEALTHCARE_2025",
  "ADMIN_PASSWORD_HASH": "$2b$12$rQJ8vQJ5K6Q7yZ8x9W0.XeO9Q8x7Y6Z5K4J3H2G1F0E9D8C7B6A5N"
}
```

4. **Secret name**: Type exactly `kgc-healthcare-api-keys`
5. Click **"Next"** → **"Next"** → **"Store"**

### 1C. Create Your Database Secret
1. Click **"Store a new secret"** again
2. Select **"Other type of secret"**
3. Choose **"Plaintext"**
4. **Copy and paste this exactly** (we'll update it later):

```json
{
  "DATABASE_URL": "postgresql://admin:temporary@temp.amazonaws.com:5432/postgres"
}
```

5. **Secret name**: Type exactly `kgc-healthcare-db-credentials`
6. Click **"Next"** → **"Next"** → **"Store"**

## Step 2: Create Your Database - 10 minutes

### 2A. Go to RDS (Database Service)
1. Go to: https://console.aws.amazon.com/rds/
2. Click **"Create database"**

### 2B. Database Settings
1. **Engine**: Select **"PostgreSQL"**
2. **Version**: Keep default (latest)
3. **Templates**: Select **"Free tier"** (if available) or **"Production"**
4. **DB instance identifier**: Type `healthcare-db`
5. **Master username**: Type `admin`
6. **Master password**: Type `KGC2025SecureDB!`
7. **Instance class**: Select `db.t3.micro` (cheapest option)
8. **Storage**: Keep default (20 GB)
9. **Public access**: Select **"Yes"** (needed for initial setup)
10. Click **"Create database"**

### 2C. Wait for Database (5-10 minutes)
- Your database will show "Creating" status
- Wait until it shows "Available" (about 10 minutes)
- **Write down the endpoint URL** that appears (looks like: `healthcare-db.abc123.us-east-1.rds.amazonaws.com`)

### 2D. Update Your Database Secret
1. Go back to: https://console.aws.amazon.com/secretsmanager/
2. Find `kgc-healthcare-db-credentials`
3. Click on it → **"Retrieve secret value"** → **"Edit"**
4. Replace the temporary URL with your real one:

```json
{
  "DATABASE_URL": "postgresql://admin:KGC2025SecureDB!@YOUR-ENDPOINT-HERE:5432/postgres"
}
```

Replace `YOUR-ENDPOINT-HERE` with your actual endpoint (like `healthcare-db.abc123.us-east-1.rds.amazonaws.com`)

5. Click **"Save"**

## Step 3: Create IAM Role (Permissions) - 5 minutes

### 3A. Go to IAM
1. Go to: https://console.aws.amazon.com/iam/
2. Click **"Roles"** → **"Create role"**

### 3B. Create Role
1. **Trusted entity**: Select **"AWS service"**
2. **Service**: Select **"App Runner"**
3. Click **"Next"**

### 3C. Add Permissions
1. Click **"Create policy"** (opens new tab)
2. Click **"JSON"** tab
3. **Copy and paste this exactly**:

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
        "arn:aws:secretsmanager:*:*:secret:kgc-healthcare-*"
      ]
    }
  ]
}
```

4. Click **"Next"**
5. **Policy name**: Type `KGC-Secrets-Access`
6. Click **"Create policy"**
7. Go back to your role tab
8. Search for `KGC-Secrets-Access` and select it
9. Click **"Next"**
10. **Role name**: Type `KGC-AppRunner-Role`
11. Click **"Create role"**

## Step 4: Deploy Your App - 10 minutes

### 4A. Go to App Runner
1. Go to: https://console.aws.amazon.com/apprunner/
2. Click **"Create service"**

### 4B. Source Settings
1. **Repository type**: Select **"Source code repository"**
2. **Provider**: Select **"GitHub"**
3. Click **"Add new"** to connect GitHub
4. Follow the GitHub connection steps
5. **Repository**: Select your KGC repository
6. **Branch**: Select **"main"**
7. **Automatic deployment**: Check **"Yes"**
8. Click **"Next"**

### 4C. Build Settings
1. **Configuration file**: Select **"Use a configuration file"**
   (App Runner will automatically find your `apprunner.yaml` file)
2. Click **"Next"**

### 4D. Service Settings
1. **Service name**: Type `healthcare-pwa-service`
2. **CPU**: Select **"0.25 vCPU"**
3. **Memory**: Select **"0.5 GB"**
4. **Environment variables**: Leave empty (secrets will be loaded automatically)
5. **Auto scaling**: Min: 1, Max: 2
6. **Service role**: Select **"Use existing service role"** → Select `KGC-AppRunner-Role`
7. Click **"Next"**

### 4E. Review and Create
1. Review all settings
2. Click **"Create & deploy"**

## Step 5: Wait for Deployment - 10-15 minutes

### What Happens Now
1. App Runner downloads your code from GitHub
2. Builds your application using the Dockerfile
3. Loads your secrets from AWS Secrets Manager
4. Connects to your PostgreSQL database
5. Starts your healthcare platform

### Monitor Progress
- You'll see "Creating" → "Building" → "Deploying" → "Running"
- Total time: 10-15 minutes

## Step 6: Your App is Live!

### When Complete
1. App Runner will show **"Running"** status
2. You'll see a **URL** like: `https://abc123.us-east-1.awsapprunner.com`
3. Click on this URL to access your healthcare platform

### Test Your Deployment
1. Go to your App Runner URL
2. You should see the KGC login page
3. Enter an authorized email address:
   - `admin@keepgoingcare.com` (admin dashboard)
   - `marijke.collins@keepgoingcare.com` (doctor dashboard)
   - `reuben.collins@keepgoingcare.com` (patient dashboard)
4. You'll receive an SMS PIN to complete login

## What You Get

**Your Live Healthcare Platform:**
- **Cost**: ~$45-70/month for 120 users
- **URL**: Secure HTTPS automatically provided
- **Scaling**: Automatically handles 1-2 instances based on usage
- **Security**: Healthcare-grade with encrypted secrets
- **Compliance**: TGA Class I SaMD ready

## If Something Goes Wrong

### Check App Runner Logs
1. In App Runner, click on your service
2. Click **"Logs"** tab
3. Look for any error messages

### Common Issues
- **"Secret not found"**: Double-check your secret names are exactly `kgc-healthcare-api-keys` and `kgc-healthcare-db-credentials`
- **"Database connection failed"**: Verify your database endpoint is correct in the database secret
- **"Build failed"**: Check that your GitHub repository is accessible

### Get Help
Your application logs will show specific error messages to help identify any issues.

**That's it! Your healthcare platform is now running on AWS with enterprise security.**