# RDS PostgreSQL Setup

This document provides step-by-step instructions for setting up an Amazon RDS PostgreSQL database for the KGC application. This database will store all persistent data, including user information, health metrics, and care plan directives.

## Prerequisites

Before setting up RDS PostgreSQL:
- Complete the [VPC setup](./02-networking-vpc.md)
- Have the database credentials from the existing KGC application ready
- Understand the data retention requirements (7 years for medical data)

## Step 1: Create a Subnet Group

First, create a DB subnet group that will specify which subnets in your VPC the database instance can use.

### Console Instructions

1. **Navigate to RDS**
   - Sign in to the AWS Management Console
   - Search for "RDS" and select the service

2. **Create Subnet Group**
   - From the left navigation, select "Subnet groups"
   - Click "Create DB subnet group"
   - Enter the following details:
     - Name: "kgc-db-subnet-group"
     - Description: "Subnet group for KGC database"
     - VPC: Select your KGC-VPC
     - Availability Zones: Select all three AZs
     - Subnets: Select all of your isolated subnets
   - Click "Create"
   
   ![Create DB Subnet Group](../images/rds-subnet-group.png)

### CLI Commands

```bash
# Create DB Subnet Group
aws rds create-db-subnet-group \
  --db-subnet-group-name kgc-db-subnet-group \
  --db-subnet-group-description "Subnet group for KGC database" \
  --subnet-ids subnet-XXXXXXXXXXXXXXXXX subnet-YYYYYYYYYYYYYYYYY subnet-ZZZZZZZZZZZZZZZZZ \
  --region ap-southeast-2
```

## Step 2: Create a Parameter Group

Create a parameter group to customize your database configuration.

### Console Instructions

1. **Navigate to Parameter Groups**
   - From the RDS Dashboard, select "Parameter groups" from the left navigation
   - Click "Create parameter group"
   - Enter the following details:
     - Parameter group family: "postgres14"
     - Type: "DB parameter group"
     - Group name: "kgc-postgres14-params"
     - Description: "Custom parameters for KGC PostgreSQL database"
   - Click "Create"

2. **Modify Parameter Group Settings**
   - Select your new parameter group
   - Click "Edit parameters"
   - Modify the following parameters:
     - `max_connections`: 200 (increase from default)
     - `shared_buffers`: 4096MB (adjust based on instance size)
     - `work_mem`: 64MB
     - `maintenance_work_mem`: 256MB
     - `effective_cache_size`: 12288MB
     - `log_statement`: 'mod' (log all modification statements)
     - `log_min_duration_statement`: 1000 (log slow queries over 1 second)
     - `ssl`: 1 (enforce SSL)
   - Click "Save changes"

### CLI Commands

```bash
# Create Parameter Group
aws rds create-db-parameter-group \
  --db-parameter-group-name kgc-postgres14-params \
  --db-parameter-group-family postgres14 \
  --description "Custom parameters for KGC PostgreSQL database" \
  --region ap-southeast-2

# Modify Parameters
aws rds modify-db-parameter-group \
  --db-parameter-group-name kgc-postgres14-params \
  --parameters "ParameterName=max_connections,ParameterValue=200,ApplyMethod=pending-reboot" \
               "ParameterName=shared_buffers,ParameterValue=4096MB,ApplyMethod=pending-reboot" \
               "ParameterName=work_mem,ParameterValue=64MB,ApplyMethod=pending-reboot" \
               "ParameterName=maintenance_work_mem,ParameterValue=256MB,ApplyMethod=pending-reboot" \
               "ParameterName=effective_cache_size,ParameterValue=12288MB,ApplyMethod=pending-reboot" \
               "ParameterName=log_statement,ParameterValue=mod,ApplyMethod=pending-reboot" \
               "ParameterName=log_min_duration_statement,ParameterValue=1000,ApplyMethod=pending-reboot" \
               "ParameterName=ssl,ParameterValue=1,ApplyMethod=pending-reboot" \
  --region ap-southeast-2
```

## Step 3: Create RDS PostgreSQL Instance

### Console Instructions

1. **Navigate to Databases**
   - From the RDS Dashboard, select "Databases" from the left navigation
   - Click "Create database"

2. **Choose Database Creation Method**
   - Select "Standard create"
   - Engine type: "PostgreSQL"
   - Version: "PostgreSQL 14.7-R1" (or the latest available version)
   
   ![Choose PostgreSQL](../images/rds-postgres-engine.png)

