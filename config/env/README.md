# Environment Configuration Guide

## Overview
This directory contains environment configuration templates and documentation for the KGC Healthcare Platform. Each deployment environment has specific requirements and variable sources.

## File Structure
- `.env.example` - Template with all variables and safe defaults
- `README.md` - This deployment guide (you are here)

## Environment Variable Sources by Platform

### 🟢 Replit Development Environment

#### Variable Sources:
- **Secrets Tab**: For sensitive API keys and tokens
- **Environment Variables**: For configuration values
- **Auto-detected**: Platform-specific variables

#### How to Set Variables:

1. **In Replit Secrets Tab** (for sensitive values):
   ```
   SESSION_SECRET=your_64_char_secret
   OPENAI_API_KEY=sk-proj-your-key
   ANTHROPIC_API_KEY=sk-ant-your-key
   TWILIO_ACCOUNT_SID=ACyour_sid
   TWILIO_AUTH_TOKEN=your_token
   SENDGRID_API_KEY=SG.your_key
   TAVILY_API_KEY=tvly-your-key
   DATABASE_URL=postgresql://user:pass@host:5432/db
   ```

2. **In Shell/Environment** (for configuration):
   ```bash
   export NODE_ENV=development
   export PORT=5000
   export LOG_LEVEL=debug
   ```

#### Auto-detected Variables:
- `REPL_ID` - Automatically set by Replit
- `REPLIT_DB_URL` - If using Replit Database
- `REPLIT_DOMAINS` - For CORS configuration

### ☁️ Google Cloud Run Production

#### Variable Sources:
- **Secret Manager**: For sensitive credentials (RECOMMENDED)
- **Environment Variables**: For configuration values
- **Cloud Build**: Build-time variables

#### How to Set Variables:

1. **Create Secrets in Secret Manager**:
   ```bash
   # Create secrets (run locally with gcloud CLI)
   echo -n "your-database-url" | gcloud secrets create database-url --data-file=-
   echo -n "your-openai-key" | gcloud secrets create openai-api-key --data-file=-
   echo -n "your-anthropic-key" | gcloud secrets create anthropic-api-key --data-file=-
   echo -n "your-session-secret" | gcloud secrets create session-secret --data-file=-
   echo -n "your-admin-hash" | gcloud secrets create admin-password-hash --data-file=-
   
   # Communication services
   echo -n "your-twilio-sid" | gcloud secrets create twilio-account-sid --data-file=-
   echo -n "your-twilio-token" | gcloud secrets create twilio-auth-token --data-file=-
   echo -n "your-sendgrid-key" | gcloud secrets create sendgrid-api-key --data-file=-
   echo -n "your-tavily-key" | gcloud secrets create tavily-api-key --data-file=-
   ```

2. **Deploy with Secret References**:
   ```bash
   gcloud run deploy kgc-healthcare \
     --image=gcr.io/YOUR_PROJECT/kgc-healthcare:latest \
     --region=australia-southeast1 \
     --set-secrets="DATABASE_URL=database-url:latest" \
     --set-secrets="OPENAI_API_KEY=openai-api-key:latest" \
     --set-secrets="ANTHROPIC_API_KEY=anthropic-api-key:latest" \
     --set-secrets="SESSION_SECRET=session-secret:latest" \
     --set-secrets="ADMIN_PASSWORD_HASH=admin-password-hash:latest" \
     --set-env-vars="NODE_ENV=production" \
     --set-env-vars="PORT=8080" \
     --set-env-vars="ALLOWED_ORIGINS=https://your-domain.com"
   ```

3. **Via Cloud Build** (cloudbuild.yaml):
   ```yaml
   substitutions:
     _NODE_ENV: production
     _PORT: '8080'
     _AWS_REGION: ap-southeast-2
     _ALLOWED_ORIGINS: https://your-domain.com
   ```

### 🅰️ AWS App Runner / ECS Production

#### Variable Sources:
- **AWS Secrets Manager**: For sensitive credentials (RECOMMENDED)
- **Systems Manager Parameter Store**: For configuration
- **Environment Variables**: For non-sensitive config

#### How to Set Variables:

