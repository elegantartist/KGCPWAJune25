# Data Retention Policy

## Overview
This document defines data retention policies for the KGC Healthcare Platform, ensuring compliance with Australian Privacy Principles (APPs), TGA Class I SaMD requirements, and healthcare data protection standards. The policy balances operational needs, legal requirements, and user privacy rights.

## Legal Framework

### Australian Privacy Principles (APPs)
- **APP 11**: Security of personal information
- **APP 12**: Access to personal information  
- **APP 13**: Correction of personal information
- **APP 5**: Notification of collection of personal information
- **APP 6**: Use or disclosure of personal information

### Healthcare Regulations
- **TGA Class I SaMD**: Medical device data requirements
- **Privacy Act 1988**: Australian privacy legislation
- **State Health Records Acts**: Applicable state regulations

### Data Classifications
```yaml
Personal Health Information (PHI):
  - Daily self-scores and health metrics
  - Care plan directives and progress notes
  - AI interaction logs (anonymized)
  - Health-related communications
  
Personally Identifiable Information (PII):
  - Names, addresses, phone numbers, emails
  - User accounts and authentication data
  - Payment information (if applicable)
  - Device identifiers and IP addresses
  
Operational Data:
  - System logs and performance metrics
  - Error logs and debugging information
  - Analytics and usage statistics
  - Security audit trails
```

---

## Retention Schedules

### User Data Retention

#### Active User Data
```yaml
Daily Self-Scores:
  Retention Period: 7 years from last entry
  Justification: Healthcare record keeping standards
  Storage: Encrypted database, Australian data centers
  
Care Plan Directives (CPDs):
  Retention Period: 7 years from last modification
  Justification: Medical record continuity
  Storage: Encrypted with doctor access controls
  
AI Interaction Logs:
  Retention Period: 2 years (anonymized after 90 days)
  Justification: System improvement and compliance
  Storage: Anonymized, metadata only
  
Progress Reports:
  Retention Period: 7 years from generation
  Justification: Healthcare outcome tracking
  Storage: Linked to patient records
```

#### Account and Authentication Data
```yaml
User Profiles:
  Retention Period: Account lifetime + 90 days
  Justification: Account management and recovery
  Deletion Trigger: User account deletion + grace period
  
Authentication Logs:
  Retention Period: 13 months
  Justification: Security audit requirements
  Storage: Security audit system
  
Session Data:
  Retention Period: 30 days from session end
  Justification: Technical troubleshooting
  Storage: Redis cache with TTL
  
SMS/Email Communications:
  Retention Period: 2 years
  Justification: Communication audit trail
  Storage: Encrypted communication logs
```

### System Data Retention

#### Application Logs
```yaml
Error Logs:
  Retention Period: 6 months
  Justification: Debugging and system improvement
  Rotation: Daily rotation, compressed storage
  
Performance Logs:
  Retention Period: 3 months  
  Justification: Performance monitoring
  Aggregation: Daily/weekly aggregates kept longer
  
Security Logs:
  Retention Period: 13 months
  Justification: Security compliance
  Protection: Tamper-evident storage
```

#### Analytics and Metrics
```yaml
Usage Statistics:
  Retention Period: 2 years (anonymized)
  Justification: Product improvement insights
  Processing: Aggregated, no individual identification
  
Performance Metrics:
  Retention Period: 1 year
  Justification: System optimization
  Granularity: Detailed (1 month), Aggregated (1 year)
  
Health Analytics:
  Retention Period: De-identified, indefinite
  Justification: Population health insights
  Anonymization: All PII/PHI removed
```

### Compliance and Audit Data
```yaml
Audit Trails:
  Retention Period: 7 years
  Justification: Healthcare audit requirements
  Immutability: Write-once, tamper-evident storage
  
Compliance Reports:
  Retention Period: 7 years
  Justification: Regulatory demonstration
  Access: Compliance officers only
  
Privacy Impact Assessments:
  Retention Period: 7 years
  Justification: Privacy compliance demonstration
  Updates: Version controlled with history
```

---

## Data Export Procedures

### User Data Export

#### Patient Data Export Request
```yaml
Trigger: User requests data export under APP 12
Response Time: 30 days maximum (sooner if possible)
Format: Structured JSON + human-readable PDF
Delivery: Encrypted email or secure download link
```

