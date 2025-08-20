# KGC Healthcare Platform - Google Cloud Run Deployment Checklist

## 🏥 Pre-Deployment Verification

### ✅ Technical Requirements
- [ ] Node.js 20+ application built and tested
- [ ] Docker image builds successfully 
- [ ] All dependencies listed in package.json
- [ ] Production build completes without errors (`npm run build`)
- [ ] Health endpoint responds at `/api/health`
- [ ] Application starts with `NODE_ENV=production`

### ✅ Security & Compliance
- [ ] All secrets moved to Google Secret Manager
- [ ] No hardcoded credentials in source code
- [ ] HTTPS enforced in production
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] CORS configured for production domains

### ✅ Healthcare Compliance (TGA/HIPAA)
- [ ] Non-diagnostic scope maintained
- [ ] PII anonymization before AI processing
- [ ] Audit logging enabled for all healthcare data access
- [ ] Data retention policies documented
- [ ] Emergency detection protocols active
- [ ] Privacy protection agent functioning
- [ ] Patient consent management implemented

### ✅ Google Cloud Setup
- [ ] Google Cloud project created with billing enabled
- [ ] Required APIs enabled (Cloud Run, Secret Manager, etc.)
- [ ] Service account created with minimal permissions
- [ ] Container Registry configured
- [ ] IAM policies properly configured
- [ ] Monitoring and logging enabled

### ✅ Database & External Services
- [ ] Neon PostgreSQL database accessible from Google Cloud
- [ ] Database connection string tested
- [ ] OpenAI API key valid and tested
- [ ] Anthropic API key valid and tested
- [ ] Twilio credentials configured for SMS
- [ ] SendGrid API key configured for email
- [ ] All external service quotas sufficient for production load

## 🚀 Deployment Steps

### Step 1: Prepare Secrets
```bash
# Create all required secrets in Google Secret Manager
gcloud secrets create database-url --data-file=-
gcloud secrets create openai-api-key --data-file=-
gcloud secrets create anthropic-api-key --data-file=-
gcloud secrets create twilio-account-sid --data-file=-
gcloud secrets create twilio-auth-token --data-file=-
gcloud secrets create twilio-phone-number --data-file=-
gcloud secrets create sendgrid-api-key --data-file=-
gcloud secrets create session-secret --data-file=-
gcloud secrets create admin-password-hash --data-file=-
```

### Step 2: Build and Deploy
```bash
# Option A: Automated deployment
./deploy-google-cloud.sh

# Option B: Manual deployment
gcloud builds submit --config cloudbuild.yaml .
```

### Step 3: Verify Deployment
```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe kgc-healthcare --region=us-central1 --format='value(status.url)')

# Test health endpoint
curl $SERVICE_URL/api/health

# Test authentication endpoint
curl $SERVICE_URL/api/auth/status
```

## 🔍 Post-Deployment Validation

### ✅ Health Checks
- [ ] `/api/health` returns 200 status
- [ ] Application logs show successful startup
- [ ] Database connectivity confirmed
- [ ] AI services responding correctly
- [ ] SMS/Email services functional

### ✅ Security Validation
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] Security headers present in responses
- [ ] Admin authentication working
- [ ] Rate limiting functional
- [ ] CORS configuration allows only intended origins

### ✅ Healthcare Features
- [ ] Patient authentication via SMS working
- [ ] Care Plan Directives loading correctly
- [ ] Daily Self-Scores submission functional
- [ ] AI chatbot responding appropriately
- [ ] PII anonymization active before AI processing
- [ ] Emergency keyword detection operational

### ✅ Performance & Monitoring
- [ ] Response times under 500ms for 95% of requests
- [ ] Auto-scaling responding to load changes
- [ ] Memory usage under 80% at normal load
- [ ] CPU utilization reasonable
- [ ] Logs aggregated and searchable
- [ ] Uptime monitoring configured

## 🛠️ Troubleshooting Guide

### Common Issues

#### Deployment Fails
```bash
# Check build logs
gcloud builds log $(gcloud builds list --limit=1 --format='value(id)')

# View service description
gcloud run services describe kgc-healthcare --region=us-central1
```

#### Service Won't Start
```bash
# View real-time logs
gcloud logs tail kgc-healthcare --location=us-central1

# Check environment variables
gcloud run services describe kgc-healthcare --region=us-central1 --format='export'
```

#### Secret Access Denied
```bash
# Verify service account permissions
gcloud projects get-iam-policy YOUR_PROJECT_ID

# Test secret access
gcloud secrets versions access latest --secret=database-url
```

#### Database Connection Failed
- Check Neon database allows connections from Google Cloud IPs
- Verify DATABASE_URL format matches Neon requirements
- Test connection from Cloud Shell

#### High Response Times
- Increase memory allocation to 4Gi
- Check for cold starts (increase min instances)
- Review AI service response times
- Monitor external API latencies

## 📊 Monitoring Setup

### Essential Metrics to Monitor
- [ ] Request latency (95th percentile < 500ms)
- [ ] Error rate (< 0.1%)
- [ ] Memory utilization (< 80%)
- [ ] CPU utilization during AI processing
- [ ] Database connection pool usage
- [ ] External API response times
- [ ] Healthcare-specific metrics (CPD updates, self-scores)

### Alerts to Configure
- [ ] Service unavailable (5+ minutes)
- [ ] High error rate (> 1% for 10 minutes)
- [ ] Memory usage > 90%
- [ ] Database connection failures
- [ ] AI service timeouts
- [ ] Emergency keywords detected in patient interactions

### Log Monitoring
- [ ] Application error logs
- [ ] Healthcare data access logs
- [ ] Authentication/authorization events
- [ ] AI service interactions
- [ ] Database query performance
- [ ] External service API calls

## 🔒 Security Monitoring

### Security Events to Track
- [ ] Failed authentication attempts
- [ ] Unusual access patterns
- [ ] PII exposure attempts
- [ ] Unauthorized API access
- [ ] Rate limit violations
- [ ] Healthcare data access anomalies

## 📋 Maintenance Schedule

### Daily
- [ ] Check application health and uptime
- [ ] Review error logs for critical issues
- [ ] Monitor healthcare feature usage
- [ ] Verify backup processes

### Weekly
- [ ] Review security logs for anomalies
- [ ] Check performance metrics trends
- [ ] Update dependency security scans
- [ ] Verify compliance monitoring

### Monthly
- [ ] Security vulnerability assessment
- [ ] Performance optimization review
- [ ] Healthcare compliance audit
- [ ] Disaster recovery testing
- [ ] Update documentation

## 📞 Emergency Response

### Incident Response Team
- **Technical Lead**: Primary contact for system issues
- **Security Officer**: Handle security incidents
- **Compliance Officer**: Manage healthcare regulatory issues
- **Communications**: User/stakeholder notifications

### Emergency Contacts
- Google Cloud Support: [Support level contact]
- Database Provider (Neon): [Support contact]
- AI Services (OpenAI/Anthropic): [Support contacts]
- Healthcare Compliance Consultant: [Contact info]

### Escalation Procedures
1. **Critical**: Service completely down (< 5 min response)
2. **High**: Major feature broken (< 30 min response)
3. **Medium**: Performance degradation (< 2 hour response)
4. **Low**: Minor issues (< 24 hour response)

---

**Deployment Status**: ✅ Ready for Production

Your KGC Healthcare Platform is ready for secure, compliant deployment to Google Cloud Run with comprehensive monitoring and healthcare regulatory compliance.