# 🚀 Google Cloud Run - Quick Start Guide

## Deploy KGC Healthcare Platform in 5 Minutes

### Prerequisites
- Google Cloud account with billing enabled
- Google Cloud CLI (`gcloud`) installed
- Docker installed
- Node.js 20+ installed

### Step 1: Clone and Prepare
```bash
# Clone the repository
git clone https://github.com/elegantartist/KGCPWAJune25.git
cd KGCPWAJune25

# Install dependencies (needed for password hashing)
npm install
```

### Step 2: Deploy with One Command
```bash
# Run the deployment script
./deploy-to-google-cloud-run.sh
```

The script will:
1. ✅ Check prerequisites
2. ✅ Set up your Google Cloud project
3. ✅ Create a service account with proper permissions
4. ✅ Guide you through secret configuration
5. ✅ Build and push Docker image
6. ✅ Deploy to Cloud Run

### Step 3: Provide Required Information

When prompted, provide:
- **Project ID**: Your Google Cloud project ID
- **Database URL**: Your Neon PostgreSQL connection string
- **API Keys**: OpenAI, Anthropic, SendGrid, Twilio credentials
- **Admin Password**: For admin@keepgoingcare.com

### Step 4: Access Your Application

After deployment completes, you'll see:
```
✅ KGC Healthcare Platform Deployed Successfully!
Service URL: https://kgc-healthcare-xxxxx-uc.a.run.app
```

### Default Login Credentials
- **Admin**: admin@keepgoingcare.com / [your password]
- **Doctor**: marijke.collins@keepgoingcare.com / demo123
- **Patient**: reuben.collins@keepgoingcare.com / demo123

## 🔒 Security Notes

All sensitive data is stored in Google Secret Manager:
- Database credentials
- API keys
- Session secrets
- Password hashes

## 🏥 Healthcare Compliance

The deployment includes:
- HIPAA-compliant infrastructure
- TGA Class I SaMD compliance
- Audit logging
- Data encryption
- Privacy protection

## 📊 Monitoring

View logs and metrics:
```bash
# View logs
gcloud run logs read --service=kgc-healthcare

# View metrics
gcloud monitoring dashboards list
```

## 🆘 Troubleshooting

### Issue: Service won't start
```bash
# Check logs
gcloud run logs read --service=kgc-healthcare --limit=50

# Common fixes:
# 1. Verify all secrets are set
# 2. Check database connectivity
# 3. Ensure API keys are valid
```

### Issue: Authentication not working
```bash
# Update CORS settings
gcloud run services update kgc-healthcare \
  --update-env-vars="ALLOWED_ORIGINS=https://your-domain.com"
```

## 📝 Next Steps

1. **Configure Custom Domain**
   ```bash
   gcloud run domain-mappings create \
     --service=kgc-healthcare \
     --domain=yourdomain.com
   ```

2. **Set Up Monitoring Alerts**
   - Configure uptime checks
   - Set up error rate alerts
   - Monitor response times

3. **Test Healthcare Features**
   - Submit daily health scores
   - Test AI chatbot
   - Verify SMS authentication
   - Check email notifications

## 🔄 Update Deployment

To update your application:
```bash
# Pull latest changes
git pull origin main

# Rebuild and redeploy
./deploy-to-google-cloud-run.sh
```

## 💰 Cost Estimation

Typical monthly costs for 120 users:
- Cloud Run: ~$20-50
- Secret Manager: ~$1
- Container Registry: ~$5
- Total: ~$26-56/month

## 🌍 Regional Deployment

For Australian compliance, deploy to Sydney:
```bash
# Edit deploy-to-google-cloud-run.sh
REGION="australia-southeast1"  # Sydney region
```

## 📧 Support

For deployment issues:
- Check logs: `gcloud run logs read`
- Review secrets: `gcloud secrets list`
- Verify APIs enabled: `gcloud services list`

---
**Note**: This deployment is production-ready with healthcare compliance built-in.