#### Export Process
```bash
#!/bin/bash
# Patient data export script

USER_ID=$1
EXPORT_ID=$(uuidgen)
EXPORT_DIR="/tmp/exports/$EXPORT_ID"

echo "Starting data export for User ID: $USER_ID"
echo "Export ID: $EXPORT_ID"

# Create secure export directory
mkdir -p "$EXPORT_DIR"
chmod 700 "$EXPORT_DIR"

# 1. Export personal information
psql $DATABASE_URL -c "
  COPY (
    SELECT 
      first_name, last_name, email, phone,
      date_of_birth, created_at, last_login
    FROM users WHERE id = '$USER_ID'
  ) TO '$EXPORT_DIR/personal_info.csv' WITH CSV HEADER;
"

# 2. Export health data
psql $DATABASE_URL -c "
  COPY (
    SELECT 
      date, score, notes, created_at
    FROM daily_scores 
    WHERE user_id = '$USER_ID'
    ORDER BY date DESC
  ) TO '$EXPORT_DIR/health_scores.csv' WITH CSV HEADER;
"

# 3. Export care plan data
psql $DATABASE_URL -c "
  COPY (
    SELECT 
      title, description, status, 
      created_at, updated_at
    FROM care_plans 
    WHERE patient_id = '$USER_ID'
    ORDER BY created_at DESC
  ) TO '$EXPORT_DIR/care_plans.csv' WITH CSV HEADER;
"

# 4. Export AI interactions (anonymized)
psql $DATABASE_URL -c "
  COPY (
    SELECT 
      DATE(created_at) as interaction_date,
      'AI Chat' as interaction_type,
      CASE 
        WHEN length(user_message) > 100 
        THEN '[Message too long to display]'
        ELSE '[Message content anonymized]'
      END as summary,
      created_at
    FROM ai_interactions 
    WHERE user_id = '$USER_ID'
    AND created_at > NOW() - INTERVAL '2 years'
    ORDER BY created_at DESC
  ) TO '$EXPORT_DIR/ai_interactions.csv' WITH CSV HEADER;
"

# 5. Create comprehensive JSON export
node scripts/generate_user_export.js "$USER_ID" "$EXPORT_DIR"

# 6. Generate human-readable PDF report
pandoc "$EXPORT_DIR/export_summary.md" -o "$EXPORT_DIR/KGC_Data_Export.pdf"

# 7. Create encrypted archive
tar -czf "$EXPORT_DIR.tar.gz" -C "/tmp/exports" "$EXPORT_ID"
gpg --symmetric --cipher-algo AES256 --output "$EXPORT_DIR.tar.gz.gpg" "$EXPORT_DIR.tar.gz"

# 8. Generate secure download link
DOWNLOAD_TOKEN=$(openssl rand -hex 32)
echo "$DOWNLOAD_TOKEN:$EXPORT_DIR.tar.gz.gpg" >> /tmp/download_tokens.txt

echo "Export completed: /downloads/$DOWNLOAD_TOKEN"
echo "Archive password will be sent separately via SMS"

# 9. Log export request
psql $DATABASE_URL -c "
  INSERT INTO audit_logs (
    user_id, action, details, created_at
  ) VALUES (
    '$USER_ID', 'DATA_EXPORT', 
    '{\"export_id\":\"$EXPORT_ID\",\"download_token\":\"$DOWNLOAD_TOKEN\"}',
    NOW()
  );
"

# 10. Cleanup (after 7 days)
echo "rm -rf $EXPORT_DIR $EXPORT_DIR.tar.gz $EXPORT_DIR.tar.gz.gpg" | at now + 7 days
```