3. **Configure Instance**
   - Templates: "Production" (for production) or "Dev/Test" (for development/testing)
   - DB instance identifier: "kgc-postgres"
   - Master username: "kgcadmin" (avoid using "postgres" for security)
   - Master password: Generate and securely store a strong password
   - DB instance class:
     - For development/testing: "db.t4g.medium"
     - For production: "db.m6g.large" or higher
   - Storage:
     - Storage type: "General Purpose SSD (gp3)"
     - Allocated storage: 100 GB (adjust based on data needs)
     - Enable storage autoscaling
     - Maximum storage threshold: 1000 GB
     
   ![Configure Instance](../images/rds-instance-config.png)

4. **Configure Availability**
   - Multi-AZ deployment: "Create a standby instance" for production, "Do not create a standby instance" for dev/testing
   
   ![Configure Availability](../images/rds-availability.png)

5. **Configure Connectivity**
   - VPC: Select your KGC-VPC
   - Subnet group: Select "kgc-db-subnet-group"
   - Public access: "No"
   - VPC security group: Select "KGC-DB-Tier-SG"
   - Availability Zone: No preference (AWS will choose optimal AZ)
   - Database port: 5432 (default)
   
   ![Configure Connectivity](../images/rds-connectivity.png)

6. **Additional Configuration**
   - Initial database name: "kgc_production" (or "kgc_development" for dev/test)
   - DB parameter group: Select "kgc-postgres14-params"
   - Option group: Default
   - Authentication:
     - Password authentication
     - (For production) Enable IAM database authentication
   - Encryption:
     - Enable encryption
     - AWS KMS key: Choose "aws/rds" or create a custom key
   - Backup:
     - Enable automated backups
     - Retention period: 35 days (for 7-year medical data, set up additional backup strategies)
     - Backup window: No preference (or choose a time with low traffic)
     - Copy tags to snapshots: Yes
   - Monitoring:
     - Enable Enhanced monitoring
     - Granularity: 60 seconds
     - Monitoring role: Create new or select existing role
   - Log exports: Select "PostgreSQL log", "Upgrade log"
   - Maintenance:
     - Enable auto minor version upgrade
     - Maintenance window: No preference (or choose a time with low traffic)
   - Deletion protection: Enable (for production)
   
   ![Additional Configuration](../images/rds-additional-config.png)

7. **Review and Create**
   - Review your configuration
   - Click "Create database"
   - Wait for the database to be created (10-20 minutes)

### CLI Commands

```bash
# Generate and store a secure password
DB_PASSWORD=$(openssl rand -base64 16)
echo "New DB Password: $DB_PASSWORD"
aws secretsmanager create-secret \
  --name KGC/Database/MasterPassword \
  --description "Master password for KGC RDS PostgreSQL" \
  --secret-string "$DB_PASSWORD" \
  --region ap-southeast-2

# Create RDS Instance
aws rds create-db-instance \
  --db-instance-identifier kgc-postgres \
  --db-instance-class db.m6g.large \
  --engine postgres \
  --engine-version 14.7 \
  --master-username kgcadmin \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 100 \
  --max-allocated-storage 1000 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-XXXXXXXX \
  --db-subnet-group-name kgc-db-subnet-group \
  --db-parameter-group-name kgc-postgres14-params \
  --backup-retention-period 35 \
  --preferred-backup-window "07:00-09:00" \
  --preferred-maintenance-window "Sun:23:45-Mon:00:15" \
  --multi-az \
  --storage-encrypted \
  --enable-iam-database-authentication \
  --enable-performance-insights \
  --performance-insights-retention-period 7 \
  --monitoring-interval 60 \
  --monitoring-role-arn arn:aws:iam::ACCOUNT_ID:role/rds-monitoring-role \
  --enable-cloudwatch-logs-exports '["postgresql","upgrade"]' \
  --deletion-protection \
  --db-name kgc_production \
  --region ap-southeast-2
```

## Step 4: Configure Backup and Retention for 7-Year Compliance

To meet the 7-year data retention requirement for medical data, set up additional backup strategies.

### Console Instructions

1. **Create a Custom Automated Snapshot Schedule**
   - From the Amazon RDS Dashboard, select your database instance
   - Click on the "Maintenance & backups" tab
   - Under "Backup", click "Edit"
   - Configure "Automated backups" with the maximum retention period (35 days)
   - Click "Save changes"

