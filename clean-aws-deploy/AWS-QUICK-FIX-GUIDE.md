# AWS Deployment 502 Error Fix

## Problem Identified
**502 Error**: Nginx trying to connect to port 8080, but application not configured correctly.

From the logs:
```
connect() failed (111: Connection refused) while connecting to upstream, 
upstream: "http://127.0.0.1:8080/"
```

## Solution Applied

### 1. **Fixed Port Configuration**
- **Added**: `PORT: "8080"` environment variable in `.ebextensions/environment.config`
- **Added**: Nginx proxy configuration in `.ebextensions/02_nginx.config`
- **Added**: `/health` endpoint for load balancer health checks

### 2. **Key Configuration Changes**

**`.ebextensions/environment.config`**:
```yaml
option_settings:
  aws:elasticbeanstalk:application:environment:
    PORT: "8080"  # ← CRITICAL: This tells Node.js to use port 8080
    # ... other environment variables
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "npm start"
    ProxyServer: nginx
```

**`.ebextensions/02_nginx.config`**:
- Configures Nginx to properly proxy to port 8080
- Adds health check endpoint routing
- Ensures HTTP to HTTPS redirect

**`server/index.ts`**:
- Added `/health` endpoint for AWS load balancer
- Uses `process.env.PORT || 5000` (AWS sets PORT=8080)

### 3. **Before Redeployment**

**Update your environment variables** in `.ebextensions/environment.config`:

```yaml
option_settings:
  aws:elasticbeanstalk:application:environment:
    DATABASE_URL: "postgresql://your_user:your_password@your_host:5432/your_database"
    OPENAI_API_KEY: "sk-your-actual-openai-key"
    ANTHROPIC_API_KEY: "sk-ant-your-actual-anthropic-key"
    SENDGRID_API_KEY: "SG.your-actual-sendgrid-key"
    NODE_ENV: "production"
    PORT: "8080"
    APP_BASE_URL: "https://kgc-healthcare-production.eba-dp9upgvh.us-east-1.elasticbeanstalk.com"
    INITIAL_ADMIN_EMAIL: "your-admin@email.com"
    INITIAL_ADMIN_PASSWORD: "YourSecurePassword123!"
    INITIAL_ADMIN_PHONE: "+1234567890"
```

### 4. **Deployment Steps**

1. **Update your API keys** in the environment.config file
2. **Create new ZIP** with the fixed configuration files
3. **Deploy to AWS Elastic Beanstalk**
4. **Monitor deployment** - should show "Environment update completed successfully"
5. **Test health endpoint**: `https://your-app-domain.elasticbeanstalk.com/health`

### 5. **Expected Results**

✅ **No more 502 errors**
✅ **Application loads properly**  
✅ **Health check responds**: `{"status":"healthy","timestamp":"...","environment":"production"}`
✅ **KGC login page accessible**

### 6. **Verification Commands**

After deployment, check:
```bash
# Health check
curl https://your-domain.elasticbeanstalk.com/health

# Main application
curl https://your-domain.elasticbeanstalk.com/
```

## Root Cause
The 502 error occurred because:
1. AWS Elastic Beanstalk's default Nginx config expects apps on port 8080
2. The application wasn't explicitly configured to use port 8080
3. No health check endpoint was configured

## Files Changed
- `.ebextensions/environment.config` - Added PORT=8080
- `.ebextensions/02_nginx.config` - Added Nginx proxy configuration  
- `server/index.ts` - Added /health endpoint

This fix ensures proper port alignment between Nginx (expecting 8080) and Node.js (now configured for 8080).