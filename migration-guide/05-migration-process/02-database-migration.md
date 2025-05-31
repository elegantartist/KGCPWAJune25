# Database Migration

This document outlines the detailed process for migrating the KGC application's PostgreSQL database from Replit to AWS RDS, ensuring zero data loss and minimal downtime.

## Prerequisites

Before beginning the database migration:
- Complete the [RDS PostgreSQL Setup](../03-aws-setup/03-rds-postgresql.md)
- Have appropriate database access credentials for both source and target databases
- Understand the database schema and relationships
- Prepare for a maintenance window during the final cutover

## Migration Strategy Overview

The database migration will follow a dual-write approach with initial data sync and final cutover:

1. **Initial Schema Migration**: Create the schema structure in the target RDS database
2. **Initial Data Migration**: Copy all existing data to the target database
3. **Dual-Write Period**: Write new data to both databases while verifying consistency
4. **Final Cutover**: Switch the application to use only the new RDS database

This approach minimizes downtime and provides a rollback option if issues arise.

## Step 1: Analyze the Current Database

### Extract Current Database Schema

Use `pg_dump` to extract the current database schema:

```bash
# Connect to the current database
DB_URL=$(echo $DATABASE_URL | sed 's/postgresql:/postgres:/g')

# Extract schema only
pg_dump --no-owner --no-acl --schema-only --format=plain "$DB_URL" > kgc_schema.sql

# Extract data definitions only (for verification)
pg_dump --no-owner --no-acl --schema-only --section=pre-data "$DB_URL" > kgc_pre_data.sql
pg_dump --no-owner --no-acl --schema-only --section=post-data "$DB_URL" > kgc_post_data.sql
```

### Analyze Schema for Improvements

Review the schema for potential improvements:

1. **Add missing indexes** for performance optimization
2. **Implement schemas** for better organization (currently all tables in public schema)
3. **Set up partitioning** for large tables like health metrics
4. **Configure proper constraints** for data integrity

Create a migration script with these improvements:

```sql
-- Example migration script with improvements
-- kgc_migration.sql

-- Create new schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS health;
CREATE SCHEMA IF NOT EXISTS audit;

-- Move tables to appropriate schemas
ALTER TABLE users SET SCHEMA auth;
ALTER TABLE user_roles SET SCHEMA auth;

ALTER TABLE health_metrics SET SCHEMA health;
ALTER TABLE care_plan_directives SET SCHEMA health;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_health_metrics_date ON health.health_metrics (date);
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_id_date ON health.health_metrics (user_id, date);

-- Set up table partitioning for health metrics
-- (Implementation depends on PostgreSQL version)

-- Configure foreign key constraints
ALTER TABLE health.care_plan_directives 
  ADD CONSTRAINT fk_cpd_doctor
  FOREIGN KEY (doctor_id) REFERENCES auth.users (id);
```

## Step 2: Set Up AWS Database Migration Service (DMS)

AWS DMS provides a managed service for continuous data migration with minimal downtime.

### Console Instructions

1. **Create Replication Instance**
   - Navigate to the DMS console
   - Click "Replication instances", then "Create replication instance"
   - Configure the instance:
     - Name: "kgc-migration-instance"
     - Description: "KGC database migration replication instance"
     - Instance class: "dms.t3.medium" (adjust based on database size)
     - VPC: Select your KGC-VPC
     - Multi-AZ: No (for migration only)
     - Publicly accessible: No
   - Click "Create"
   
   ![DMS Replication Instance](../images/dms-replication-instance.png)

2. **Create Source Endpoint**
   - Click "Endpoints", then "Create endpoint"
   - Select "Source endpoint"
   - Configure the endpoint:
     - Endpoint identifier: "kgc-source-postgres"
     - Source engine: "PostgreSQL"
     - Server name: Enter your Replit PostgreSQL host
     - Port: 5432
     - SSL mode: "verify-full"
     - CA certificate: Select "rds-ca-2019"
     - Username and password: Enter credentials
     - Database name: Enter database name
   - Test the connection
   - Click "Create endpoint"
   
   ![DMS Source Endpoint](../images/dms-source-endpoint.png)