#### Export Content Specification
```json
{
  "export_metadata": {
    "export_date": "2025-08-20T10:30:00Z",
    "export_id": "uuid-string",
    "user_id": "user-uuid",
    "data_period": "account_creation_to_export_date",
    "retention_notice": "This export contains your data up to the export date."
  },
  "personal_information": {
    "name": "Full Name",
    "email": "user@example.com",
    "phone": "+61...",
    "account_created": "2024-01-15T00:00:00Z",
    "last_login": "2025-08-19T08:15:00Z"
  },
  "health_data": {
    "daily_scores": [
      {
        "date": "2025-08-19",
        "overall_score": 7,
        "energy_level": 8,
        "mood_score": 6,
        "notes": "User-entered notes"
      }
    ],
    "progress_metrics": [
      {
        "metric_type": "consistency",
        "value": 85.5,
        "period": "last_30_days"
      }
    ]
  },
  "care_management": {
    "care_plan_directives": [
      {
        "title": "Daily Hydration Goal",
        "description": "Drink 8 glasses of water daily",
        "status": "active",
        "created_by": "Dr. Smith",
        "created_date": "2024-06-01"
      }
    ]
  },
  "ai_interactions": {
    "summary": {
      "total_conversations": 45,
      "date_range": "2024-01-15 to 2025-08-20",
      "privacy_note": "Conversation content has been anonymized for privacy protection"
    },
    "interaction_log": [
      {
        "date": "2025-08-19",
        "type": "health_guidance",
        "summary": "Requested guidance on daily routine optimization"
      }
    ]
  },
  "account_activity": {
    "login_history": "Last 13 months of login timestamps",
    "feature_usage": "Anonymized usage statistics",
    "notification_preferences": "Current notification settings"
  }
}
```

### System Data Export

#### Compliance Data Export
```bash
#!/bin/bash
# Export data for compliance/audit purposes

# 1. Audit trail export
psql $DATABASE_URL -c "
  COPY (
    SELECT * FROM audit_logs 
    WHERE created_at BETWEEN '$START_DATE' AND '$END_DATE'
  ) TO 'audit_export_$(date +%Y%m%d).csv' WITH CSV HEADER;
"

# 2. Anonymized health insights export
psql $DATABASE_URL -c "
  COPY (
    SELECT 
      DATE_TRUNC('week', created_at) as week,
      COUNT(*) as total_scores,
      AVG(overall_score) as avg_score,
      COUNT(DISTINCT user_id) as active_users
    FROM daily_scores
    WHERE created_at BETWEEN '$START_DATE' AND '$END_DATE'
    GROUP BY DATE_TRUNC('week', created_at)
    ORDER BY week
  ) TO 'health_insights_$(date +%Y%m%d).csv' WITH CSV HEADER;
"

# 3. System performance export
aws logs filter-log-events \
  --log-group-name "/aws/apprunner/kgc-api" \
  --start-time $(date -d "$START_DATE" +%s)000 \
  --end-time $(date -d "$END_DATE" +%s)000 \
  --filter-pattern "ERROR" \
  --output json > error_logs_$(date +%Y%m%d).json
```

---

## Data Deletion Procedures

### User-Requested Deletion

#### Account Deletion Request
```yaml
Trigger: User requests account deletion
Verification: Multi-factor authentication required
Grace Period: 30 days (user can recover account)
Complete Deletion: After grace period expires
```

#### Deletion Process
```bash
#!/bin/bash
# User account deletion script

USER_ID=$1
DELETION_ID=$(uuidgen)

echo "Starting account deletion for User ID: $USER_ID"
echo "Deletion ID: $DELETION_ID"

# 1. Mark account for deletion (grace period)
psql $DATABASE_URL -c "
  UPDATE users 
  SET 
    deletion_requested_at = NOW(),
    deletion_id = '$DELETION_ID',
    status = 'pending_deletion'
  WHERE id = '$USER_ID';
"

# 2. Log deletion request
psql $DATABASE_URL -c "
  INSERT INTO audit_logs (
    user_id, action, details, created_at
  ) VALUES (
    '$USER_ID', 'DELETION_REQUESTED',
    '{\"deletion_id\":\"$DELETION_ID\",\"grace_period_ends\":\"$(date -d '+30 days' -Iseconds)\"}',
    NOW()
  );
"

# 3. Send confirmation email
curl -X POST "https://api.sendgrid.com/v3/mail/send" \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"personalizations\":[{\"to\":[{\"email\":\"$(get_user_email $USER_ID)\"}]}],
    \"from\":{\"email\":\"welcome@keepgoingcare.com\"},
    \"subject\":\"Account Deletion Confirmation - KGC\",
    \"content\":[{
      \"type\":\"text/plain\",
      \"value\":\"Your account deletion has been scheduled. You have 30 days to change your mind by logging in. Deletion ID: $DELETION_ID\"
    }]
  }"

# 4. Schedule actual deletion (after grace period)
echo "bash /scripts/execute_account_deletion.sh $USER_ID $DELETION_ID" | at now + 30 days

echo "Account marked for deletion. Grace period: 30 days"
echo "Deletion ID: $DELETION_ID"
```

