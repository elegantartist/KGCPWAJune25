# KGC Healthcare Application - AWS Deployment Guide

## Two Deployment Options

### Option 1: Quick Setup (Immediate Testing)

**Step 1: Configure API Keys Using .ebextensions**

1. Replace the placeholder values in `.ebextensions/environment.config` with your actual API keys:
   ```yaml
   option_settings:
     aws:elasticbeanstalk:application:environment:
       DATABASE_URL: "postgresql://your_user:your_password@your_host:5432/your_database"
       OPENAI_API_KEY: "sk-your-actual-openai-key"
       ANTHROPIC_API_KEY: "sk-ant-your-actual-anthropic-key"
       SENDGRID_API_KEY: "SG.your-actual-sendgrid-key"
       TAVILY_API_KEY: "tvly-your-tavily-key"
       TWILIO_ACCOUNT_SID: "ACyour-twilio-sid"
       TWILIO_AUTH_TOKEN: "your-twilio-token"
       TWILIO_PHONE_NUMBER: "+1234567890"
       NODE_ENV: "production"
       APP_BASE_URL: "https://your-app-domain.elasticbeanstalk.com"
       INITIAL_ADMIN_EMAIL: "admin@keepgoingcare.com"
       INITIAL_ADMIN_PASSWORD: "your-secure-admin-password"
       INITIAL_ADMIN_PHONE: "+1234567890"
   ```

**CRITICAL SECURITY UPDATE**: 
- **INITIAL_ADMIN_PASSWORD**: Use a strong, unique password (minimum 12 characters, mixed case, numbers, symbols)
- **APP_BASE_URL**: Replace with your actual AWS Elastic Beanstalk domain
- Never use default passwords in production

**Step 2: Set Up PostgreSQL Database**

Choose one of these options:

**Option A: AWS RDS (Recommended)**
1. Go to AWS RDS Console
2. Create PostgreSQL database (version 13+)
3. Choose "Production" template for security
4. Enable encryption at rest
5. Place in private subnet
6. Get connection string format: `postgresql://username:password@endpoint:5432/database`

**Option B: External Provider (Neon, Supabase, etc.)**
1. Create PostgreSQL database with your preferred provider
2. Ensure SSL is enabled
3. Get connection string

**Step 3: Initialize Database**

After setting DATABASE_URL, run:
```bash
cd clean-aws-deploy
npm install
npm run db:push
npx tsx scripts/init-database.ts
```

**Step 4: Deploy to AWS**

1. Zip your `clean-aws-deploy` folder
2. Upload to Elastic Beanstalk
3. Wait for deployment to complete

---

### Option 2: Production Security (HIPAA Compliant)

**Step 1: Set Up AWS Secrets Manager**

1. Go to AWS Secrets Manager Console
2. Click "Store a new secret"
3. Choose "Other type of secret"
4. Add key-value pairs:
   ```json
   {
     "DATABASE_URL": "postgresql://user:pass@host:5432/db",
     "OPENAI_API_KEY": "sk-your-key",
     "ANTHROPIC_API_KEY": "sk-ant-your-key",
     "SENDGRID_API_KEY": "SG.your-key",
     "TAVILY_API_KEY": "tvly-your-key",
     "TWILIO_ACCOUNT_SID": "AC-your-sid",
     "TWILIO_AUTH_TOKEN": "your-token",
     "TWILIO_PHONE_NUMBER": "+1234567890"
   }
   ```
5. Name it: `kgc-healthcare-app-secrets`
6. Enable automatic rotation if desired

**Step 2: Configure IAM Permissions**

The `.ebextensions/secrets-manager.config` file will automatically:
- Create KMS encryption key
- Set up IAM role for Secrets Manager access
- Configure proper security policies

**Step 3: Deploy with Secrets Manager**

1. Remove `.ebextensions/environment.config` (if using secrets manager)
2. Keep `.ebextensions/secrets-manager.config`
3. Deploy to Elastic Beanstalk

---

## Database Tables Setup

The application will automatically create these tables on first run:

### Core Tables:
- `user_roles` - Admin, Doctor, Patient roles
- `users` - All users with hierarchical relationships
- `health_metrics` - Patient health scores
- `patient_scores` - Official daily submissions
- `care_plan_directives` - Doctor-created care plans
- `motivational_images` - Patient motivational content
- `progress_milestones` - Achievement tracking
- `feature_usage` - Platform usage analytics

### Authentication Tables:
- `verification_codes` - SMS/Email verification
- `keep_going_logs` - Keep Going button usage

## Admin Account Creation

**SECURE APPROACH**: Admin accounts are now created only when you provide secure credentials via environment variables:

- **INITIAL_ADMIN_EMAIL**: Your chosen admin email
- **INITIAL_ADMIN_PASSWORD**: Your secure admin password (12+ characters, mixed case, numbers, symbols)
- **INITIAL_ADMIN_PHONE**: Admin phone number for SMS authentication

**No hardcoded passwords** - the system will only create an admin user if you provide these environment variables with secure credentials.

## Required API Keys

### Essential (Application won't start without these):
1. **DATABASE_URL** - PostgreSQL connection
2. **OPENAI_API_KEY** - Get from https://platform.openai.com/api-keys
3. **ANTHROPIC_API_KEY** - Get from https://console.anthropic.com/
4. **SENDGRID_API_KEY** - Get from https://app.sendgrid.com/settings/api_keys

### Optional (for full functionality):
5. **TAVILY_API_KEY** - Search functionality
6. **TWILIO_ACCOUNT_SID** - SMS authentication
7. **TWILIO_AUTH_TOKEN** - SMS functionality
8. **TWILIO_PHONE_NUMBER** - SMS sender number

## Verification Steps

After deployment:

1. **Check Application Status**
   - Visit your Elastic Beanstalk URL
   - Should show KGC login page

2. **Test Email Authentication**
   - Try logging in with admin@keepgoingcare.com
   - Should receive PIN via SendGrid

3. **Verify Database Connection**
   - Check EB logs for database connection success
   - Look for "Database connection successful"

4. **Test Core Features**
   - Admin dashboard access
   - Doctor creation functionality
   - Patient management system

## Troubleshooting

### Common Issues:

**"Cannot find module" errors**
- Run `npm install` in clean-aws-deploy folder
- Ensure all dependencies in package.json

**Database connection fails**
- Verify DATABASE_URL format
- Check database allows connections from AWS
- Ensure SSL is properly configured

**API features don't work**
- Verify API keys are correctly set
- Check AWS CloudWatch logs for specific errors
- Ensure API keys have proper permissions

**Environment variables not loading**
- Check Elastic Beanstalk environment status
- Verify .ebextensions files are included in deployment
- Restart environment if variables were added post-deployment

## Healthcare Compliance Notes

This deployment includes:
- Encryption at rest (database)
- Encryption in transit (HTTPS/TLS)
- Audit logging capabilities
- Role-based access control
- PII protection mechanisms
- HIPAA-ready architecture

For full HIPAA compliance, ensure you:
1. Sign AWS Business Associate Agreement
2. Use only HIPAA-eligible AWS services
3. Enable CloudTrail for audit logging
4. Configure AWS Config for compliance monitoring
5. Implement proper backup and disaster recovery