3. **Create Target Endpoint**
   - Click "Create endpoint"
   - Select "Target endpoint"
   - Configure the endpoint:
     - Endpoint identifier: "kgc-target-rds"
     - Target engine: "PostgreSQL"
     - Server name: Enter your RDS endpoint
     - Port: 5432
     - SSL mode: "verify-full"
     - CA certificate: Select "rds-ca-2019"
     - Username and password: Enter credentials
     - Database name: Enter database name
   - Test the connection
   - Click "Create endpoint"
   
   ![DMS Target Endpoint](../images/dms-target-endpoint.png)

4. **Create Database Migration Task**
   - Click "Database migration tasks", then "Create task"
   - Configure the task:
     - Task identifier: "kgc-full-migration"
     - Replication instance: Select your replication instance
     - Source endpoint: Select your source endpoint
     - Target endpoint: Select your target endpoint
     - Migration type: "Migrate existing data and replicate ongoing changes"
     - Start task: "Automatically on create"
     - CDC start mode: "Enable and use CDC from when the full load starts"
     - Target table preparation mode: "Do nothing"
     - Include LOB columns: "Limited LOB mode"
     - Validation: Enable
     - CloudWatch logs: Enable
   - Table mappings:
     - Selection rules: Include all tables
   - Click "Create task"
   
   ![DMS Migration Task](../images/dms-migration-task.png)

### CLI Commands

```bash
# Create Replication Instance
aws dms create-replication-instance \
  --replication-instance-identifier kgc-migration-instance \
  --replication-instance-class dms.t3.medium \
  --vpc-security-group-ids sg-XXXXXXXX \
  --replication-subnet-group-id kgc-dms-subnet-group \
  --region ap-southeast-2

# Create Source Endpoint
aws dms create-endpoint \
  --endpoint-identifier kgc-source-postgres \
  --endpoint-type source \
  --engine-name postgres \
  --username SOURCE_USERNAME \
  --password SOURCE_PASSWORD \
  --server-name SOURCE_HOST \
  --port 5432 \
  --database-name SOURCE_DB_NAME \
  --ssl-mode verify-full \
  --region ap-southeast-2

# Create Target Endpoint
aws dms create-endpoint \
  --endpoint-identifier kgc-target-rds \
  --endpoint-type target \
  --engine-name postgres \
  --username TARGET_USERNAME \
  --password TARGET_PASSWORD \
  --server-name kgc-postgres.XXXXXXXXXXXX.ap-southeast-2.rds.amazonaws.com \
  --port 5432 \
  --database-name kgc_production \
  --ssl-mode verify-full \
  --region ap-southeast-2

# Create Migration Task
aws dms create-replication-task \
  --replication-task-identifier kgc-full-migration \
  --source-endpoint-arn arn:aws:dms:ap-southeast-2:ACCOUNT_ID:endpoint:XXXXXXXXXX \
  --target-endpoint-arn arn:aws:dms:ap-southeast-2:ACCOUNT_ID:endpoint:YYYYYYYYYY \
  --replication-instance-arn arn:aws:dms:ap-southeast-2:ACCOUNT_ID:rep:ZZZZZZZZZZ \
  --migration-type full-load-and-cdc \
  --table-mappings file://table-mappings.json \
  --region ap-southeast-2

# Start Migration Task
aws dms start-replication-task \
  --replication-task-arn arn:aws:dms:ap-southeast-2:ACCOUNT_ID:task:XXXXXXXXXX \
  --start-replication-task-type start-replication \
  --region ap-southeast-2
```

## Step 3: Manual Schema Modifications

Some schema modifications are better handled manually to ensure proper migration:

### 1. Prepare Schema Scripts

Create a sequence of migration scripts to be applied:

```bash
# Create directory for migration scripts
mkdir -p migrations

# Create numbered migration scripts
cat > migrations/01_create_schemas.sql << 'EOF'
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS health;
CREATE SCHEMA IF NOT EXISTS audit;
EOF

cat > migrations/02_move_tables.sql << 'EOF'
-- Move tables to appropriate schemas
ALTER TABLE users SET SCHEMA auth;
ALTER TABLE user_roles SET SCHEMA auth;
-- More table moves...
EOF

cat > migrations/03_add_indexes.sql << 'EOF'
-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_health_metrics_date ON health.health_metrics (date);
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_id_date ON health.health_metrics (user_id, date);
-- More indexes...
EOF

cat > migrations/04_add_constraints.sql << 'EOF'
-- Add data integrity constraints
ALTER TABLE health.care_plan_directives 
  ADD CONSTRAINT fk_cpd_doctor
  FOREIGN KEY (doctor_id) REFERENCES auth.users (id);
-- More constraints...
EOF
```

### 2. Apply Schema Modifications to RDS

Apply the schema modifications to the RDS database:

```bash
# Connect to RDS database
export PGPASSWORD=your_password
PGHOST=kgc-postgres.XXXXXXXXXXXX.ap-southeast-2.rds.amazonaws.com
PGUSER=kgcadmin
PGDATABASE=kgc_production

# Apply each migration script in order
for script in migrations/*.sql; do
  echo "Applying $script..."
  psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f $script
done
```

## Step 4: Monitor Initial Data Migration

Monitor the progress of the AWS DMS migration task:

### Console Instructions

1. **Monitor Migration Task**
   - In the DMS console, navigate to "Database migration tasks"
   - Select your migration task
   - Monitor the "Table statistics" tab to see progress
   - Check the "Task monitoring" tab for metrics
   
   ![DMS Task Monitoring](../images/dms-task-monitoring.png)

2. **View CloudWatch Logs**
   - Navigate to the CloudWatch console
   - Select "Log groups"
   - Find the log group for your DMS task
   - Check for any errors or warnings

### CLI Commands

```bash
# Describe replication task status
aws dms describe-replication-tasks \
  --filters Name=replication-task-id,Values=kgc-full-migration \
  --region ap-southeast-2

# Get replication task statistics
aws dms describe-table-statistics \
  --replication-task-arn arn:aws:dms:ap-southeast-2:ACCOUNT_ID:task:XXXXXXXXXX \
  --region ap-southeast-2
```

## Step 5: Implement Dual-Write Functionality

During the transition period, implement dual-write functionality to maintain consistency between both databases:

### Create Database Adapter

Create a database adapter that handles writing to both databases:

```typescript
// server/db/dualWriteAdapter.ts
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

const sourcePool = new Pool({
  connectionString: process.env.SOURCE_DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: process.env.SOURCE_DB_CA_CERT,
  },
});

const targetPool = new Pool({
  connectionString: process.env.TARGET_DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: process.env.TARGET_DB_CA_CERT,
  },
});

export const sourceDb = drizzle(sourcePool, { schema });
export const targetDb = drizzle(targetPool, { schema });

// Dual write wrapper for inserts
export async function dualInsert(table: any, data: any) {
  try {
    // Insert into source DB
    const [sourceResult] = await sourceDb.insert(table).values(data).returning();
    
    // Insert into target DB
    await targetDb.insert(table).values(data);
    
    return sourceResult;
  } catch (error) {
    console.error('Dual write insert error:', error);
    throw error;
  }
}

// Dual write wrapper for updates
export async function dualUpdate(table: any, where: any, data: any) {
  try {
    // Update source DB
    const [sourceResult] = await sourceDb.update(table).set(data).where(where).returning();
    
    // Update target DB
    await targetDb.update(table).set(data).where(where);
    
    return sourceResult;
  } catch (error) {
    console.error('Dual write update error:', error);
    throw error;
  }
}

// Dual write wrapper for deletes
export async function dualDelete(table: any, where: any) {
  try {
    // Delete from source DB
    const [sourceResult] = await sourceDb.delete(table).where(where).returning();
    
    // Delete from target DB
    await targetDb.delete(table).where(where);
    
    return sourceResult;
  } catch (error) {
    console.error('Dual write delete error:', error);
    throw error;
  }
}
```