#### Complete Deletion Execution
```bash
#!/bin/bash
# Execute complete account deletion after grace period

USER_ID=$1
DELETION_ID=$2

echo "Executing complete account deletion for User ID: $USER_ID"

# Verify grace period has passed
DELETION_TIME=$(psql $DATABASE_URL -t -c "
  SELECT deletion_requested_at + INTERVAL '30 days' 
  FROM users WHERE id = '$USER_ID' AND deletion_id = '$DELETION_ID';
")

if [[ $(date -d "$DELETION_TIME" +%s) -gt $(date +%s) ]]; then
  echo "Grace period not yet expired. Aborting deletion."
  exit 1
fi

# Begin transaction for atomic deletion
psql $DATABASE_URL <<EOF
BEGIN;

-- 1. Delete health data
DELETE FROM daily_scores WHERE user_id = '$USER_ID';
DELETE FROM progress_reports WHERE user_id = '$USER_ID';
DELETE FROM care_plan_directives WHERE patient_id = '$USER_ID';

-- 2. Anonymize AI interactions (preserve for system learning)
UPDATE ai_interactions 
SET 
  user_id = NULL,
  user_message = '[DELETED]',
  pii_anonymized = true,
  updated_at = NOW()
WHERE user_id = '$USER_ID';

-- 3. Delete communication logs
DELETE FROM sms_logs WHERE user_id = '$USER_ID';
DELETE FROM email_logs WHERE user_id = '$USER_ID';

-- 4. Delete session data
DELETE FROM sessions WHERE user_id = '$USER_ID';

-- 5. Delete authentication data
DELETE FROM auth_tokens WHERE user_id = '$USER_ID';

-- 6. Final audit log before user deletion
INSERT INTO audit_logs (
  user_id, action, details, created_at
) VALUES (
  '$USER_ID', 'ACCOUNT_DELETED',
  '{"deletion_id":"$DELETION_ID","deletion_type":"user_requested","data_deleted":true}',
  NOW()
);

-- 7. Delete user account (preserves audit log via user_id)
DELETE FROM users WHERE id = '$USER_ID';

COMMIT;
EOF

echo "Account deletion completed successfully"
echo "Deletion ID: $DELETION_ID"
echo "Audit trail preserved"
```

### Automated Data Retention

#### Daily Cleanup Script
```bash
#!/bin/bash
# Daily automated cleanup script

echo "Starting daily data retention cleanup..."

# 1. Clean expired sessions
redis-cli --eval cleanup_expired_sessions.lua

# 2. Rotate application logs
find /var/log/kgc -name "*.log" -mtime +90 -delete
find /var/log/kgc -name "*.log" -mtime +30 -exec gzip {} \;

# 3. Clean old temporary files
find /tmp -name "export_*" -mtime +7 -delete
find /tmp -name "download_*" -mtime +1 -delete

# 4. Anonymize old AI interactions (>90 days)
psql $DATABASE_URL -c "
  UPDATE ai_interactions 
  SET 
    user_message = '[ANONYMIZED]',
    ai_response = '[ANONYMIZED]',
    pii_anonymized = true,
    anonymized_at = NOW()
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND pii_anonymized = false;
"

# 5. Delete very old performance logs (>3 months)
psql $DATABASE_URL -c "
  DELETE FROM performance_logs 
  WHERE created_at < NOW() - INTERVAL '3 months';
"

# 6. Archive old audit logs (>1 year, keep for 7 years total)
psql $DATABASE_URL -c "
  INSERT INTO audit_logs_archive (
    SELECT * FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '1 year'
      AND created_at > NOW() - INTERVAL '7 years'
  );
  
  DELETE FROM audit_logs 
  WHERE created_at < NOW() - INTERVAL '1 year'
    AND id IN (SELECT id FROM audit_logs_archive);
"

echo "Daily cleanup completed"
```

---

## Data Recovery Procedures

### Backup and Recovery Strategy

#### Backup Schedule
```yaml
Database Backups:
  Frequency: Continuous (Neon automatic backups)
  Retention: 7 days (free tier), 30 days (paid tier)
  Type: Point-in-time recovery available
  
Application Data:
  Frequency: Daily
  Retention: 30 days
  Storage: AWS S3 with encryption
  
Configuration Backups:
  Frequency: On change
  Retention: 90 days
  Version Control: Git repository
```