2. **Set Up AWS Backup for Long-Term Retention**
   - Navigate to the AWS Backup console
   - Click "Create backup plan"
   - Choose "Build a new plan"
   - Enter a plan name: "KGC-7-Year-Retention"
   - Configure backup rules:
     - Rule name: "Monthly-7-Year-Retention"
     - Frequency: Monthly
     - Run backup at: Select a consistent date/time
     - Retention period: 7 years (2555 days)
     - Transition to cold storage: After 3 months
   - Add resource assignments:
     - Resource assignment name: "KGC-Database"
     - Resource types: Select "RDS"
     - Resource selection: "Specific resource"
     - Select your database instance
   - Click "Create backup plan"
   
   ![AWS Backup Plan](../images/aws-backup-plan.png)

### CLI Commands

```bash
# Create Backup Plan
aws backup create-backup-plan \
  --backup-plan '{
    "BackupPlanName": "KGC-7-Year-Retention",
    "Rules": [
      {
        "RuleName": "Monthly-7-Year-Retention",
        "TargetBackupVaultName": "Default",
        "ScheduleExpression": "cron(0 0 1 * ? *)",
        "StartWindowMinutes": 480,
        "CompletionWindowMinutes": 10080,
        "Lifecycle": {
          "MoveToColdStorageAfterDays": 90,
          "DeleteAfterDays": 2555
        }
      }
    ]
  }' \
  --region ap-southeast-2

# Add Resource Assignments
aws backup create-backup-selection \
  --backup-plan-id BACKUP_PLAN_ID \
  --backup-selection '{
    "SelectionName": "KGC-Database",
    "IamRoleArn": "arn:aws:iam::ACCOUNT_ID:role/backup-role",
    "Resources": [
      "arn:aws:rds:ap-southeast-2:ACCOUNT_ID:db:kgc-postgres"
    ]
  }' \
  --region ap-southeast-2
```

## Step 5: Configure Database Security and Encryption

### Configure SSL Connections

1. **Download RDS CA Bundle**
   - Go to https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
   - Save the file as `rds-ca-bundle.pem`

2. **Configure Application to Use SSL**
   - Update database connection parameters to include SSL:

```typescript
// Sample code for database connection with SSL
import { Pool } from 'pg';

const pool = new Pool({
  host: 'kgc-postgres.XXXXXXXXXXXX.ap-southeast-2.rds.amazonaws.com',
  port: 5432,
  database: 'kgc_production',
  user: 'kgcadmin',
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('rds-ca-bundle.pem').toString(),
  },
});
```

### Enable Database Encryption

Database encryption should already be enabled from the instance creation steps. To verify:

1. **Check Encryption Status**
   - From the RDS Dashboard, select your database instance
   - Click on the "Configuration" tab
   - Under "Storage", verify that "Encryption" is "Enabled"

## Step 6: Create Database Users and Permissions

Create application-specific database users with appropriate permissions:

### Console Instructions (via RDS Query Editor)

1. **Access Query Editor**
   - From the RDS Dashboard, select your database instance
   - Click "Query Editor" in the top right
   - Connect using your master credentials

2. **Create Application User**
   - Run the following SQL commands:

```sql
-- Create application user
CREATE USER kgc_app WITH ENCRYPTED PASSWORD 'complex-password-here';

-- Create read-only user for reporting
CREATE USER kgc_readonly WITH ENCRYPTED PASSWORD 'another-complex-password';

-- Grant privileges to application user
GRANT CONNECT ON DATABASE kgc_production TO kgc_app;
\c kgc_production
GRANT USAGE ON SCHEMA public TO kgc_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kgc_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO kgc_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kgc_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO kgc_app;

-- Grant read-only privileges to reporting user
GRANT CONNECT ON DATABASE kgc_production TO kgc_readonly;
\c kgc_production
GRANT USAGE ON SCHEMA public TO kgc_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO kgc_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO kgc_readonly;
```

3. **Store Credentials in AWS Secrets Manager**
   - Navigate to the AWS Secrets Manager console
   - Click "Store a new secret"
   - Secret type: "Credentials for RDS database"
   - User name: "kgc_app"
   - Password: Enter the password you created
   - Database: Select your RDS instance
   - Secret name: "KGC/Database/AppUser"
   - Description: "Application user credentials for KGC database"
   - Click "Store"
   - Repeat for the read-only user

### CLI Commands

```bash
# Store application user credentials in Secrets Manager
APP_PASSWORD=$(openssl rand -base64 16)
echo "App User Password: $APP_PASSWORD"

aws secretsmanager create-secret \
  --name KGC/Database/AppUser \
  --description "Application user credentials for KGC database" \
  --secret-string "{\"username\":\"kgc_app\",\"password\":\"$APP_PASSWORD\",\"engine\":\"postgres\",\"host\":\"kgc-postgres.XXXXXXXXXXXX.ap-southeast-2.rds.amazonaws.com\",\"port\":5432,\"dbname\":\"kgc_production\"}" \
  --region ap-southeast-2

# Connect to the database and create users using psql (needs to be run from an EC2 instance with access)
# psql -h kgc-postgres.XXXXXXXXXXXX.ap-southeast-2.rds.amazonaws.com -U kgcadmin -d postgres -W
# Then run the SQL commands shown above
```

