# Operations Runbooks

## Overview
This document provides operational procedures for the KGC Healthcare Platform, covering incident response, maintenance operations, security procedures, and support workflows. All procedures maintain compliance with TGA Class I SaMD requirements and Australian Privacy Principles.

## Table of Contents
1. [Incident Response](#incident-response)
2. [Rollback Procedures](#rollback-procedures)
3. [Key Rotation](#key-rotation)
4. [Rate Limit Management](#rate-limit-management)
5. [Support Playbook](#support-playbook)
6. [Maintenance Procedures](#maintenance-procedures)
7. [Emergency Contacts](#emergency-contacts)

---

## Incident Response

### Incident Classification

#### Severity Levels
```yaml
P0 - Critical:
  - Service completely down
  - Data breach or security incident
  - Patient safety concerns
  - Australian privacy law violations
  - TGA compliance violations
  
P1 - High:
  - Major functionality unavailable
  - Performance severely degraded
  - AI services non-functional
  - SMS/email notifications failing
  
P2 - Medium:
  - Minor functionality issues
  - Performance slightly degraded  
  - Non-critical features affected
  - Isolated user reports
  
P3 - Low:
  - Cosmetic issues
  - Documentation updates needed
  - Non-urgent improvements
  - Feature requests
```

### Incident Response Workflow

#### Initial Response (0-15 minutes)
1. **Acknowledge Incident**
   ```bash
   # Post in incident channel
   "🚨 INCIDENT: [P0/P1/P2/P3] - Brief description
   Investigating... ETA: [time]
   IC: @[incident-commander]"
   ```

2. **Assess Impact**
   - Check service status dashboard
   - Review error rates and response times  
   - Identify affected user segments
   - Determine healthcare compliance impact

3. **Immediate Containment**
   ```bash
   # If security incident
   # 1. Isolate affected systems
   # 2. Preserve evidence
   # 3. Change credentials if compromised
   
   # If service degradation
   # 1. Scale up resources
   # 2. Route traffic away from failing components
   # 3. Enable maintenance mode if needed
   ```

#### Investigation Phase (15-60 minutes)
4. **Gather Information**
   ```bash
   # Check application logs
   aws logs tail /aws/apprunner/kgc-api --follow
   
   # Check database performance
   # Monitor connection counts, slow queries
   
   # Check external service status
   curl -f https://status.openai.com/
   curl -f https://status.twilio.com/
   ```

5. **Root Cause Analysis**
   - Timeline reconstruction
   - Change correlation analysis
   - Resource utilization review
   - Dependencies status check

#### Resolution Phase
6. **Implement Fix**
   ```bash
   # Emergency hotfix deployment
   ./tools/scripts/deploy_aws.sh
   
   # Database fixes (if needed)
   # Connect to production DB carefully
   
   # Configuration changes
   # Update environment variables or secrets
   ```

7. **Verify Resolution**
   - Run health checks
   - Monitor error rates
   - Test critical user journeys
   - Validate compliance features

#### Communication
8. **Status Updates**
   ```
   Every 30 minutes during active incident:
   "UPDATE: [timestamp] - [current status]
   Actions taken: [brief summary]
   Next update: [time]
   Impact: [user-facing impact]"
   ```

### Healthcare-Specific Incident Procedures

#### Patient Data Breach Response
```yaml
Immediate Actions (0-30 minutes):
  - Isolate affected systems
  - Document breach scope and timeline
  - Preserve forensic evidence
  - Notify incident commander
  
Compliance Actions (30 minutes - 4 hours):
  - Assess if notification required under Privacy Act 1988
  - Document affected patient records
  - Prepare preliminary impact assessment
  - Contact legal counsel if needed
  
Notification Requirements:
  - OAIC (Office of Australian Information Commissioner): Within 30 days if eligible data breach
  - Affected individuals: As soon as practicable if likely serious harm
  - TGA: If patient safety implications
```

#### AI Safety Incident Response
```yaml
Triggers:
  - Emergency keywords detected in AI responses
  - Inappropriate medical advice generated
  - AI system providing diagnostic information
  - Privacy protection agent failures
  
Immediate Actions:
  - Flag and quarantine problematic responses
  - Disable affected AI tools temporarily
  - Review recent AI interactions
  - Document incident for compliance review
  
Investigation:
  - Audit AI prompt configuration
  - Review training data if applicable
  - Check emergency detection algorithms
  - Validate system boundaries (Class I SaMD)
```

---

## Rollback Procedures

### Application Rollback

#### Vercel Frontend Rollback
```bash
# Method 1: Vercel CLI
vercel rollback https://previous-deployment-url.vercel.app

# Method 2: Vercel Dashboard
# 1. Go to Deployments tab
# 2. Find previous working deployment
# 3. Click "Promote to Production"

# Method 3: Git-based rollback
git log --oneline -10  # Find working commit
git revert <commit-hash>
git push origin main   # Triggers new deployment
```

#### AWS API Service Rollback
```bash
# App Runner service rollback
aws apprunner start-deployment \
  --service-arn arn:aws:apprunner:ap-southeast-2:$ACCOUNT:service/kgc-api \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "PREVIOUS_WORKING_IMAGE_TAG",
      "ImageConfiguration": {
        "Port": "5000",
        "StartCommand": "npm start",
        "RuntimeEnvironmentVariables": {}
      }
    }
  }'

# Monitor rollback progress
aws apprunner describe-service \
  --service-arn arn:aws:apprunner:ap-southeast-2:$ACCOUNT:service/kgc-api \
  --query 'Service.Status'
```

### Database Rollback

#### Schema Rollback (Drizzle)
```bash
# Warning: Data loss possible - backup first!

# 1. Backup current database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Reset to previous schema state
# Use Drizzle migrations (when implemented)
pnpm db:migrate:down

# 3. Or manual schema rollback
psql $DATABASE_URL -f previous_schema.sql
```

#### Point-in-Time Recovery (Neon)
```bash
# Neon console or API
# 1. Go to Neon console
# 2. Select database
# 3. Click "Restore" 
# 4. Choose point-in-time (up to 7 days for free tier)
# 5. Create new branch/database
# 6. Update DATABASE_URL to new instance
```

### Configuration Rollback

#### Environment Variables
```bash
# AWS Secrets Manager rollback
aws secretsmanager put-secret-value \
  --secret-id prod/KGC/sec \
  --secret-string file://previous_config.json \
  --version-stage AWSCURRENT

# Vercel environment variables
# Manual rollback via Vercel dashboard
# 1. Go to Project Settings > Environment Variables
# 2. Update values to previous working configuration
# 3. Redeploy to apply changes
```

### Rollback Validation Checklist
- [ ] Service health checks passing
- [ ] Critical user journeys functional
- [ ] Authentication working correctly
- [ ] AI services responding appropriately
- [ ] SMS/email notifications working
- [ ] Database connectivity verified
- [ ] No error spikes in monitoring
- [ ] Healthcare features functional (emergency detection, privacy protection)

---

## Key Rotation

### Rotation Schedule
```yaml
High Priority (Monthly):
  - JWT signing keys (SESSION_SECRET)
  - Database encryption keys
  - API gateway keys
  
Medium Priority (Quarterly):
  - OpenAI API keys
  - Anthropic API keys
  - Twilio auth tokens
  - SendGrid API keys
  
Low Priority (Annually):
  - Service account credentials
  - Certificate renewal
  - Backup encryption keys
```

### Rotation Procedures

#### JWT Session Secret Rotation
```bash
# 1. Generate new secret
NEW_SECRET=$(openssl rand -base64 64)

# 2. Update AWS Secrets Manager
aws secretsmanager update-secret \
  --secret-id prod/KGC/sec \
  --secret-string "{\"SESSION_SECRET_NEW\":\"$NEW_SECRET\",...}"

# 3. Deploy with dual-secret support
# Allow both old and new secrets during transition period

# 4. Verify new secret works
curl -X POST https://api.keepgoingcare.com/api/auth/login \
  -d '{"email":"test@example.com","password":"test"}'

# 5. Remove old secret after 24-48 hours
# Update secret to only include new key
```

#### API Key Rotation (External Services)
```bash
# OpenAI API Key Rotation
# 1. Generate new key in OpenAI dashboard
# 2. Update secrets manager
aws secretsmanager update-secret \
  --secret-id prod/KGC/sec \
  --secret-string "{\"OPENAI_API_KEY\":\"sk-proj-NEW_KEY\",...}"

# 3. Deploy application
./tools/scripts/deploy_aws.sh

# 4. Test AI functionality
curl -X POST https://api.keepgoingcare.com/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"Hello, test AI functionality"}'

# 5. Revoke old key in OpenAI dashboard
```

#### Database Credentials Rotation
```bash
# For Neon (managed service)
# 1. Create new database user in Neon console
# 2. Generate new connection string
# 3. Update DATABASE_URL in secrets
# 4. Deploy and verify connectivity
# 5. Remove old database user

# For self-managed PostgreSQL
psql $DATABASE_URL -c "CREATE USER kgc_new WITH PASSWORD 'NEW_SECURE_PASSWORD';"
psql $DATABASE_URL -c "GRANT ALL PRIVILEGES ON DATABASE kgc_production TO kgc_new;"
# Update connection string and deploy
# Test functionality, then drop old user
```

### Healthcare Compliance for Key Rotation
- **Audit Logging**: Log all key rotation activities
- **Access Control**: Restrict key rotation to authorized personnel
- **Data Integrity**: Verify no data corruption during rotation
- **Privacy Protection**: Ensure PII encryption keys are rotated securely

---

## Rate Limit Management

### Rate Limit Configuration

#### API Rate Limits
```typescript
// Current rate limits (adjust based on usage)
const rateLimits = {
  // General API access
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // requests per window per IP
    message: 'Too many requests, please try again later'
  },
  
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 5, // login attempts per window
    skipSuccessfulRequests: true
  },
  
  // AI chat endpoints
  chat: {
    windowMs: 60 * 1000, // 1 minute  
    max: 10, // AI requests per minute per user
    keyGenerator: (req) => req.user?.id || req.ip
  },
  
  // SMS/Email endpoints
  notifications: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // SMS/email per hour per user
    keyGenerator: (req) => req.user?.id
  }
};
```

#### External Service Rate Limits
```yaml
OpenAI API:
  - Tier 1: 500 RPM, 30,000 TPM
  - Monitor: track usage via dashboard
  - Alerts: 80% threshold warning
  
Anthropic API:
  - Claude 3.5 Sonnet: 50 RPM, 40,000 TPM  
  - Monitor: API response headers
  - Backup: fallback to different model
  
Twilio SMS:
  - Default: 100 SMS per second
  - Monitor: webhook delivery reports
  - Alerts: delivery failure rate > 5%
  
SendGrid Email:
  - Free tier: 100 emails/day
  - Monitor: delivery statistics
  - Alerts: bounce rate > 5%
```

### Rate Limit Monitoring

#### Monitoring Script
```bash
#!/bin/bash
# Check rate limit status

echo "=== API Rate Limits ==="
curl -s https://api.keepgoingcare.com/api/rate-limit-status | jq .

echo "=== OpenAI Usage ==="
curl -s "https://api.openai.com/v1/usage?date=$(date +%Y-%m-%d)" \
  -H "Authorization: Bearer $OPENAI_API_KEY" | jq .

echo "=== Twilio SMS Usage ==="
curl -s "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Usage/Records.json" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" | jq '.usage_records[]'
```

### Rate Limit Incident Response

#### Rate Limit Exceeded
```yaml
Symptoms:
  - 429 "Too Many Requests" errors
  - Users unable to access features
  - AI services returning rate limit errors
  
Immediate Actions:
  1. Identify source of excessive requests
  2. Implement temporary IP blocking if abuse detected
  3. Scale up rate limits if legitimate traffic spike
  4. Communicate with affected users
  
Investigation:
  - Review access logs for patterns
  - Check for bot traffic or abuse
  - Analyze user behavior anomalies
  - Monitor external service quotas
```

#### Healthcare-Specific Considerations
- **Patient Care Impact**: Prioritize healthcare-related API calls
- **Emergency Access**: Maintain higher limits for emergency detection
- **Privacy Protection**: Rate limit doesn't log sensitive request content

---

## Support Playbook

### Support Tiers

#### Tier 1 - General Inquiries
```yaml
Scope:
  - Account access issues
  - Basic feature questions
  - Password resets
  - General navigation help
  
Response Time: 24 hours
Tools: Support portal, knowledge base
Escalation: Technical issues, privacy concerns
```

#### Tier 2 - Technical Issues
```yaml
Scope:
  - AI functionality problems
  - Data synchronization issues
  - SMS/email delivery problems
  - Performance issues
  
Response Time: 8 hours
Tools: Application logs, database access
Escalation: Healthcare compliance, security incidents
```

#### Tier 3 - Healthcare & Compliance
```yaml
Scope:
  - Privacy concerns
  - Healthcare compliance questions
  - Data export/deletion requests
  - Security incidents
  
Response Time: 4 hours
Tools: Full system access, compliance documentation
Authority: Final escalation tier
```

### Common Issues & Resolutions

#### Authentication Issues
```yaml
Issue: User cannot log in
Troubleshooting:
  1. Verify user exists in database
     SELECT * FROM users WHERE email = '[user-email]';
  
  2. Check SMS delivery logs
     SELECT * FROM sms_logs WHERE phone_number = '[user-phone]' 
     ORDER BY created_at DESC LIMIT 5;
  
  3. Verify Twilio service status
  
  4. Check rate limiting
  
Resolution:
  - Reset user session
  - Resend SMS verification
  - Manually verify user if SMS fails
```

#### AI Service Issues
```yaml
Issue: AI responses not working
Troubleshooting:
  1. Check external API status
     - OpenAI status page
     - Anthropic status page
  
  2. Verify API key validity
     curl -H "Authorization: Bearer $OPENAI_API_KEY" \
          "https://api.openai.com/v1/models"
  
  3. Check rate limits and quotas
  
  4. Review recent AI responses for errors
     SELECT * FROM ai_interactions 
     WHERE created_at > NOW() - INTERVAL '1 hour'
     AND error IS NOT NULL;

Resolution:
  - Rotate API keys if needed
  - Switch to backup AI provider
  - Adjust rate limits
  - Contact AI service support
```

#### Data Issues
```yaml
Issue: Patient data not syncing
Troubleshooting:
  1. Check database connectivity
  2. Verify user permissions
  3. Review audit logs for data changes
  4. Check for privacy protection agent errors

Resolution:
  - Manual data sync
  - Database integrity check
  - Privacy agent restart
  - Escalate if data loss detected
```

### Healthcare Support Procedures

#### Privacy Requests
```yaml
Data Export Request:
  1. Verify user identity (multi-factor if possible)
  2. Generate comprehensive data export
     - Personal information
     - Health scores and metrics  
     - AI interaction history (anonymized)
     - Account activity logs
  3. Securely deliver via encrypted email
  4. Log request in compliance audit trail

Data Deletion Request:
  1. Verify legal requirements (Right to be Forgotten)
  2. Check data retention requirements
  3. Plan deletion across all systems:
     - Primary database
     - Backup systems
     - Log files (anonymize)
     - AI training data exclusion
  4. Execute deletion with verification
  5. Provide deletion confirmation
```

#### Medical Emergency Reports
```yaml
If User Reports Medical Emergency:
  1. IMMEDIATE: Direct to emergency services
     "Please call 000 (Australia) or your local emergency number"
  
  2. Document incident:
     - Time of report
     - User information
     - Nature of emergency
     - Actions taken
  
  3. Review AI interaction logs:
     - Check for emergency keywords
     - Verify detection systems worked
     - Document system response
  
  4. Follow-up:
     - Compliance review
     - System improvement assessment
     - Legal consultation if needed
```

---

## Maintenance Procedures

### Scheduled Maintenance

#### Weekly Maintenance (Sunday 2AM AEST)
```bash
#!/bin/bash
# Weekly maintenance script

echo "=== Weekly KGC Maintenance ==="

# 1. Database maintenance
echo "Running database cleanup..."
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# 2. Log rotation
echo "Rotating application logs..."
find /var/log/kgc -name "*.log" -mtime +7 -delete

# 3. Session cleanup
echo "Cleaning expired sessions..."
redis-cli --scan --pattern "sess:*" | xargs -r redis-cli del

# 4. Backup verification
echo "Verifying backups..."
./tools/scripts/verify_backups.sh

# 5. Security updates check
echo "Checking for security updates..."
npm audit
```

#### Monthly Maintenance
```bash
# 1. Dependency updates
pnpm update

# 2. Security scan
npm audit fix

# 3. Performance review
# - Database query analysis
# - API response time review  
# - Resource utilization check

# 4. Compliance review
# - Audit log analysis
# - Privacy protection verification
# - Healthcare boundary validation
```

### Emergency Maintenance

#### Database Emergency Maintenance
```sql
-- Emergency queries (use with extreme caution)

-- Check database health
SELECT 
  schemaname,
  tablename,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows
FROM pg_stat_user_tables 
ORDER BY n_dead_tup DESC;

-- Emergency session cleanup
DELETE FROM sessions WHERE expires < NOW();

-- Emergency log cleanup (if disk space critical)
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '30 days';
```

---

## Emergency Contacts

### Internal Contacts
```yaml
Incident Commander:
  - Primary: [Name] - [Phone] - [Email]
  - Backup: [Name] - [Phone] - [Email]

Technical Lead:
  - Primary: [Name] - [Phone] - [Email]  
  - Backup: [Name] - [Phone] - [Email]

Healthcare Compliance Officer:
  - Primary: [Name] - [Phone] - [Email]
  - Legal: [Name] - [Phone] - [Email]
```

### External Contacts
```yaml
Infrastructure:
  - AWS Support: [Case creation process]
  - Neon Support: support@neon.tech
  - Vercel Support: [Support portal]

External Services:
  - OpenAI Support: help@openai.com
  - Anthropic Support: support@anthropic.com
  - Twilio Support: help@twilio.com
  - SendGrid Support: support@sendgrid.com

Compliance:
  - OAIC (Privacy): enquiries@oaic.gov.au
  - TGA: info@tga.gov.au
  - Legal Counsel: [Law firm contact]
```

### Escalation Matrix
```yaml
Time-based Escalation:
  - 0-30 minutes: Technical team handles
  - 30-60 minutes: Escalate to technical lead
  - 1-2 hours: Escalate to incident commander
  - 2+ hours: Executive notification

Severity-based Escalation:
  - P0 (Critical): Immediate executive notification
  - P1 (High): Technical lead within 30 minutes
  - P2 (Medium): Normal escalation process
  - P3 (Low): Standard support workflow
```

---

## Documentation Maintenance

### Runbook Updates
- **Monthly Review**: Validate procedures against current system
- **Post-Incident**: Update based on lessons learned
- **Feature Changes**: Update when new features deployed
- **Compliance Changes**: Update when regulations change

### Testing Procedures
- **Quarterly**: Test rollback procedures in staging
- **Bi-annually**: Conduct incident response drills
- **Annually**: Full disaster recovery test

### Version Control
- All runbook changes tracked in git
- Peer review required for critical procedure changes
- Tag major versions for reference
- Maintain change log for audit purposes

This runbook serves as the operational foundation for maintaining the KGC Healthcare Platform while ensuring compliance with Australian healthcare regulations and providing excellent patient care through reliable technical operations.