#### Point-in-Time Recovery
```bash
#!/bin/bash
# Point-in-time recovery procedure

TARGET_TIME="2025-08-19T14:30:00Z"
RECOVERY_DB="kgc_recovery_$(date +%Y%m%d_%H%M)"

echo "Starting point-in-time recovery to: $TARGET_TIME"

# 1. Create recovery branch in Neon
# (This would be done via Neon console or API)
echo "Create recovery branch in Neon console:"
echo "- Go to Neon dashboard"
echo "- Select main branch"
echo "- Click 'Create branch'"
echo "- Set restore point to: $TARGET_TIME"
echo "- Name: $RECOVERY_DB"

# 2. Get recovery connection string
echo "Update DATABASE_URL to recovery branch connection string"

# 3. Validate recovery
psql $RECOVERY_DATABASE_URL -c "
  SELECT 
    'users' as table_name,
    COUNT(*) as record_count,
    MAX(updated_at) as last_update
  FROM users
  
  UNION ALL
  
  SELECT 
    'daily_scores' as table_name,
    COUNT(*) as record_count,
    MAX(created_at) as last_update
  FROM daily_scores;
"

# 4. Data consistency check
node scripts/validate_data_integrity.js --database="$RECOVERY_DATABASE_URL"

echo "Recovery validation completed"
echo "Review data before switching to recovery database"
```

### Emergency Data Recovery

#### Accidental Data Deletion
```yaml
Detection: Automated alerts on bulk deletions
Response Time: Within 4 hours
Recovery Method: Point-in-time restore to just before deletion
Validation: Compare record counts and key data integrity

Process:
1. Immediately stop application to prevent further changes
2. Identify exact time of deletion from audit logs
3. Create point-in-time recovery branch
4. Validate recovered data integrity
5. Switch application to recovery database
6. Communicate incident to affected users
```

---

## Compliance Monitoring

### Retention Policy Compliance

#### Automated Monitoring
```bash
#!/bin/bash
# Data retention compliance check

echo "=== Data Retention Compliance Report ==="
echo "Generated: $(date -Iseconds)"

# Check for data exceeding retention periods
psql $DATABASE_URL -c "
  SELECT 
    'Users with data older than 7 years' as check_type,
    COUNT(*) as violation_count
  FROM users 
  WHERE created_at < NOW() - INTERVAL '7 years'
    AND status != 'deleted'
  
  UNION ALL
  
  SELECT 
    'Sessions older than 30 days' as check_type,
    COUNT(*) as violation_count
  FROM sessions
  WHERE expires < NOW() - INTERVAL '30 days'
  
  UNION ALL
  
  SELECT 
    'Logs older than retention period' as check_type,
    COUNT(*) as violation_count
  FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '7 years';
"

# Check anonymization compliance
psql $DATABASE_URL -c "
  SELECT 
    'AI interactions not anonymized after 90 days' as check_type,
    COUNT(*) as violation_count
  FROM ai_interactions
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND pii_anonymized = false;
"

echo "=== End Report ==="
```

#### Manual Review Process
```yaml
Quarterly Review:
  - Retention policy effectiveness assessment
  - Data classification accuracy review
  - User request handling evaluation
  - System performance impact analysis

Annual Review:
  - Legal requirement updates
  - Retention period adjustment recommendations
  - Process improvement identification
  - Stakeholder feedback incorporation
```

### Audit and Documentation

#### Retention Activity Logging
```sql
-- All retention activities are logged
CREATE TABLE retention_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type VARCHAR(50) NOT NULL, -- 'deletion', 'anonymization', 'export', 'archive'
  affected_records INTEGER NOT NULL,
  data_types TEXT[] NOT NULL,
  retention_rule_applied VARCHAR(100),
  executed_by VARCHAR(100),
  execution_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  details JSONB,
  compliance_validation BOOLEAN DEFAULT false
);
```

#### Privacy Impact Assessment
Regular assessment of retention policy impact on user privacy and system performance, ensuring the policy remains appropriate for the healthcare context and regulatory environment.

This data retention policy ensures the KGC Healthcare Platform maintains appropriate data lifecycle management while respecting user privacy rights and meeting healthcare compliance requirements in Australia.