### Update Repository Functions

Update the repository functions to use the dual-write adapter:

```typescript
// Example repository function
// server/repositories/healthMetricsRepository.ts
import { healthMetrics } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { sourceDb, dualInsert, dualUpdate, dualDelete } from '../db/dualWriteAdapter';

export async function createHealthMetric(data) {
  return await dualInsert(healthMetrics, data);
}

export async function updateHealthMetric(id, data) {
  return await dualUpdate(healthMetrics, eq(healthMetrics.id, id), data);
}

export async function deleteHealthMetric(id) {
  return await dualDelete(healthMetrics, eq(healthMetrics.id, id));
}

export async function getHealthMetricsByUserId(userId) {
  // Read from source DB only during transition
  return await sourceDb
    .select()
    .from(healthMetrics)
    .where(eq(healthMetrics.userId, userId));
}
```

## Step 6: Verify Data Consistency

Before cutover, verify data consistency between the source and target databases:

### Create Verification Scripts

```typescript
// scripts/verify-data-consistency.ts
import { sourceDb, targetDb } from '../server/db/dualWriteAdapter';
import * as schema from '@shared/schema';

async function verifyTableCounts() {
  const tables = [
    schema.users,
    schema.userRoles,
    schema.healthMetrics,
    schema.carePlanDirectives,
    // Add all other tables
  ];
  
  console.log('Table Count Verification:');
  console.log('-----------------------------------------');
  console.log('Table | Source Count | Target Count | Match');
  console.log('-----------------------------------------');
  
  for (const table of tables) {
    const [sourceCount] = await sourceDb.select({ count: sql`count(*)` }).from(table);
    const [targetCount] = await targetDb.select({ count: sql`count(*)` }).from(table);
    
    const match = sourceCount.count === targetCount.count ? '✅' : '❌';
    console.log(`${table.name} | ${sourceCount.count} | ${targetCount.count} | ${match}`);
    
    if (sourceCount.count !== targetCount.count) {
      console.warn(`Count mismatch in table ${table.name}!`);
    }
  }
}

async function verifyRecentData() {
  // Verify recent health metrics
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  
  const sourceMetrics = await sourceDb
    .select()
    .from(schema.healthMetrics)
    .where(gte(schema.healthMetrics.createdAt, oneDayAgo));
  
  const targetMetrics = await targetDb
    .select()
    .from(schema.healthMetrics)
    .where(gte(schema.healthMetrics.createdAt, oneDayAgo));
  
  console.log(`\nRecent Health Metrics: Source=${sourceMetrics.length}, Target=${targetMetrics.length}`);
  
  // More verification for other tables...
}

async function main() {
  await verifyTableCounts();
  await verifyRecentData();
  
  console.log('\nVerification complete!');
  process.exit(0);
}

main().catch(error => {
  console.error('Verification error:', error);
  process.exit(1);
});
```

### Run Verification Scripts

Run the verification scripts to ensure data consistency:

```bash
# Run verification script
npm run ts-node scripts/verify-data-consistency.ts
```

## Step 7: Final Cutover

After verifying data consistency, perform the final cutover to the RDS database:

### Preparation

1. **Schedule a Maintenance Window**
   - Notify users of scheduled maintenance
   - Select a time with minimal impact

2. **Prepare Deployment**
   - Create a deployment branch with RDS-only configuration
   - Test the deployment in a staging environment
   - Prepare rollback scripts in case of issues

### Cutover Steps

1. **Enable Maintenance Mode**
   - Activate a maintenance page
   - Prevent new data writes

2. **Stop DMS Replication Task**
   - In the DMS console, select your task
   - Click "Actions" > "Stop"
   - Wait for the task to complete stopping

3. **Perform Final Verification**
   - Run verification scripts one last time
   - Ensure all data is consistent

4. **Update Database Configuration**
   - Update environment variables to point only to RDS:

```bash
# Update environment variables
aws secretsmanager update-secret \
  --secret-id KGC/Database/Connection \
  --secret-string "{\"DATABASE_URL\":\"postgres://kgc_app:password@kgc-postgres.XXXXXXXXXXXX.ap-southeast-2.rds.amazonaws.com:5432/kgc_production\"}" \
  --region ap-southeast-2
```

5. **Deploy New Code**
   - Deploy the RDS-only version of the application
   - Remove dual-write functionality

6. **Verify Application Functionality**
   - Perform basic functionality tests
   - Verify authentication and core features
   - Check logs for errors

7. **Disable Maintenance Mode**
   - Deactivate maintenance page
   - Allow users to access the application

### Post-Cutover Verification

1. **Monitor Application Logs**
   - Check for any database-related errors
   - Monitor response times

2. **Track Database Performance**
   - Monitor RDS CloudWatch metrics
   - Check for slow queries

3. **Verify Data Integrity**
   - Run data integrity checks
   - Ensure no data loss occurred

## Rollback Plan

In case of critical issues, implement this rollback plan:

1. **Enable Maintenance Mode**
   - Activate maintenance page
   - Prevent new writes

2. **Revert Database Configuration**
   - Update environment variables to point back to the original database:

```bash
# Revert environment variables
aws secretsmanager update-secret \
  --secret-id KGC/Database/Connection \
  --secret-string "{\"DATABASE_URL\":\"postgres://original_user:password@original_host:5432/original_db\"}" \
  --region ap-southeast-2
```

3. **Deploy Previous Version**
   - Deploy the previous version of the application
   - Restore dual-write functionality if needed

4. **Restart DMS Task if Needed**
   - If planning to attempt migration again, restart DMS task

5. **Verify Application Functionality**
   - Perform basic functionality tests
   - Verify authentication and core features

6. **Disable Maintenance Mode**
   - Deactivate maintenance page
   - Allow users to access the application

## Data Migration Diagram

```
+------------------+                     +------------------+
| Replit PostgreSQL|                     | AWS RDS PostgreSQL|
|                  |                     |                  |
| Source Database  |                     | Target Database  |
+--------+---------+                     +--------+---------+
         |                                        |
         |                                        |
+--------v---------+                     +--------v---------+
|                  |                     |                  |
| Schema Migration |-------------------->| Schema Creation  |
|                  |                     | with Improvements|
+--------+---------+                     +--------+---------+
         |                                        |
+--------v---------+                     +--------v---------+
|                  |                     |                  |
| Initial Data     |-------------------->| DMS Replication  |
| Export           |                     | Instance         |
+--------+---------+                     +--------+---------+
         |                                        |
+--------v---------+                     +--------v---------+
|                  |                     |                  |
| Dual-Write      |<-------------------->| Ongoing Change   |
| Application     |                     | Replication      |
+--------+---------+                     +--------+---------+
         |                                        |
+--------v---------+                     +--------v---------+
|                  |                     |                  |
| Data Consistency |<-------------------->| Verification     |
| Checks           |                     | Scripts         |
+--------+---------+                     +--------+---------+
         |                                        |
+--------v-----------------------------------------v---------+
|                                                            |
|                      Final Cutover                         |
|                                                            |
+------------------------------------------------------------+
```

## Security Considerations

1. **Data Encryption**: Ensure data is encrypted during migration
2. **Access Control**: Use credentials with minimal required permissions
3. **Secure Connections**: Use SSL for all database connections
4. **Audit Logging**: Enable logging for all database changes
5. **Sensitive Data**: Be especially careful with patient health information

## Cost Optimization Tips

1. **Right-Size DMS Instance**: Choose appropriate instance size based on database size
2. **Time Limited**: Use DMS only for the migration period
3. **Storage Costs**: Clean up migration logs and temporary storage after migration
4. **Network Transfer**: Be aware of data transfer costs between regions

## Next Steps

After completing the database migration, proceed to [Frontend Deployment](./03-frontend-deployment.md) to deploy the frontend to AWS.