1. **Create Secrets in AWS Secrets Manager**:
   ```bash
   # Create JSON secret with all keys
   aws secretsmanager create-secret \
     --name "prod/KGC/sec" \
     --description "KGC Healthcare Platform secrets" \
     --secret-string '{
       "openaiapi": "sk-proj-your-openai-key",
       "anthropicapi": "sk-ant-your-anthropic-key", 
       "twilioaccountsid": "ACyour-twilio-sid",
       "twilioauthtoken": "your-twilio-token",
       "sendgridapi": "SG.your-sendgrid-key",
       "tavilyapi": "tvly-your-tavily-key",
       "database_url": "postgresql://user:pass@host:5432/db",
       "session_secret": "your-64-char-secret",
       "admin_password_hash": "$2b$12$your-bcrypt-hash"
     }'
   ```

2. **Configure App Runner** (apprunner.yaml):
   ```yaml
   version: 1.0
   runtime: nodejs20
   build:
     commands:
       build:
         - npm ci
         - npm run build
   run:
     runtime-version: 20
     command: node server/index.js
     network:
       port: 8080
       env:
         NODE_ENV: production
         PORT: 8080
         AWS_REGION: ap-southeast-2
         KGC_SECRET_NAME: prod/KGC/sec
   ```

3. **Set IAM Role Permissions**:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "secretsmanager:GetSecretValue"
         ],
         "Resource": "arn:aws:secretsmanager:ap-southeast-2:*:secret:prod/KGC/sec-*"
       }
     ]
   }
   ```

### 🚀 Vercel Edge Functions

#### Variable Sources:
- **Vercel Dashboard**: Environment variables
- **Vercel CLI**: Command-line configuration
- **GitHub Actions**: CI/CD pipeline

#### How to Set Variables:

1. **Via Vercel Dashboard**:
   - Go to Project Settings → Environment Variables
   - Add each variable with appropriate environment (Production/Preview/Development)

2. **Via Vercel CLI**:
   ```bash
   # Set production variables
   vercel env add SESSION_SECRET production
   vercel env add OPENAI_API_KEY production
   vercel env add DATABASE_URL production
   
   # Set development variables
   vercel env add NODE_ENV development
   vercel env add LOG_LEVEL debug
   ```

3. **Required Vercel Variables**:
   ```
   VERCEL_ORG_ID=team_abc123
   VERCEL_PROJECT_ID=prj_abc123
   VERCEL_TOKEN=vercel_deployment_token
   ```

### 🔧 Local Development Environment

#### Variable Sources:
- `.env` file in project root
- System environment variables
- IDE/editor configuration

#### How to Set Variables:

1. **Create .env file**:
   ```bash
   # Copy template and fill in values
   cp config/env/.env.example .env
   # Edit .env with your actual values
   nano .env
   ```

2. **Required for Local Development**:
   ```bash
   # Minimum required variables
   SESSION_SECRET=your_64_char_secret
   DATABASE_URL=postgresql://user:pass@localhost:5432/kgc_dev
   OPENAI_API_KEY=sk-proj-your-key
   TWILIO_ACCOUNT_SID=ACyour_sid
   TWILIO_AUTH_TOKEN=your_token
   ```

3. **Optional Development Variables**:
   ```bash
   NODE_ENV=development
   LOG_LEVEL=debug
   ENABLE_DEBUG_ROUTES=true
   DEV_MODE=true
   ```

### 🔄 GitHub Actions CI/CD

#### Variable Sources:
- **GitHub Secrets**: For sensitive values
- **GitHub Variables**: For configuration values
- **Workflow environment**: Runtime variables

#### How to Set Variables:

1. **In GitHub Repository Settings**:
   - Go to Settings → Secrets and Variables → Actions
   - Add Repository Secrets for sensitive values
   - Add Repository Variables for configuration

2. **Required GitHub Secrets**:
   ```
   OPENAI_API_KEY
   ANTHROPIC_API_KEY
   TWILIO_ACCOUNT_SID
   TWILIO_AUTH_TOKEN
   SENDGRID_API_KEY
   DATABASE_URL
   SESSION_SECRET
   ```

3. **Required GitHub Variables**:
   ```
   NODE_ENV=production
   AWS_REGION=ap-southeast-2
   GOOGLE_CLOUD_PROJECT=kgc-healthcare-prod
   ```

4. **Workflow Usage** (.github/workflows/deploy.yml):
   ```yaml
   env:
     NODE_ENV: ${{ vars.NODE_ENV }}
     OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
     DATABASE_URL: ${{ secrets.DATABASE_URL }}
   ```

## Security Best Practices

### 🔴 Never Commit These Variables:
- API keys and tokens
- Database passwords  
- Session secrets
- Admin password hashes
- Cloud service credentials

### ✅ Safe to Commit:
- Feature flags (`MCP_ENABLED=true`)
- Public configuration (`NODE_ENV=production`)
- Non-sensitive URLs (`HEALTH_CHECK_PATH=/api/health`)
- Logging levels (`LOG_LEVEL=info`)

### 🛡️ Secrets Management Hierarchy:
1. **Best**: Cloud secret managers (AWS Secrets Manager, Google Secret Manager)
2. **Good**: Platform secret storage (Replit Secrets, Vercel Environment Variables)  
3. **Acceptable**: Environment variables (encrypted at rest)
4. **Never**: Plain text files, source code, logs

## Validation & Health Checks

### Startup Validation:
The application validates required variables at startup:
```javascript
// Validates on server start
const validator = SecurityConfig.getInstance();
const { valid, errors } = validator.validateEnvironment();