## Step 7: Configure Database Monitoring and Alerts

### Console Instructions

1. **Create CloudWatch Alarms**
   - Navigate to the CloudWatch console
   - Click "Alarms" and then "Create alarm"
   - Click "Select metric" and navigate to "RDS > Per-Database Metrics"
   - Select metrics:
     - CPUUtilization > 80% for 5 minutes
     - FreeStorageSpace < 20% of allocated storage
     - FreeableMemory < 10% of instance memory
     - DatabaseConnections > 80% of max_connections
   - For each metric, configure:
     - Conditions appropriate for the metric
     - Notification to an SNS topic
     - Alarm name and description
   
   ![CloudWatch Alarm](../images/cloudwatch-db-alarm.png)

2. **Configure Enhanced Monitoring**
   - From the RDS Dashboard, select your database instance
   - Click on the "Logs & events" tab
   - Under "Enhanced monitoring", ensure it's enabled
   - Set the monitoring interval to 60 seconds
   - Configure a proper IAM role for monitoring

3. **Set Up Performance Insights**
   - From the RDS Dashboard, select your database instance
   - Click on the "Monitoring" tab
   - Click on "Performance Insights"
   - Ensure Performance Insights is enabled
   - Set retention period to at least 7 days

### CLI Commands

```bash
# Create CloudWatch Alarm for CPU Utilization
aws cloudwatch put-metric-alarm \
  --alarm-name KGC-DB-HighCPU \
  --alarm-description "Alarm when database CPU exceeds 80% for 5 minutes" \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=kgc-postgres \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:ap-southeast-2:ACCOUNT_ID:KGC-Alerts \
  --region ap-southeast-2

# Create CloudWatch Alarm for Low Storage
aws cloudwatch put-metric-alarm \
  --alarm-name KGC-DB-LowStorage \
  --alarm-description "Alarm when database free storage is below 20%" \
  --metric-name FreeStorageSpace \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 20000000000 \
  --comparison-operator LessThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=kgc-postgres \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:ap-southeast-2:ACCOUNT_ID:KGC-Alerts \
  --region ap-southeast-2

# Additional alarms for memory and connections...
```

## Step 8: Database Migration Strategy

The database migration process is covered in detail in [Database Migration](../05-migration-process/02-database-migration.md).

## Database Access Diagram

```
+------------------------------------------+
| Application Layer                        |
| (ECS/Lambda in Private Subnet)           |
+------+-------------------------------+---+
       |                               |
       | Database Connection           |
       | (Encrypted via SSL)           |
       v                               v
+------+------+                 +------+------+
| kgc_app     |                 | kgc_readonly|
| User        |                 | User        |
| Read/Write  |                 | Read-only   |
+------+------+                 +------+------+
       |                               |
       v                               v
+------------------------------------------+
| PostgreSQL RDS                           |
| (Multi-AZ with Encryption at Rest)       |
+------------------------------------------+
       |
       v
+------------------------------------------+
| Automated Backups                        |
| - Daily backups (35 days retention)      |
| - Monthly backups (7 year retention)     |
+------------------------------------------+
```

## Security Considerations

1. **Encryption**: All data is encrypted at rest and in transit
2. **Network Security**: Database is placed in isolated subnets with strict security group rules
3. **Authentication**: Use strong passwords and consider IAM authentication for production
4. **Principle of Least Privilege**: Application users have only necessary permissions
5. **Audit Logging**: All database modifications are logged
6. **Regular Patching**: Enable automatic minor version upgrades
7. **Monitoring**: Comprehensive monitoring with alerts for anomalies

## Cost Optimization Tips

1. **Right-sizing**: Choose the appropriate instance class for your workload
2. **Storage Type**: Use gp3 storage for the best performance/cost ratio
3. **Multi-AZ**: Only use for production environments
4. **Reserved Instances**: Consider reserved instances for production environments
5. **Storage Autoscaling**: Enable to automatically adjust storage as needed
6. **Monitoring Granularity**: Adjust monitoring interval based on needs

## Next Steps

After completing the RDS PostgreSQL setup, proceed to [Cognito User Pool Configuration](./04-cognito-setup.md) to set up secure user authentication.