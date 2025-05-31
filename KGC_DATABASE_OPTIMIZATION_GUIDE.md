# Keep Going Care Database Optimization Guide

## Table of Contents
1. [Database Architecture Overview](#database-architecture-overview)
2. [Schema Design Principles](#schema-design-principles)
3. [Indexing Strategy](#indexing-strategy)
4. [Query Optimization](#query-optimization)
5. [Transaction Management](#transaction-management)
6. [Connection Pooling](#connection-pooling)
7. [Data Archiving Strategy](#data-archiving-strategy)
8. [Scaling Considerations](#scaling-considerations)
9. [Security Measures](#security-measures)
10. [Backup and Recovery](#backup-and-recovery)
11. [Database Migration Strategy](#database-migration-strategy)
12. [Performance Monitoring](#performance-monitoring)

## Database Architecture Overview

Keep Going Care (KGC) utilizes PostgreSQL as its primary database system, with a carefully designed schema to support the diverse needs of the application while maintaining performance and scalability.

### Core Architecture

```
┌───────────────────────────────────────────────────────┐
│                  PostgreSQL Database                   │
│                                                       │
│  ┌─────────────┐    ┌────────────┐    ┌────────────┐  │
│  │   Core      │    │  Health    │    │ Analytics  │  │
│  │   Schemas   │◄──►│  Data      │◄──►│ Data       │  │
│  └─────────────┘    └────────────┘    └────────────┘  │
│         ▲                  ▲                 ▲        │
└─────────┼──────────────────┼─────────────────┼────────┘
          │                  │                 │
          ▼                  ▼                 ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Authentication  │  │   Patient       │  │  Reporting      │
│ & Authorization │  │   Care System   │  │  & Analytics    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Schema Organization

The KGC database is organized into logical groupings:

1. **Core System Tables**:
   - User accounts and roles
   - Authentication data
   - System configuration

2. **Health Data Tables**:
   - Health metrics
   - Care plan directives
   - Progress milestones

3. **Relationship Tables**:
   - Doctor-patient relationships
   - Invitations and connections

4. **Memory and AI Tables**:
   - Chat memories
   - Feature usage tracking
   - Recommendations

5. **Content and Interaction Tables**:
   - User content preferences
   - User favourites
   - Content interactions

## Schema Design Principles

The KGC database schema follows these core design principles:

### Normalization Strategy

The database implements a balanced normalization approach:

1. **Third Normal Form (3NF) Base Design**:
   - Eliminate redundant data
   - Ensure each table represents a single entity concept
   - Normalize reference data into lookup tables

2. **Strategic Denormalization**:
   - Metrics tables pre-aggregate some data for performance
   - Report tables store computed values to avoid expensive joins
   - Chat memory stores context data in JSON for flexibility

### Field Type Selection

Careful field type selection optimizes performance and storage:

1. **Numeric Types**:
   - `real` for health scores (sufficient precision with less storage)
   - `integer` for counters and IDs (efficiently indexed)
   - `serial` for auto-incrementing primary keys

2. **Text Storage**:
   - `varchar` with length limits for predictable-length fields
   - `text` for variable-length content without artificial limits
   - `json` for structured but schemaless data (context fields)

3. **Date and Time**:
   - `timestamp` with timezone awareness for all temporal data

4. **Boolean Flags**:
   - `boolean` type with NOT NULL constraints and defaults

### Constraints Implementation

Database integrity is maintained through proper constraints:

1. **Primary Keys**:
   - Every table has a single-column integer primary key
   - Consistent naming convention (`id`)

2. **Foreign Keys**:
   - Full referential integrity enforcement
   - Consistent naming (referenced_table_id)
   - Appropriate ON DELETE and ON UPDATE behaviors

3. **Unique Constraints**:
   - Applied to business-level unique identifiers (UIN, email, username)
   - Composite unique constraints for relationship tables

4. **Check Constraints**:
   - Range validation for score fields (0-100)
   - Enumeration validation for category and status fields

### Code Example - Schema Definition

```typescript
// Example of well-designed table in schema.ts
export const healthMetrics = pgTable("health_metrics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  date: timestamp("date").defaultNow().notNull(),
  medicationScore: real("medication_score").notNull(),
  dietScore: real("diet_score").notNull(),
  exerciseScore: real("exercise_score").notNull(),
}, (table) => {
  return {
    // Composite index for typical queries
    userDateIdx: index("health_metrics_user_date_idx").on(
      table.userId, 
      table.date
    ),
    
    // Check constraints for score ranges
    medicationScoreCheck: check("medication_score_check", 
      sql`"medication_score" BETWEEN 0 AND 100`
    ),
    dietScoreCheck: check("diet_score_check", 
      sql`"diet_score" BETWEEN 0 AND 100`
    ),
    exerciseScoreCheck: check("exercise_score_check", 
      sql`"exercise_score" BETWEEN 0 AND 100`
    ),
  };
});
```

## Indexing Strategy

KGC implements a comprehensive indexing strategy to optimize query performance while balancing write overhead.

### Primary Indexes

Every table has a primary key index, typically on an auto-incrementing integer column. This provides:

- Guaranteed uniqueness
- Clustered storage (PostgreSQL actually uses a primary index, not clustered storage)
- Efficient joins

### Secondary Indexes

Secondary indexes are created based on access patterns:

1. **Foreign Key Indexes**:
   - Every foreign key column has an index
   - Optimizes join operations
   - Prevents table scans for relationship lookups

2. **Query Support Indexes**:
   - Columns frequently used in WHERE clauses
   - Columns used for sorting (ORDER BY)
   - Columns used in GROUP BY operations

3. **Composite Indexes**:
   - Multi-column indexes for common query patterns
   - Ordered to maximize prefix utilization
   - Designed to support multiple related queries

### Special Index Types

Advanced PostgreSQL indexing capabilities are utilized:

1. **B-Tree Indexes** (default):
   - Used for equality and range queries
   - Applied to most indexed columns

2. **GIN Indexes**:
   - Applied to JSON fields in context columns
   - Enables efficient querying within JSON structures

3. **Partial Indexes**:
   - Applied to filtered subsets of tables
   - Example: Index on active care plan directives only

### Code Example - Index Creation

```typescript
// Example of comprehensive indexing in schema.ts
export const chatMemory = pgTable("chat_memory", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  memorySystem: text("memory_system").notNull().default('semantic'),
  type: text("type").notNull(),
  content: text("content").notNull(),
  context: json("context"),
  importance: real("importance").default(0.5),
  embeddings: text("embeddings"),
  lastAccessed: timestamp("last_accessed"),
  accessCount: integer("access_count").default(0),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    // Basic indexes
    userIdIdx: index("chat_memory_user_id_idx").on(table.userId),
    memoryTypeIdx: index("chat_memory_type_idx").on(table.type),
    
    // Composite indexes for common query patterns
    userTypeIdx: index("chat_memory_user_type_idx").on(
      table.userId, 
      table.type
    ),
    
    // Partial index for active memories
    activeMemoriesIdx: index("chat_memory_active_idx")
      .on(table.userId, table.importance)
      .where(sql`expires_at IS NULL OR expires_at > NOW()`),
      
    // Expression index on JSONB context data
    contextTopicsIdx: index("chat_memory_context_topics_idx")
      .on(sql`(context->>'relatedTopics')`)
      .using("gin"),
  };
});
```

## Query Optimization

KGC implements systematic query optimization to ensure application performance.

### Query Design Principles

1. **Minimize Data Transfer**:
   - Select only needed columns
   - Use pagination for large result sets
   - Implement server-side filtering

2. **Join Optimization**:
   - Design joins to flow from smaller to larger tables
   - Ensure all join columns are properly indexed
   - Use INNER instead of OUTER joins when possible

3. **Filtering Efficiency**:
   - Apply filters that drastically reduce result sets first
   - Use indexed columns in WHERE clauses
   - Utilize parameter binding for security and performance

4. **Aggregate Operations**:
   - Pre-compute common aggregates where possible
   - Use window functions for complex analytics
   - Create materialized views for complex reports

### Common Query Patterns

```typescript
// Example of efficient query in storage.ts
async getHealthMetricsForUser(userId: number): Promise<HealthMetric[]> {
  return await db
    .select()
    .from(healthMetrics)
    .where(eq(healthMetrics.userId, userId))
    .orderBy(desc(healthMetrics.date))
    .limit(90); // Last 90 days of data
}

// Example of optimized aggregation query
async getHealthMetricsSummary(userId: number): Promise<MetricsSummary> {
  const result = await db
    .select({
      avgMedicationScore: avg(healthMetrics.medicationScore),
      avgDietScore: avg(healthMetrics.dietScore),
      avgExerciseScore: avg(healthMetrics.exerciseScore),
      recordCount: count()
    })
    .from(healthMetrics)
    .where(
      and(
        eq(healthMetrics.userId, userId),
        gte(healthMetrics.date, getLastThirtyDays())
      )
    );
    
  return result[0];
}
```

### Query Optimization Techniques

1. **Index Utilization Verification**:
   - Use EXPLAIN ANALYZE to confirm index usage
   - Refactor queries that trigger sequential scans
   - Create missing indexes for common queries

2. **N+1 Query Prevention**:
   - Implement eager loading patterns
   - Use JOIN operations instead of separate queries
   - Batch related data fetching

3. **Optimistic Concurrency Control**:
   - Use timestamps for version tracking
   - Implement proper locking strategy
   - Detect and handle conflicts gracefully

### Code Example - Complex Query Optimization

```typescript
// Example of optimized report generation query
async generatePatientProgressReport(
  patientId: number,
  startDate: Date,
  endDate: Date
): Promise<PatientProgressReport> {
  // This leverages a carefully crafted index on (patient_id, date)
  // and uses a window function to avoid multiple database calls
  
  const metrics = await db.execute(sql`
    SELECT
      date,
      medication_score,
      diet_score,
      exercise_score,
      (medication_score + diet_score + exercise_score) / 3 AS overall_score,
      AVG((medication_score + diet_score + exercise_score) / 3) 
        OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS rolling_avg
    FROM health_metrics
    WHERE 
      user_id = ${patientId} AND
      date BETWEEN ${startDate} AND ${endDate}
    ORDER BY date
  `);
  
  // Additional report data processing...
  
  return processReportData(metrics);
}
```

## Transaction Management

KGC implements proper transaction management to ensure data consistency.

### Transaction Strategy

1. **Transaction Scope Definition**:
   - Determine logical operations that need atomicity
   - Group related operations into single transactions
   - Keep transaction duration as short as possible

2. **Transaction Isolation Levels**:
   - Use appropriate isolation level for each operation:
     - READ COMMITTED for most operations
     - REPEATABLE READ for reporting
     - SERIALIZABLE for critical financial or health data changes

3. **Error Handling and Rollback**:
   - Implement proper error detection
   - Rollback transaction on failure
   - Provide detailed error information

### Code Example - Transaction Implementation

```typescript
// Example of proper transaction handling
async createHealthMetricWithRecommendations(
  insertMetric: InsertHealthMetric
): Promise<{ metric: HealthMetric; recommendations: Recommendation[] }> {
  // Start transaction
  return await db.transaction(async (tx) => {
    try {
      // Create the health metric
      const [metric] = await tx
        .insert(healthMetrics)
        .values(insertMetric)
        .returning();
        
      // Get relevant care plan directives
      const directives = await tx
        .select()
        .from(carePlanDirectives)
        .where(
          and(
            eq(carePlanDirectives.userId, insertMetric.userId),
            eq(carePlanDirectives.active, true)
          )
        );
        
      // Generate recommendations based on new metric and directives
      const recommendationData = generateRecommendations(metric, directives);
      
      // Insert generated recommendations
      const recommendations = [];
      for (const recData of recommendationData) {
        const [recommendation] = await tx
          .insert(recommendations)
          .values(recData)
          .returning();
          
        recommendations.push(recommendation);
      }
      
      // Return all created data
      return { metric, recommendations };
    } catch (error) {
      // Transaction will automatically roll back on error
      console.error('Error in health metric transaction:', error);
      throw error;
    }
  });
}
```

## Connection Pooling

KGC implements efficient connection pooling to optimize database resource utilization.

### Pool Configuration

```typescript
// Optimal PostgreSQL connection pool setup
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '@shared/schema';

// Calculate optimal pool size based on server resources
const MAX_CONNECTIONS = process.env.MAX_DB_CONNECTIONS 
  ? parseInt(process.env.MAX_DB_CONNECTIONS) 
  : 20;

const IDLE_TIMEOUT = 10000; // 10 seconds

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: MAX_CONNECTIONS,
  idleTimeoutMillis: IDLE_TIMEOUT,
  connectionTimeoutMillis: 3000
});

export const db = drizzle(pool, { schema });

// Implement pool error handling
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1);
});
```

### Connection Management Strategies

1. **Connection Acquisition**:
   - Obtain connection from pool when needed
   - Return to pool immediately after use
   - Monitor connection acquisition time

2. **Connection Lifecycle Hooks**:
   - Implement on-connect setup queries
   - Handle disconnection gracefully
   - Track connection usage metrics

3. **Pool Sizing Guidelines**:
   - Base maximum connections on available resources
   - Consider application thread count
   - Account for other database clients

## Data Archiving Strategy

KGC manages data growth through a systematic archiving strategy.

### Archiving Implementation

1. **Data Classification**:
   - Identify high-growth tables (chat_memory, health_metrics)
   - Determine archiving requirements for each table
   - Define retention policies based on data type

2. **Partitioning Strategy**:
   - Implement time-based partitioning for metrics tables
   - Range partitioning for high-volume tables
   - Automatically drop old partitions based on retention policy

3. **Archive Process**:
   - Move expired data to archive tables
   - Compress archived data
   - Maintain minimal indexes on archive tables

### Code Example - Archiving Implementation

```typescript
// Example of automated archiving process
async function archiveOldHealthMetrics(retentionDays: number): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  // Two-step process: 1) Copy to archive, 2) Delete from main table
  
  // 1. Copy to archive table with compression
  await db.execute(sql`
    INSERT INTO health_metrics_archive
    SELECT * FROM health_metrics
    WHERE date < ${cutoffDate}
  `);
  
  // 2. Delete from main table
  const result = await db
    .delete(healthMetrics)
    .where(lt(healthMetrics.date, cutoffDate))
    .returning({ count: count() });
    
  return result[0].count;
}

// Schedule regular archiving
// This would be set up in a maintenance task
schedule.scheduleJob('0 3 * * 0', async () => {
  try {
    const archivedCount = await archiveOldHealthMetrics(365); // 1 year retention
    console.log(`Archived ${archivedCount} health metrics records`);
  } catch (error) {
    console.error('Error during health metrics archiving:', error);
  }
});
```

## Scaling Considerations

KGC's database design accounts for future scaling needs.

### Vertical Scaling

The primary PostgreSQL database can be vertically scaled by:

1. **Resource Allocation**:
   - Increase database server CPU allocation
   - Increase available memory for caching
   - Optimize storage subsystem with SSD

2. **Configuration Tuning**:
   - Adjust shared_buffers for increased caching
   - Optimize work_mem for complex query operations
   - Fine-tune autovacuum settings for maintenance

### Horizontal Scaling

Preparation for horizontal scaling includes:

1. **Read Replica Implementation**:
   - Configure PostgreSQL streaming replication
   - Direct read-heavy queries to replicas
   - Implement connection routing in application code

2. **Sharding Preparation**:
   - Design schema with potential sharding in mind
   - Identify natural partition keys (user_id)
   - Implement tenant isolation patterns

### Code Example - Read/Write Splitting

```typescript
// Example of read/write splitting implementation
export class OptimizedDatabaseStorage implements IStorage {
  private writePool: Pool;
  private readPool: Pool;
  
  constructor() {
    // Configure write pool (points to primary)
    this.writePool = new Pool({ 
      connectionString: process.env.PRIMARY_DATABASE_URL,
      max: 10
    });
    
    // Configure read pool (points to replica)
    this.readPool = new Pool({ 
      connectionString: process.env.REPLICA_DATABASE_URL,
      max: 20 // Higher limit for read operations
    });
  }
  
  // Write operations use primary
  async createHealthMetric(metric: InsertHealthMetric): Promise<HealthMetric> {
    const db = drizzle(this.writePool, { schema });
    const [result] = await db.insert(healthMetrics).values(metric).returning();
    return result;
  }
  
  // Read operations use replica
  async getHealthMetricsForUser(userId: number): Promise<HealthMetric[]> {
    const db = drizzle(this.readPool, { schema });
    return await db
      .select()
      .from(healthMetrics)
      .where(eq(healthMetrics.userId, userId))
      .orderBy(desc(healthMetrics.date));
  }
}
```

## Security Measures

KGC implements comprehensive database security measures.

### Access Control

1. **Role-Based Access**:
   - Database users aligned with application roles
   - Least privilege principle for each role
   - Schema-level permission granularity

2. **Row-Level Security**:
   - Implement PostgreSQL RLS for multi-tenant isolation
   - Enforce user access boundaries in database
   - Automatic filtering of unauthorized rows

### Data Protection

1. **Sensitive Data Encryption**:
   - Column-level encryption for PHI/PII
   - TLS for all database connections
   - Encrypted backups

2. **Audit Logging**:
   - Track all data modifications
   - Record access to sensitive information
   - Maintain audit log integrity

### Code Example - Row-Level Security

```sql
-- Example of PostgreSQL RLS implementation
-- Typically executed during database setup

-- Enable RLS on health metrics table
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for different roles
CREATE POLICY patient_health_metrics ON health_metrics
  FOR SELECT
  USING (user_id = current_setting('app.current_user_id')::INTEGER);
  
CREATE POLICY doctor_health_metrics ON health_metrics
  FOR SELECT
  USING (user_id IN (
    SELECT patient_id 
    FROM doctor_patients 
    WHERE doctor_id = current_setting('app.current_user_id')::INTEGER
      AND active = TRUE
  ));
  
CREATE POLICY admin_health_metrics ON health_metrics
  FOR ALL
  USING (current_setting('app.current_role') = 'admin');

-- Set context on connection
-- This would be executed when establishing a connection
SET app.current_user_id TO '123';
SET app.current_role TO 'patient';
```

## Backup and Recovery

KGC implements a robust backup and recovery strategy.

### Backup Strategy

1. **Regular Backups**:
   - Daily full database backup
   - Point-in-time recovery with WAL archiving
   - Geographic replication of backup files

2. **Backup Verification**:
   - Automated restore testing
   - Integrity verification of backups
   - Recovery time objective (RTO) measurement

### Disaster Recovery

1. **Recovery Procedures**:
   - Documented step-by-step recovery process
   - Automated recovery scripts
   - Regular DR testing

2. **High Availability Configuration**:
   - Standby database servers
   - Automated failover capability
   - Load balancer integration

## Database Migration Strategy

KGC uses Drizzle ORM's migration system for schema evolution.

### Migration Principles

1. **Version Control**:
   - All schema changes tracked in version control
   - Migration scripts for each schema change
   - Documented purpose for each migration

2. **Zero-Downtime Migrations**:
   - Backward compatible schema changes
   - Multi-phase migrations for complex changes
   - Application code compatible with transition states

### Migration Workflow

```typescript
// Example of Drizzle migration workflow
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { Pool } from '@neondatabase/serverless';

// Migration execution function
async function runMigrations() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  
  console.log('Running migrations...');
  
  // Execute migrations from the specified directory
  await migrate(db, { migrationsFolder: './drizzle' });
  
  console.log('Migrations completed successfully');
  
  await pool.end();
}

// Execute migrations on application startup
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
```

## Performance Monitoring

KGC implements comprehensive database performance monitoring.

### Monitoring Metrics

1. **Query Performance**:
   - Track slow query execution
   - Monitor index usage statistics
   - Record query cache hit rates

2. **Resource Utilization**:
   - Connection pool utilization
   - Database server CPU and memory
   - Storage I/O performance

3. **Application Impact**:
   - Query latency from application perspective
   - Transaction rates and durations
   - Error rates and types

### Monitoring Implementation

```typescript
// Example of query performance monitoring
import { PerformanceObserver } from 'perf_hooks';

// Set up performance measurement
const SLOW_QUERY_THRESHOLD = 500; // 500ms

function monitorDatabasePerformance() {
  // Create performance observer
  const obs = new PerformanceObserver((items) => {
    items.getEntries().forEach((entry) => {
      if (entry.duration > SLOW_QUERY_THRESHOLD) {
        // Log slow query for analysis
        console.warn('Slow query detected:', {
          name: entry.name,
          duration: entry.duration,
          timestamp: new Date(),
        });
        
        // Store metrics for dashboard reporting
        recordSlowQuery(entry.name, entry.duration);
      }
    });
    
    // Keep memory usage reasonable
    performance.clearMarks();
  });
  
  // Subscribe to database performance measurements
  obs.observe({ entryTypes: ['measure'], buffered: true });
}

// Wrap database calls with performance measurement
async function measureDatabaseCall<T>(
  name: string, 
  dbOperation: () => Promise<T>
): Promise<T> {
  const markStart = `${name}-start`;
  const markEnd = `${name}-end`;
  
  performance.mark(markStart);
  
  try {
    const result = await dbOperation();
    return result;
  } finally {
    performance.mark(markEnd);
    performance.measure(name, markStart, markEnd);
  }
}

// Usage example
async function getHealthMetricsWithMonitoring(userId: number): Promise<HealthMetric[]> {
  return measureDatabaseCall(
    `getHealthMetrics-${userId}`,
    () => storage.getHealthMetricsForUser(userId)
  );
}
```

---

This document provides comprehensive guidance on optimizing the PostgreSQL database implementation for the Keep Going Care (KGC) application. For further details or specific implementation questions, please refer to the codebase or contact the database administration team.