if (!valid) {
  console.error('Environment validation failed:', errors);
  process.exit(1);
}
```

### Health Check Endpoint:
`GET /api/health` validates connectivity to external services:
- Database connection (`DATABASE_URL`)
- OpenAI API (`OPENAI_API_KEY`)
- Anthropic API (`ANTHROPIC_API_KEY`)
- Twilio SMS (`TWILIO_*`)
- SendGrid Email (`SENDGRID_API_KEY`)

### Runtime Monitoring:
- Invalid configurations logged with audit trail
- Failed external service calls trigger alerts
- Missing variables cause graceful degradation where possible

## Troubleshooting

### Common Issues:

1. **"Missing required environment variable"**:
   - Check variable name spelling
   - Verify variable is set in correct environment
   - Ensure no trailing spaces or quotes

2. **"Invalid SESSION_SECRET format"**:
   - Must be at least 64 characters
   - Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

3. **"Database connection failed"**:
   - Verify `DATABASE_URL` format: `postgresql://user:pass@host:port/db`
   - Check network connectivity and firewall rules
   - Validate database credentials

4. **"AI API authentication failed"**:
   - Verify API key format (OpenAI: `sk-proj-`, Anthropic: `sk-ant-`)
   - Check API key permissions and quotas
   - Ensure no extra characters or spaces

5. **"CORS policy violation"**:
   - Set `ALLOWED_ORIGINS` in production
   - Include protocol (https://) in origins
   - Comma-separate multiple origins

### Debug Commands:
```bash
# Check environment variables are loaded
node -e "console.log(process.env.NODE_ENV)"

# Validate database connection
node -e "const { Pool } = require('pg'); const pool = new Pool({connectionString: process.env.DATABASE_URL}); pool.query('SELECT NOW()', (err, res) => { console.log(err ? 'DB Error:' + err : 'DB OK:' + res.rows[0].now); pool.end(); });"

# Test API keys (check logs for success/failure)
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
```

## Migration Guide

### From Local to Replit:
1. Copy `.env` values to Replit Secrets tab
2. Update `DATABASE_URL` to Neon or Replit DB
3. No code changes required - auto-detection handles platform differences

### From Replit to AWS:
1. Create AWS Secrets Manager secret with JSON format
2. Set up IAM role with `secretsmanager:GetSecretValue` permission
3. Deploy with `KGC_SECRET_NAME` environment variable

### From AWS to Google Cloud:
1. Create equivalent secrets in Google Secret Manager
2. Update service account with Secret Manager permissions
3. Deploy with secret references in Cloud Run

## Contact & Support

For environment configuration issues:
- Check application logs for specific error messages
- Verify variable names against `docs/06_env_vars.md`
- Ensure platform-specific requirements are met
- Test connectivity to external services independently