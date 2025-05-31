# Keep Going Care Deployment and DevOps Guide

## Table of Contents
1. [Infrastructure Overview](#infrastructure-overview)
2. [Environment Setup](#environment-setup)
3. [Deployment Pipeline](#deployment-pipeline)
4. [Containerization Strategy](#containerization-strategy)
5. [Database Management](#database-management)
6. [Scaling Strategy](#scaling-strategy)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Security Practices](#security-practices)
9. [Backup and Disaster Recovery](#backup-and-disaster-recovery)
10. [CI/CD Implementation](#cicd-implementation)
11. [Performance Optimization](#performance-optimization)
12. [DevOps Best Practices](#devops-best-practices)

## Infrastructure Overview

Keep Going Care (KGC) is designed for robust, scalable deployment using modern cloud infrastructure and DevOps practices.

### High-Level Architecture

```
┌───────────────────────────────────────────────────────┐
│                 Cloud Infrastructure                   │
│                                                       │
│  ┌─────────────┐    ┌────────────┐    ┌────────────┐  │
│  │   Web       │    │  API       │    │ Database   │  │
│  │   Tier      │◄──►│  Tier      │◄──►│ Tier       │  │
│  └─────────────┘    └────────────┘    └────────────┘  │
│         ▲                  ▲                 ▲        │
└─────────┼──────────────────┼─────────────────┼────────┘
          │                  │                 │
┌─────────▼──────┐  ┌────────▼───────┐  ┌──────▼─────────┐
│  Load Balancer │  │ Container      │  │ Data           │
│  & CDN         │  │ Orchestration  │  │ Persistence    │
└────────────────┘  └────────────────┘  └────────────────┘
```

### Infrastructure Components

1. **Web Tier**:
   - Static content delivery
   - CDN for asset acceleration
   - Edge caching for performance

2. **API Tier**:
   - Express.js API containers
   - Auto-scaling application services
   - Containerized deployment

3. **Database Tier**:
   - PostgreSQL database with high availability
   - Read replicas for scaling
   - Backup and recovery systems

4. **Supporting Infrastructure**:
   - Monitoring and alerting
   - Logging and analytics
   - Security and compliance

## Environment Setup

KGC uses a multi-environment approach to support the development lifecycle.

### Environment Configuration

```bash
# Example .env file structure for different environments
# Development (.env.development)
NODE_ENV=development
API_URL=http://localhost:5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/kgc_dev
OPENAI_API_KEY=sk_test_123456
ANTHROPIC_API_KEY=sk_ant_test_123456
LOG_LEVEL=debug

# Production (.env.production)
NODE_ENV=production
API_URL=https://api.keepgoingcare.com
DATABASE_URL=postgresql://kgc_prod:${DB_PASSWORD}@kgc-db.cluster-xyz.amazonaws.com:5432/kgc_prod
OPENAI_API_KEY=${OPENAI_API_KEY}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
LOG_LEVEL=info
```

### Environment Setup Automation

```bash
#!/bin/bash
# environment-setup.sh - Automated environment provisioning

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed. Aborting." >&2; exit 1; }
command -v psql >/dev/null 2>&1 || { echo "PostgreSQL client is required but not installed. Aborting." >&2; exit 1; }

# Set up local development environment
echo "Setting up KGC development environment..."

# 1. Create local PostgreSQL database
echo "Creating PostgreSQL database..."
docker run --name kgc-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=kgc_dev -p 5432:5432 -d postgres:14

# 2. Install dependencies
echo "Installing dependencies..."
npm install

# 3. Set up environment variables
echo "Creating .env.development file..."
cat > .env.development << EOL
NODE_ENV=development
API_URL=http://localhost:5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/kgc_dev
LOG_LEVEL=debug
EOL

echo "Please add your API keys to .env.development:"
echo "OPENAI_API_KEY=your_openai_key_here"
echo "ANTHROPIC_API_KEY=your_anthropic_key_here"

# 4. Run database migrations
echo "Running database migrations..."
npm run db:push

echo "Environment setup complete!"
echo "You can start the development server with: npm run dev"
```

## Deployment Pipeline

KGC implements a robust deployment pipeline for reliable, automated releases.

### Deployment Workflow

```
┌─────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│   Code      │     │  Build     │     │  Test      │     │  Deploy    │
│   Commit    │────►│  Process   │────►│  Suite     │────►│  Process   │
└─────────────┘     └────────────┘     └────────────┘     └────────────┘
                                                                │
┌─────────────┐     ┌────────────┐     ┌────────────┐          │
│  Rollback   │◄────│  Monitor   │◄────│  Validate  │◄─────────┘
│  (if needed)│     │  Production│     │  Deployment│
└─────────────┘     └────────────┘     └────────────┘
```

### Deployment Configuration

```yaml
# Example GitHub Actions workflow for continuous deployment
name: KGC Deployment Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build project
        run: npm run build
      
      - name: Run tests
        run: npm test
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-artifacts
          path: dist/

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v3
      
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-artifacts
          path: dist/
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Deploy to Staging
        run: |
          echo "Deploying to staging environment..."
          # Deploy commands here (e.g., AWS ECS, Kubernetes, etc.)
      
      - name: Run smoke tests
        run: npm run test:smoke -- --base-url=https://staging.keepgoingcare.com

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v3
      
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-artifacts
          path: dist/
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Deploy to Production
        run: |
          echo "Deploying to production environment..."
          # Deploy commands here (e.g., AWS ECS, Kubernetes, etc.)
      
      - name: Verify deployment
        run: |
          echo "Verifying production deployment..."
          # Health check and verification scripts
```

### Rollback Mechanism

```bash
#!/bin/bash
# rollback.sh - Emergency rollback script for production

# Usage: ./rollback.sh <version>
# Example: ./rollback.sh v1.2.3

if [ -z "$1" ]; then
  echo "Error: Version parameter is required"
  echo "Usage: ./rollback.sh <version>"
  exit 1
fi

VERSION=$1
echo "Starting emergency rollback to version $VERSION..."

# 1. Get deployment credentials
source .env.rollback

# 2. Update deployment to previous version
if [[ $DEPLOYMENT_PLATFORM == "kubernetes" ]]; then
  # Kubernetes rollback
  kubectl rollout undo deployment/kgc-app --to-revision=$VERSION
elif [[ $DEPLOYMENT_PLATFORM == "ecs" ]]; then
  # ECS rollback
  aws ecs update-service --cluster kgc-cluster --service kgc-service --task-definition kgc-app:$VERSION --force-new-deployment
else
  # Generic rollback procedure
  echo "Manual rollback required for platform: $DEPLOYMENT_PLATFORM"
  echo "Instructions:"
  echo "1. Access deployment console"
  echo "2. Select version $VERSION"
  echo "3. Deploy selected version"
  exit 1
fi

# 3. Verify rollback
echo "Verifying rollback..."
./scripts/verify-deployment.sh --version $VERSION

if [ $? -eq 0 ]; then
  echo "Rollback to version $VERSION successful!"
else
  echo "Rollback verification failed. Please check deployment status manually."
  exit 1
fi
```

## Containerization Strategy

KGC uses Docker for containerization to ensure consistent development and deployment environments.

### Dockerfile

```dockerfile
# Multi-stage build for optimized container size
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production image
FROM node:18-alpine AS runner

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S kgcapp -u 1001 && \
    chown -R kgcapp:nodejs /app

# Switch to non-root user
USER kgcapp

# Expose application port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget -q -O - http://localhost:5000/api/health || exit 1

# Start the application
CMD ["node", "dist/server/index.js"]
```

### Docker Compose for Development

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/kgc_dev
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=kgc_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### Container Orchestration

```yaml
# Kubernetes deployment example (kubernetes/deployment.yaml)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kgc-app
  namespace: kgc
  labels:
    app: kgc-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kgc-app
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: kgc-app
    spec:
      containers:
      - name: kgc-app
        image: ${CONTAINER_REGISTRY}/kgc-app:${IMAGE_TAG}
        ports:
        - containerPort: 5000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: kgc-secrets
              key: database-url
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: kgc-secrets
              key: openai-api-key
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: kgc-secrets
              key: anthropic-api-key
        resources:
          limits:
            cpu: "1"
            memory: "1Gi"
          requests:
            cpu: "500m"
            memory: "512Mi"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 15
        readinessProbe:
          httpGet:
            path: /api/health
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 10
      imagePullSecrets:
      - name: registry-credentials
```

## Database Management

KGC implements robust database management practices to ensure data integrity and performance.

### Database Migration Strategy

```typescript
// migration-runner.ts - Database migration script
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production'
  : '.env.development';

dotenv.config({ path: envFile });

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is missing');
    process.exit(1);
  }

  console.log(`Running migrations in ${process.env.NODE_ENV} environment...`);

  try {
    // Create connection pool
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);
    
    // Execute migrations from the specified directory
    await migrate(db, { migrationsFolder: './drizzle' });
    
    console.log('Migrations completed successfully');
    
    // Close the pool
    await pool.end();
    
    return true;
  } catch (error) {
    console.error('Error running migrations:', error);
    return false;
  }
}

// Run as standalone script
if (require.main === module) {
  runMigrations()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
      console.error('Unexpected error:', err);
      process.exit(1);
    });
}

export { runMigrations };
```

### Database Backup Script

```bash
#!/bin/bash
# database-backup.sh - Automated PostgreSQL backup script

# Configuration
BACKUP_DIR="/backup"
RETENTION_DAYS=30
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_NAME=${DB_NAME:-"kgc_prod"}
DB_USER=${DB_USER:-"postgres"}
DB_PASSWORD=${DB_PASSWORD:-""}
S3_BUCKET=${S3_BUCKET:-"kgc-db-backups"}

# Create timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Ensure backup directory exists
mkdir -p ${BACKUP_DIR}

# Perform backup
echo "Starting backup of database ${DB_NAME} at ${TIMESTAMP}..."
PGPASSWORD=${DB_PASSWORD} pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -F c | \
  gzip > ${BACKUP_FILE}

# Check if backup was successful
if [ $? -eq 0 ]; then
  echo "Backup successful: ${BACKUP_FILE}"
  
  # Upload to S3 if bucket is configured
  if [ -n "${S3_BUCKET}" ]; then
    echo "Uploading backup to S3 bucket: ${S3_BUCKET}..."
    aws s3 cp ${BACKUP_FILE} s3://${S3_BUCKET}/
    
    if [ $? -eq 0 ]; then
      echo "Upload to S3 successful"
    else
      echo "Error: Upload to S3 failed"
    fi
  fi
  
  # Remove old backups
  echo "Removing backups older than ${RETENTION_DAYS} days..."
  find ${BACKUP_DIR} -name "${DB_NAME}_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
else
  echo "Error: Database backup failed"
  exit 1
fi

echo "Backup process completed"
```

### Database Scaling Configuration

```yaml
# AWS RDS PostgreSQL configuration example
Resources:
  KGCDatabase:
    Type: AWS::RDS::DBInstance
    Properties:
      Engine: postgres
      EngineVersion: 14.6
      DBInstanceClass: db.r6g.large
      AllocatedStorage: 100
      StorageType: gp3
      MultiAZ: true
      DBName: kgc_prod
      MasterUsername: !Ref DBUsername
      MasterUserPassword: !Ref DBPassword
      VPCSecurityGroups:
        - !GetAtt DBSecurityGroup.GroupId
      DBSubnetGroupName: !Ref DBSubnetGroup
      BackupRetentionPeriod: 7
      EnablePerformanceInsights: true
      PerformanceInsightsRetentionPeriod: 7
      DeletionProtection: true
      MonitoringInterval: 60
      MonitoringRoleArn: !GetAtt RDSMonitoringRole.Arn
      EnableIAMDatabaseAuthentication: true
      Tags:
        - Key: Name
          Value: KGC Production Database
        - Key: Environment
          Value: Production

  DBParameterGroup:
    Type: AWS::RDS::DBParameterGroup
    Properties:
      Description: Parameter group for KGC PostgreSQL 14
      Family: postgres14
      Parameters:
        shared_buffers: "2GB"
        work_mem: "64MB"
        maintenance_work_mem: "256MB"
        effective_cache_size: "6GB"
        autovacuum: 1
        max_connections: 200
        log_min_duration_statement: 1000  # Log queries taking more than 1s

  ReadReplica:
    Type: AWS::RDS::DBInstance
    Properties:
      SourceDBInstanceIdentifier: !Ref KGCDatabase
      Engine: postgres
      DBInstanceClass: db.r6g.large
      MultiAZ: false
      Tags:
        - Key: Name
          Value: KGC Read Replica
        - Key: Environment
          Value: Production
```

## Scaling Strategy

KGC implements a multi-faceted scaling strategy to handle varying loads and growth.

### Horizontal Scaling

```yaml
# Kubernetes Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: kgc-app-hpa
  namespace: kgc
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: kgc-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

### Load Balancing Configuration

```
# NGINX load balancer configuration
http {
    upstream kgc_backend {
        least_conn;
        server backend1.keepgoingcare.com:5000 max_fails=3 fail_timeout=30s;
        server backend2.keepgoingcare.com:5000 max_fails=3 fail_timeout=30s;
        server backend3.keepgoingcare.com:5000 max_fails=3 fail_timeout=30s;
    }

    server {
        listen 80;
        server_name api.keepgoingcare.com;

        location / {
            proxy_pass http://kgc_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            
            # Timeouts
            proxy_connect_timeout 10s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }
        
        # Health check endpoint
        location /health {
            proxy_pass http://kgc_backend/api/health;
            access_log off;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_connect_timeout 2s;
            proxy_read_timeout 3s;
        }
    }
}
```

### Database Connection Pooling

```typescript
// optimized-database-connection.ts
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '@shared/schema';

// Calculate optimal pool size based on available resources
function calculateOptimalPoolSize() {
  // Default to environment variable if set
  if (process.env.MAX_DB_CONNECTIONS) {
    return parseInt(process.env.MAX_DB_CONNECTIONS);
  }
  
  // Otherwise calculate based on available CPUs
  // Use formula: (Num CPUs * 2) + 1
  const numCpus = require('os').cpus().length;
  return (numCpus * 2) + 1;
}

// Create optimized connection pool
const MAX_CONNECTIONS = calculateOptimalPoolSize();
const IDLE_TIMEOUT = 10000; // 10 seconds
const CONNECTION_TIMEOUT = 3000; // 3 seconds

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: MAX_CONNECTIONS,
  idleTimeoutMillis: IDLE_TIMEOUT,
  connectionTimeoutMillis: CONNECTION_TIMEOUT,
});

// Set up pool error handler
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  // Don't crash the server, but log the error
});

// Create drizzle instance with connection pool
export const db = drizzle(pool, { schema });

// Connection management utilities
export async function withConnection<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

// Pool statistics for monitoring
export async function getPoolStatistics() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}
```

## Monitoring and Logging

KGC implements comprehensive monitoring and logging solutions for observability.

### Logging Configuration

```typescript
// logger.ts - Structured logging setup
import winston from 'winston';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define level based on environment
function getLogLevel() {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
}

// Define custom format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports
const transports = [
  // Console transport
  new winston.transports.Console(),
  
  // File transport for errors
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  
  // File transport for all logs
  new winston.transports.File({ filename: 'logs/combined.log' }),
];

// Create logger
const logger = winston.createLogger({
  level: getLogLevel(),
  levels,
  format,
  transports,
  defaultMeta: { service: 'kgc-app' },
});

// Export logger
export default logger;
```

### Health Check Endpoint

```typescript
// health-check.ts - API health check endpoint
import express from 'express';
import { pool } from './database';

const router = express.Router();

// Basic health check
router.get('/health', async (req, res) => {
  const healthCheck = {
    status: 'UP',
    timestamp: new Date(),
    checks: [
      {
        name: 'API',
        status: 'UP',
      }
    ]
  };
  
  // Check database connection
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    healthCheck.checks.push({
      name: 'Database',
      status: 'UP',
    });
  } catch (error) {
    healthCheck.status = 'DOWN';
    healthCheck.checks.push({
      name: 'Database',
      status: 'DOWN',
      error: error.message,
    });
  }
  
  // Return appropriate status code
  const statusCode = healthCheck.status === 'UP' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

// Detailed health check (authenticated)
router.get('/health/details', authenticate, async (req, res) => {
  // Gather detailed system metrics
  const dbPoolStats = await getPoolStatistics();
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  // Response with detailed health information
  res.json({
    status: 'UP',
    version: process.env.npm_package_version,
    timestamp: new Date(),
    uptime: uptime,
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
    },
    database: {
      connectionPool: dbPoolStats,
    },
  });
});

export default router;
```

### Monitoring Dashboard Configuration

```yaml
# Prometheus configuration (prometheus.yml)
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'kgc-api'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['kgc-app:5000']
    
  - job_name: 'kgc-database'
    static_configs:
      - targets: ['postgres-exporter:9187']
    
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

# Grafana dashboard configuration (dashboard.json)
{
  "annotations": {
    "list": [
      {
        "builtIn": 1,
        "datasource": "-- Grafana --",
        "enable": true,
        "hide": true,
        "iconColor": "rgba(0, 211, 255, 1)",
        "name": "Annotations & Alerts",
        "type": "dashboard"
      }
    ]
  },
  "editable": true,
  "gnetId": null,
  "graphTooltip": 0,
  "id": 1,
  "links": [],
  "panels": [
    {
      "alert": {
        "conditions": [
          {
            "evaluator": {
              "params": [
                90
              ],
              "type": "gt"
            },
            "operator": {
              "type": "and"
            },
            "query": {
              "params": [
                "A",
                "5m",
                "now"
              ]
            },
            "reducer": {
              "params": [],
              "type": "avg"
            },
            "type": "query"
          }
        ],
        "executionErrorState": "alerting",
        "frequency": "60s",
        "handler": 1,
        "name": "CPU Usage alert",
        "noDataState": "no_data",
        "notifications": []
      },
      "aliasColors": {},
      "bars": false,
      "dashLength": 10,
      "dashes": false,
      "datasource": "Prometheus",
      "fieldConfig": {
        "defaults": {
          "custom": {}
        },
        "overrides": []
      },
      "fill": 1,
      "fillGradient": 0,
      "gridPos": {
        "h": 9,
        "w": 12,
        "x": 0,
        "y": 0
      },
      "hiddenSeries": false,
      "id": 2,
      "legend": {
        "avg": false,
        "current": false,
        "max": false,
        "min": false,
        "show": true,
        "total": false,
        "values": false
      },
      "lines": true,
      "linewidth": 1,
      "nullPointMode": "null",
      "options": {
        "alertThreshold": true
      },
      "percentage": false,
      "pluginVersion": "7.2.0",
      "pointradius": 2,
      "points": false,
      "renderer": "flot",
      "seriesOverrides": [],
      "spaceLength": 10,
      "stack": false,
      "steppedLine": false,
      "targets": [
        {
          "expr": "100 - (avg by (instance)(irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
          "interval": "",
          "legendFormat": "",
          "refId": "A"
        }
      ],
      "thresholds": [
        {
          "colorMode": "critical",
          "fill": true,
          "line": true,
          "op": "gt",
          "value": 90
        }
      ],
      "timeFrom": null,
      "timeRegions": [],
      "timeShift": null,
      "title": "CPU Usage",
      "tooltip": {
        "shared": true,
        "sort": 0,
        "value_type": "individual"
      },
      "type": "graph",
      "xaxis": {
        "buckets": null,
        "mode": "time",
        "name": null,
        "show": true,
        "values": []
      },
      "yaxes": [
        {
          "format": "percent",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        },
        {
          "format": "short",
          "label": null,
          "logBase": 1,
          "max": null,
          "min": null,
          "show": true
        }
      ],
      "yaxis": {
        "align": false,
        "alignLevel": null
      }
    }
  ],
  "refresh": "10s",
  "schemaVersion": 26,
  "style": "dark",
  "tags": [],
  "templating": {
    "list": []
  },
  "time": {
    "from": "now-6h",
    "to": "now"
  },
  "timepicker": {},
  "timezone": "",
  "title": "KGC System Dashboard",
  "uid": "kgc-system",
  "version": 1
}
```

## Security Practices

KGC implements robust security practices throughout the application infrastructure.

### SSL Configuration

```javascript
// HTTPS server setup
import https from 'https';
import fs from 'fs';
import express from 'express';
import helmet from 'helmet';

const app = express();

// Set up security headers with Helmet
app.use(helmet());

// HTTPS options
const httpsOptions = {
  key: fs.readFileSync('./certs/private-key.pem'),
  cert: fs.readFileSync('./certs/certificate.pem'),
  ca: fs.readFileSync('./certs/ca-certificate.pem'),
  minVersion: 'TLSv1.2', // Minimum TLS version
  ciphers: [
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-CHACHA20-POLY1305',
    'ECDHE-RSA-CHACHA20-POLY1305',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-AES256-SHA384',
    'ECDHE-RSA-AES256-SHA384',
  ].join(':'),
  honorCipherOrder: true, // Prioritize server's cipher preference
};

// Create HTTPS server
const server = https.createServer(httpsOptions, app);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on https://localhost:${PORT}`);
});
```

### Security Headers Configuration

```javascript
// security-middleware.js
import helmet from 'helmet';

export function setupSecurity(app) {
  // Basic Helmet setup
  app.use(helmet());
  
  // Content Security Policy
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https://cdn.keepgoingcare.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "https://api.keepgoingcare.com"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    })
  );
  
  // Rate limiting
  const rateLimit = require("express-rate-limit");
  
  // API rate limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 429,
      message: "Too many requests, please try again later.",
    },
  });
  
  // Apply rate limiting to API routes
  app.use("/api/", apiLimiter);
  
  // More strict rate limiting for authentication routes
  const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 attempts per hour
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 429,
      message: "Too many login attempts, please try again later.",
    },
  });
  
  // Apply to auth routes
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
  
  // Cross-Origin Resource Sharing (CORS)
  const cors = require("cors");
  const corsOptions = {
    origin: function (origin, callback) {
      const allowedOrigins = [
        "https://keepgoingcare.com",
        "https://www.keepgoingcare.com",
      ];
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400, // 24 hours
  };
  
  app.use(cors(corsOptions));
}
```

### Environment Variables Security

```typescript
// env-validator.ts - Environment variable validation
import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from the appropriate file
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production'
  : '.env.development';

dotenv.config({ path: envFile });

// Define schema for environment variables
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  
  // Port
  PORT: z.string().transform(val => parseInt(val)).default('5000'),
  
  // Database
  DATABASE_URL: z.string().nonempty('DATABASE_URL is required'),
  
  // Authentication
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET should be at least 32 characters'),
  
  // API keys
  OPENAI_API_KEY: z.string().nonempty('OPENAI_API_KEY is required'),
  ANTHROPIC_API_KEY: z.string().nonempty('ANTHROPIC_API_KEY is required'),
  
  // Optional variables
  TAVILY_API_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
});

// Parse and validate environment variables
try {
  const env = envSchema.parse(process.env);
  
  // Replace process.env with validated variables
  process.env = { ...process.env, ...env };
  
  console.log(`Environment validated for ${process.env.NODE_ENV} mode`);
} catch (error) {
  console.error('Environment validation failed:');
  console.error(error.format());
  process.exit(1);
}
```

## Backup and Disaster Recovery

KGC implements comprehensive backup and disaster recovery procedures.

### Backup Strategy

```bash
#!/bin/bash
# backup-manager.sh - Comprehensive backup system for KGC

# Configuration
CONFIG_FILE="/etc/kgc/backup-config.env"
LOG_FILE="/var/log/kgc/backup.log"

# Load configuration
if [ -f "$CONFIG_FILE" ]; then
  source "$CONFIG_FILE"
else
  echo "Error: Configuration file not found at $CONFIG_FILE"
  exit 1
fi

# Validate required variables
for VAR in DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD BACKUP_DIR S3_BUCKET; do
  if [ -z "${!VAR}" ]; then
    echo "Error: Required variable $VAR is not set in configuration"
    exit 1
  fi
done

# Function to log messages
log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to check last backup status
check_last_backup() {
  if [ -f "$BACKUP_DIR/last_backup_status" ]; then
    last_status=$(cat "$BACKUP_DIR/last_backup_status")
    if [ "$last_status" != "success" ]; then
      log "WARNING: Last backup was not successful"
      return 1
    fi
  fi
  return 0
}

# Function to send notifications
send_notification() {
  status=$1
  message=$2
  
  if [ -n "$NOTIFICATION_WEBHOOK" ]; then
    curl -s -X POST -H "Content-Type: application/json" \
      -d "{\"status\":\"$status\",\"message\":\"$message\"}" \
      "$NOTIFICATION_WEBHOOK" || log "Failed to send notification"
  fi
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check disk space
available_space=$(df -BG "$BACKUP_DIR" | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$available_space" -lt "$MIN_DISK_SPACE_GB" ]; then
  log "ERROR: Not enough disk space. Available: ${available_space}GB, Required: ${MIN_DISK_SPACE_GB}GB"
  send_notification "error" "Backup failed: Insufficient disk space"
  exit 1
fi

# Create timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.pgdump"
LOG_OUTPUT="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.log"

# Perform database backup
log "Starting database backup for $DB_NAME to $BACKUP_FILE"
PGPASSWORD="$DB_PASSWORD" pg_dump -Fc \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -f "$BACKUP_FILE" \
  > "$LOG_OUTPUT" 2>&1

BACKUP_STATUS=$?

if [ $BACKUP_STATUS -eq 0 ]; then
  # Compress backup
  log "Compressing backup file"
  gzip -f "$BACKUP_FILE"
  COMPRESSED_FILE="${BACKUP_FILE}.gz"
  
  # Calculate checksum
  log "Calculating checksum"
  CHECKSUM=$(md5sum "$COMPRESSED_FILE" | awk '{print $1}')
  echo "$CHECKSUM" > "${COMPRESSED_FILE}.md5"
  
  # Upload to S3
  if [ -n "$S3_BUCKET" ]; then
    log "Uploading backup to S3 bucket: $S3_BUCKET"
    aws s3 cp "$COMPRESSED_FILE" "s3://${S3_BUCKET}/${DB_NAME}/" \
      && aws s3 cp "${COMPRESSED_FILE}.md5" "s3://${S3_BUCKET}/${DB_NAME}/"
    
    S3_STATUS=$?
    if [ $S3_STATUS -eq 0 ]; then
      log "Upload to S3 successful"
    else
      log "ERROR: Upload to S3 failed with status $S3_STATUS"
      send_notification "warning" "Backup created but S3 upload failed"
    fi
  fi
  
  # Record successful backup
  echo "success" > "$BACKUP_DIR/last_backup_status"
  echo "$TIMESTAMP" > "$BACKUP_DIR/last_backup_time"
  
  # Cleanup old backups
  if [ -n "$RETENTION_DAYS" ]; then
    log "Cleaning up backups older than $RETENTION_DAYS days"
    find "$BACKUP_DIR" -name "${DB_NAME}_*.gz" -mtime "+$RETENTION_DAYS" -delete
    find "$BACKUP_DIR" -name "${DB_NAME}_*.md5" -mtime "+$RETENTION_DAYS" -delete
    find "$BACKUP_DIR" -name "${DB_NAME}_*.log" -mtime "+$RETENTION_DAYS" -delete
  fi
  
  log "Backup completed successfully"
  send_notification "success" "Backup completed successfully"
else
  log "ERROR: Database backup failed with status $BACKUP_STATUS"
  log "See log file at $LOG_OUTPUT for details"
  echo "failure" > "$BACKUP_DIR/last_backup_status"
  send_notification "error" "Backup failed: Database dump error"
  exit 1
fi
```

### Disaster Recovery Procedure

```markdown
# Keep Going Care Disaster Recovery Procedure

## Overview
This document outlines the disaster recovery procedure for the Keep Going Care platform. The procedure should be followed in case of major system failure, data loss, or security breach.

## Prerequisites
- Access to AWS console with administrator privileges
- Access to database backup repository
- Access to CI/CD system
- Access to monitoring systems
- SSH keys for server access

## Recovery Team Contacts
- Primary: John Smith, DevOps Lead, +1-555-123-4567
- Secondary: Jane Doe, Database Administrator, +1-555-765-4321
- Tertiary: Bob Johnson, System Architect, +1-555-987-6543

## 1. Assessment and Declaration

### 1.1 Incident Assessment
1. Determine the nature and scope of the incident
2. Identify affected systems and services
3. Estimate the recovery time objective (RTO)
4. Decide whether to declare a disaster

### 1.2 Notification
1. Notify recovery team members
2. Activate on-call personnel
3. Communicate with stakeholders
4. If applicable, begin customer communication procedures

## 2. Infrastructure Recovery

### 2.1 Cloud Infrastructure
1. Access AWS Management Console
2. Launch new infrastructure using CloudFormation template:
   ```bash
   aws cloudformation create-stack \
     --stack-name kgc-recovery \
     --template-body file://cloudformation/kgc-infrastructure.yaml \
     --parameters ParameterKey=Environment,ParameterValue=production
   ```

3. Verify infrastructure provisioning:
   ```bash
   aws cloudformation describe-stacks \
     --stack-name kgc-recovery
   ```

### 2.2 Networking
1. Verify VPC, subnets, and security groups
2. Configure DNS records to point to new infrastructure
3. Update load balancer configuration

## 3. Database Recovery

### 3.1 Restore PostgreSQL Database
1. Retrieve latest backup from S3:
   ```bash
   aws s3 cp s3://kgc-db-backups/latest/kgc_prod_latest.sql.gz /tmp/
   ```

2. Create new database instance
   ```bash
   aws rds create-db-instance \
     --db-instance-identifier kgc-recovery-db \
     --db-instance-class db.r6g.large \
     --engine postgres \
     --allocated-storage 100 \
     --master-username $DB_ADMIN_USER \
     --master-user-password $DB_ADMIN_PASSWORD
   ```

3. Wait for database to be available:
   ```bash
   aws rds wait db-instance-available \
     --db-instance-identifier kgc-recovery-db
   ```

4. Restore database from backup:
   ```bash
   gunzip -c /tmp/kgc_prod_latest.sql.gz | \
   PGPASSWORD=$DB_ADMIN_PASSWORD psql \
     -h $DB_HOST \
     -U $DB_ADMIN_USER \
     -d kgc_prod
   ```

5. Verify database integrity:
   ```bash
   PGPASSWORD=$DB_ADMIN_PASSWORD psql \
     -h $DB_HOST \
     -U $DB_ADMIN_USER \
     -d kgc_prod \
     -c "SELECT COUNT(*) FROM users;"
   ```

## 4. Application Deployment

### 4.1 Deploy Application
1. Access CI/CD system
2. Trigger deployment of latest production release to new infrastructure
3. Verify deployment status

### 4.2 Configuration
1. Update application environment variables
2. Configure API keys and secrets
3. Set up database connection strings

## 5. Validation and Testing

### 5.1 Smoke Testing
1. Verify API endpoints functionality
2. Test authentication system
3. Verify database connectivity

### 5.2 Functionality Testing
1. Verify critical business functions
2. Test user workflows
3. Validate data integrity

## 6. Cutover

### 6.1 DNS Update
1. Update DNS records to point to new infrastructure
2. Verify DNS propagation

### 6.2 Traffic Routing
1. Gradually route traffic to new environment
2. Monitor system performance and errors

## 7. Post-Recovery

### 7.1 Monitoring
1. Set up monitoring for new environment
2. Establish baseline performance metrics
3. Configure alerts

### 7.2 Documentation
1. Document recovery process
2. Update recovery plan with lessons learned
3. Conduct post-mortem analysis

## 8. Communication

### 8.1 Status Updates
1. Provide regular updates to stakeholders
2. Communicate completion of recovery
3. Document incident timeline

### 8.2 Final Report
1. Prepare incident report
2. Present findings to management
3. Implement preventative measures

## Recovery Time Objectives

| System Component | Recovery Time Objective |
|------------------|-------------------------|
| Infrastructure   | 1 hour                  |
| Database         | 2 hours                 |
| Application      | 1 hour                  |
| Total System     | 4 hours                 |

## Recovery Point Objectives

| Data Category | Recovery Point Objective |
|---------------|--------------------------|
| User Data     | 15 minutes               |
| Analytics     | 1 hour                   |
| Logs          | 6 hours                  |
```

## CI/CD Implementation

KGC implements a modern CI/CD pipeline for automated testing and deployment.

### GitHub Actions Workflow

```yaml
# .github/workflows/main.yml
name: KGC CI/CD Pipeline

on:
  push:
    branches: [main, development]
  pull_request:
    branches: [main, development]

jobs:
  lint:
    name: Lint Code
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
  
  test:
    name: Test
    needs: lint
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: kgc_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Create test env file
        run: |
          cat > .env.test << EOL
          NODE_ENV=test
          DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kgc_test
          SESSION_SECRET=test_session_secret_key_minimum_32_chars
          OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY=${{ secrets.ANTHROPIC_API_KEY }}
          LOG_LEVEL=info
          EOL
      
      - name: Run database migrations
        run: npm run db:push
      
      - name: Run tests
        run: npm test
      
      - name: Upload test coverage
        uses: actions/upload-artifact@v3
        with:
          name: coverage
          path: coverage/
  
  build:
    name: Build
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build project
        run: npm run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: dist/
  
  deploy-staging:
    name: Deploy to Staging
    if: github.ref == 'refs/heads/development'
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build
          path: dist/
      
      - name: Install AWS CLI
        uses: unfor19/install-aws-cli-action@v1
        with:
          version: 2
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build, tag, and push image to Amazon ECR
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: kgc-app
          IMAGE_TAG: staging-${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
      
      - name: Update ECS service
        run: |
          aws ecs update-service --cluster kgc-staging --service kgc-app --force-new-deployment
      
      - name: Wait for ECS service to become stable
        run: |
          aws ecs wait services-stable --cluster kgc-staging --services kgc-app
      
      - name: Run smoke tests
        run: npm run test:smoke -- --base-url=https://staging.keepgoingcare.com
  
  deploy-production:
    name: Deploy to Production
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build
          path: dist/
      
      - name: Install AWS CLI
        uses: unfor19/install-aws-cli-action@v1
        with:
          version: 2
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build, tag, and push image to Amazon ECR
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: kgc-app
          IMAGE_TAG: production-${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
      
      - name: Update ECS service
        run: |
          aws ecs update-service --cluster kgc-production --service kgc-app --force-new-deployment
      
      - name: Wait for ECS service to become stable
        run: |
          aws ecs wait services-stable --cluster kgc-production --services kgc-app
      
      - name: Run smoke tests
        run: npm run test:smoke -- --base-url=https://app.keepgoingcare.com
      
      - name: Create release tag
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.git.createRef({
              owner: context.repo.owner,
              repo: context.repo.repo,
              ref: `refs/tags/v${process.env.npm_package_version}`,
              sha: context.sha
            })
      
      - name: Notify deployment
        uses: rtCamp/action-slack-notify@v2
        env:
          SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
          SLACK_CHANNEL: releases
          SLACK_TITLE: New Production Deployment
          SLACK_MESSAGE: "KGC v${{ env.npm_package_version }} deployed to production"
          SLACK_COLOR: good
```

### Pipeline Visualization Tool

```javascript
// pipeline-visualizer.js
// A simple tool to visualize the CI/CD pipeline status

const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Serve static files
app.use(express.static('public'));

// GitHub API client
const github = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Authorization: `token ${process.env.GITHUB_TOKEN}`,
  },
});

// Get workflow runs
app.get('/api/workflow-runs', async (req, res) => {
  try {
    const { data } = await github.get(
      `/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/actions/runs`
    );
    
    const runs = data.workflow_runs.map(run => ({
      id: run.id,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      branch: run.head_branch,
      commit: {
        sha: run.head_sha.substring(0, 7),
        message: run.head_commit?.message,
        author: run.head_commit?.author.name,
      },
      created_at: run.created_at,
      updated_at: run.updated_at,
      url: run.html_url,
    }));
    
    res.json(runs);
  } catch (error) {
    console.error('Error fetching workflow runs:', error);
    res.status(500).json({ error: 'Failed to fetch workflow runs' });
  }
});

// Get job details for a workflow run
app.get('/api/workflow-runs/:runId/jobs', async (req, res) => {
  try {
    const { data } = await github.get(
      `/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/actions/runs/${req.params.runId}/jobs`
    );
    
    const jobs = data.jobs.map(job => ({
      id: job.id,
      name: job.name,
      status: job.status,
      conclusion: job.conclusion,
      started_at: job.started_at,
      completed_at: job.completed_at,
      steps: job.steps.map(step => ({
        name: step.name,
        status: step.status,
        conclusion: step.conclusion,
        number: step.number,
      })),
    }));
    
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching job details:', error);
    res.status(500).json({ error: 'Failed to fetch job details' });
  }
});

// Get deployment environments
app.get('/api/environments', async (req, res) => {
  try {
    const { data } = await github.get(
      `/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/environments`
    );
    
    res.json(data.environments);
  } catch (error) {
    console.error('Error fetching environments:', error);
    res.status(500).json({ error: 'Failed to fetch environments' });
  }
});

app.listen(port, () => {
  console.log(`Pipeline visualizer running on port ${port}`);
});
```

## Performance Optimization

KGC implements performance optimizations throughout the infrastructure.

### CDN Configuration

```nginx
# Nginx CDN configuration
http {
    # Enable gzip compression
    gzip on;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_vary on;
    gzip_types
        application/javascript
        application/json
        application/xml
        text/css
        text/plain
        text/xml
        image/svg+xml;
    
    # Cache control
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=kgc_cache:10m max_size=10g inactive=60m;
    proxy_cache_key "$scheme$request_method$host$request_uri";
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Static assets server
    server {
        listen 443 ssl http2;
        server_name static.keepgoingcare.com;
        
        ssl_certificate /etc/letsencrypt/live/static.keepgoingcare.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/static.keepgoingcare.com/privkey.pem;
        
        root /var/www/kgc/static;
        
        # Static file caching
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
            expires 30d;
            add_header Cache-Control "public, no-transform";
            access_log off;
        }
        
        # Serve pre-compressed files if they exist
        location ~ \.css {
            gzip_static on;
            add_header Content-Type text/css;
        }
        
        location ~ \.js {
            gzip_static on;
            add_header Content-Type application/javascript;
        }
        
        # Default cache policy
        location / {
            expires 1h;
            add_header Cache-Control "public, must-revalidate";
        }
    }
    
    # Main application server proxy
    server {
        listen 443 ssl http2;
        server_name app.keepgoingcare.com;
        
        ssl_certificate /etc/letsencrypt/live/app.keepgoingcare.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/app.keepgoingcare.com/privkey.pem;
        
        # Proxy to application servers
        location / {
            proxy_pass http://kgc_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            
            # Timeouts
            proxy_connect_timeout 10s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }
        
        # Cache API responses
        location /api/ {
            proxy_pass http://kgc_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Cache configuration
            proxy_cache kgc_cache;
            proxy_cache_valid 200 302 10m;
            proxy_cache_valid 404 1m;
            proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
            proxy_cache_lock on;
            proxy_cache_bypass $http_pragma $http_authorization;
            add_header X-Cache-Status $upstream_cache_status;
            
            # Skip cache for certain endpoints
            proxy_cache_bypass $http_pragma;
            proxy_cache_methods GET HEAD;
            
            # Don't cache authenticated requests
            proxy_no_cache $http_authorization;
            proxy_cache_bypass $http_authorization;
        }
    }
}
```

### Database Query Optimization

```sql
-- PostgreSQL performance optimization script

-- Update table statistics
ANALYZE VERBOSE;

-- Indexing strategy for health metrics table
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_id ON health_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_date ON health_metrics(date);
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_date ON health_metrics(user_id, date);

-- Partial index for active care plan directives
CREATE INDEX IF NOT EXISTS idx_care_plan_directives_active ON care_plan_directives(user_id) WHERE active = TRUE;

-- Expression index for JSON operations
CREATE INDEX IF NOT EXISTS idx_chat_memory_context_jsonb ON chat_memory USING GIN(context jsonb_path_ops);

-- Materialized view for frequently accessed data
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_latest_health_metrics AS
SELECT
    user_id,
    MAX(date) as latest_date,
    (
        SELECT medication_score
        FROM health_metrics hm2
        WHERE hm2.user_id = health_metrics.user_id
        ORDER BY date DESC
        LIMIT 1
    ) as medication_score,
    (
        SELECT diet_score
        FROM health_metrics hm2
        WHERE hm2.user_id = health_metrics.user_id
        ORDER BY date DESC
        LIMIT 1
    ) as diet_score,
    (
        SELECT exercise_score
        FROM health_metrics hm2
        WHERE hm2.user_id = health_metrics.user_id
        ORDER BY date DESC
        LIMIT 1
    ) as exercise_score
FROM health_metrics
GROUP BY user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_latest_health_metrics_user_id ON mv_latest_health_metrics(user_id);

-- Refresh schedule for materialized view
CREATE OR REPLACE FUNCTION refresh_latest_health_metrics()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_latest_health_metrics;
END;
$$ LANGUAGE plpgsql;

-- Configure table autovacuum settings
ALTER TABLE health_metrics SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_analyze_scale_factor = 0.025,
    autovacuum_vacuum_threshold = 50,
    autovacuum_analyze_threshold = 50
);

-- Performance optimization for health metrics queries
CREATE OR REPLACE FUNCTION get_user_health_metrics_summary(
    p_user_id INT,
    p_start_date TIMESTAMP,
    p_end_date TIMESTAMP
)
RETURNS TABLE (
    avg_medication_score NUMERIC,
    avg_diet_score NUMERIC,
    avg_exercise_score NUMERIC,
    overall_score NUMERIC,
    metric_count INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ROUND(AVG(medication_score)::NUMERIC, 2) as avg_medication_score,
        ROUND(AVG(diet_score)::NUMERIC, 2) as avg_diet_score,
        ROUND(AVG(exercise_score)::NUMERIC, 2) as avg_exercise_score,
        ROUND((AVG(medication_score) + AVG(diet_score) + AVG(exercise_score)) / 3, 2) as overall_score,
        COUNT(*) as metric_count
    FROM health_metrics
    WHERE user_id = p_user_id
    AND date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;
```

## DevOps Best Practices

KGC implements DevOps best practices for sustainable system management.

### Infrastructure as Code

```terraform
# main.tf - Terraform configuration for KGC infrastructure

provider "aws" {
  region = var.aws_region
}

# VPC and networking
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  
  name = "kgc-vpc-${var.environment}"
  cidr = "10.0.0.0/16"
  
  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway = true
  enable_vpn_gateway = false
  
  tags = {
    Environment = var.environment
    Project     = "KGC"
    ManagedBy   = "Terraform"
  }
}

# Security groups
resource "aws_security_group" "app_sg" {
  name        = "kgc-app-sg-${var.environment}"
  description = "Security group for KGC application servers"
  vpc_id      = module.vpc.vpc_id
  
  # Allow inbound HTTP/HTTPS from load balancer
  ingress {
    from_port       = 5000
    to_port         = 5000
    protocol        = "tcp"
    security_groups = [aws_security_group.lb_sg.id]
  }
  
  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name        = "kgc-app-sg-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_security_group" "db_sg" {
  name        = "kgc-db-sg-${var.environment}"
  description = "Security group for KGC database"
  vpc_id      = module.vpc.vpc_id
  
  # Allow PostgreSQL from application servers
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app_sg.id]
  }
  
  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name        = "kgc-db-sg-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_security_group" "lb_sg" {
  name        = "kgc-lb-sg-${var.environment}"
  description = "Security group for KGC load balancer"
  vpc_id      = module.vpc.vpc_id
  
  # Allow HTTP/HTTPS from internet
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name        = "kgc-lb-sg-${var.environment}"
    Environment = var.environment
  }
}

# Database
resource "aws_db_subnet_group" "kgc_db_subnet_group" {
  name       = "kgc-db-subnet-group-${var.environment}"
  subnet_ids = module.vpc.private_subnets
  
  tags = {
    Name        = "kgc-db-subnet-group-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_db_instance" "kgc_db" {
  identifier             = "kgc-db-${var.environment}"
  engine                 = "postgres"
  engine_version         = "14.6"
  instance_class         = var.db_instance_type
  allocated_storage      = var.db_allocated_storage
  storage_type           = "gp3"
  db_name                = "kgc_${var.environment}"
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.kgc_db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  parameter_group_name   = aws_db_parameter_group.kgc_db_params.name
  multi_az               = var.environment == "production" ? true : false
  backup_retention_period = var.environment == "production" ? 7 : 1
  skip_final_snapshot    = var.environment == "production" ? false : true
  final_snapshot_identifier = var.environment == "production" ? "kgc-db-final-snapshot" : null
  apply_immediately      = true
  deletion_protection    = var.environment == "production" ? true : false
  
  tags = {
    Name        = "kgc-db-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_db_parameter_group" "kgc_db_params" {
  name   = "kgc-db-params-${var.environment}"
  family = "postgres14"
  
  parameter {
    name  = "shared_buffers"
    value = "2048000"
  }
  
  parameter {
    name  = "work_mem"
    value = "65536"
  }
  
  parameter {
    name  = "maintenance_work_mem"
    value = "262144"
  }
  
  parameter {
    name  = "effective_cache_size"
    value = "6291456"
  }
  
  parameter {
    name  = "max_connections"
    value = "200"
  }
  
  tags = {
    Name        = "kgc-db-params-${var.environment}"
    Environment = var.environment
  }
}

# ECS resources
resource "aws_ecs_cluster" "kgc_cluster" {
  name = "kgc-cluster-${var.environment}"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  
  tags = {
    Name        = "kgc-cluster-${var.environment}"
    Environment = var.environment
  }
}

# ECS task definition
resource "aws_ecs_task_definition" "kgc_app" {
  family                   = "kgc-app-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.app_cpu
  memory                   = var.app_memory
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  
  container_definitions = jsonencode([
    {
      name      = "kgc-app"
      image     = var.app_image
      essential = true
      
      portMappings = [
        {
          containerPort = 5000
          hostPort      = 5000
          protocol      = "tcp"
        }
      ]
      
      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "PORT", value = "5000" }
      ]
      
      secrets = [
        { name = "DATABASE_URL", valueFrom = aws_secretsmanager_secret.db_url.arn },
        { name = "SESSION_SECRET", valueFrom = aws_secretsmanager_secret.session_secret.arn },
        { name = "OPENAI_API_KEY", valueFrom = aws_secretsmanager_secret.openai_api_key.arn },
        { name = "ANTHROPIC_API_KEY", valueFrom = aws_secretsmanager_secret.anthropic_api_key.arn }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.kgc_app_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
      
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:5000/api/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])
  
  tags = {
    Name        = "kgc-app-${var.environment}"
    Environment = var.environment
  }
}

# ECS service
resource "aws_ecs_service" "kgc_app" {
  name            = "kgc-app-${var.environment}"
  cluster         = aws_ecs_cluster.kgc_cluster.id
  task_definition = aws_ecs_task_definition.kgc_app.arn
  desired_count   = var.app_instance_count
  launch_type     = "FARGATE"
  
  network_configuration {
    security_groups  = [aws_security_group.app_sg.id]
    subnets          = module.vpc.private_subnets
    assign_public_ip = false
  }
  
  load_balancer {
    target_group_arn = aws_lb_target_group.kgc_app.arn
    container_name   = "kgc-app"
    container_port   = 5000
  }
  
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
  
  deployment_controller {
    type = "ECS"
  }
  
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100
  health_check_grace_period_seconds  = 120
  
  lifecycle {
    ignore_changes = [desired_count]
  }
  
  tags = {
    Name        = "kgc-app-${var.environment}"
    Environment = var.environment
  }
  
  depends_on = [aws_lb_listener.https]
}

# Auto scaling
resource "aws_appautoscaling_target" "kgc_app_scaling" {
  max_capacity       = var.app_max_instances
  min_capacity       = var.app_min_instances
  resource_id        = "service/${aws_ecs_cluster.kgc_cluster.name}/${aws_ecs_service.kgc_app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "kgc_app_cpu_scaling" {
  name               = "kgc-app-cpu-scaling-${var.environment}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.kgc_app_scaling.resource_id
  scalable_dimension = aws_appautoscaling_target.kgc_app_scaling.scalable_dimension
  service_namespace  = aws_appautoscaling_target.kgc_app_scaling.service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

resource "aws_appautoscaling_policy" "kgc_app_memory_scaling" {
  name               = "kgc-app-memory-scaling-${var.environment}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.kgc_app_scaling.resource_id
  scalable_dimension = aws_appautoscaling_target.kgc_app_scaling.scalable_dimension
  service_namespace  = aws_appautoscaling_target.kgc_app_scaling.service_namespace
  
  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    
    target_value       = 80.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Application load balancer
resource "aws_lb" "kgc_lb" {
  name               = "kgc-lb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.lb_sg.id]
  subnets            = module.vpc.public_subnets
  
  enable_deletion_protection = var.environment == "production" ? true : false
  
  access_logs {
    bucket  = aws_s3_bucket.lb_logs.bucket
    prefix  = "kgc-lb-logs"
    enabled = true
  }
  
  tags = {
    Name        = "kgc-lb-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.kgc_lb.arn
  port              = "80"
  protocol          = "HTTP"
  
  default_action {
    type = "redirect"
    
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.kgc_lb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = var.ssl_certificate_arn
  
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.kgc_app.arn
  }
}

resource "aws_lb_target_group" "kgc_app" {
  name                 = "kgc-app-tg-${var.environment}"
  port                 = 5000
  protocol             = "HTTP"
  vpc_id               = module.vpc.vpc_id
  target_type          = "ip"
  deregistration_delay = 30
  
  health_check {
    enabled             = true
    interval            = 30
    path                = "/api/health"
    port                = "traffic-port"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    matcher             = "200"
  }
  
  tags = {
    Name        = "kgc-app-tg-${var.environment}"
    Environment = var.environment
  }
}

# CloudWatch logs
resource "aws_cloudwatch_log_group" "kgc_app_logs" {
  name              = "/ecs/kgc-app-${var.environment}"
  retention_in_days = var.log_retention_days
  
  tags = {
    Name        = "kgc-app-logs-${var.environment}"
    Environment = var.environment
  }
}

# S3 bucket for load balancer logs
resource "aws_s3_bucket" "lb_logs" {
  bucket = "kgc-lb-logs-${var.environment}-${random_string.bucket_suffix.result}"
  
  tags = {
    Name        = "kgc-lb-logs-${var.environment}"
    Environment = var.environment
  }
}

resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  lower   = true
  upper   = false
}

resource "aws_s3_bucket_lifecycle_configuration" "lb_logs_lifecycle" {
  bucket = aws_s3_bucket.lb_logs.id
  
  rule {
    id     = "log-expiration"
    status = "Enabled"
    
    expiration {
      days = 90
    }
  }
}

# Secrets
resource "aws_secretsmanager_secret" "db_url" {
  name        = "kgc/${var.environment}/database-url"
  description = "Database connection URL for KGC"
  
  tags = {
    Name        = "kgc-db-url-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "db_url" {
  secret_id     = aws_secretsmanager_secret.db_url.id
  secret_string = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.kgc_db.endpoint}/${aws_db_instance.kgc_db.db_name}"
}

resource "aws_secretsmanager_secret" "session_secret" {
  name        = "kgc/${var.environment}/session-secret"
  description = "Session secret for KGC"
  
  tags = {
    Name        = "kgc-session-secret-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "session_secret" {
  secret_id     = aws_secretsmanager_secret.session_secret.id
  secret_string = var.session_secret
}

resource "aws_secretsmanager_secret" "openai_api_key" {
  name        = "kgc/${var.environment}/openai-api-key"
  description = "OpenAI API key for KGC"
  
  tags = {
    Name        = "kgc-openai-api-key-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "openai_api_key" {
  secret_id     = aws_secretsmanager_secret.openai_api_key.id
  secret_string = var.openai_api_key
}

resource "aws_secretsmanager_secret" "anthropic_api_key" {
  name        = "kgc/${var.environment}/anthropic-api-key"
  description = "Anthropic API key for KGC"
  
  tags = {
    Name        = "kgc-anthropic-api-key-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "anthropic_api_key" {
  secret_id     = aws_secretsmanager_secret.anthropic_api_key.id
  secret_string = var.anthropic_api_key
}

# IAM roles
resource "aws_iam_role" "ecs_execution_role" {
  name = "kgc-ecs-execution-role-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
  
  tags = {
    Name        = "kgc-ecs-execution-role-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_execution_secrets_policy" {
  name = "kgc-ecs-execution-secrets-policy-${var.environment}"
  role = aws_iam_role.ecs_execution_role.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "secretsmanager:GetSecretValue",
        ]
        Effect   = "Allow"
        Resource = [
          aws_secretsmanager_secret.db_url.arn,
          aws_secretsmanager_secret.session_secret.arn,
          aws_secretsmanager_secret.openai_api_key.arn,
          aws_secretsmanager_secret.anthropic_api_key.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role" "ecs_task_role" {
  name = "kgc-ecs-task-role-${var.environment}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
  
  tags = {
    Name        = "kgc-ecs-task-role-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy" "ecs_task_s3_policy" {
  name = "kgc-ecs-task-s3-policy-${var.environment}"
  role = aws_iam_role.ecs_task_role.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Effect   = "Allow"
        Resource = [
          "arn:aws:s3:::kgc-assets-${var.environment}/*",
          "arn:aws:s3:::kgc-assets-${var.environment}"
        ]
      }
    ]
  })
}

# Route 53 DNS records
resource "aws_route53_record" "kgc_app" {
  zone_id = var.dns_zone_id
  name    = var.environment == "production" ? "app.keepgoingcare.com" : "${var.environment}.keepgoingcare.com"
  type    = "A"
  
  alias {
    name                   = aws_lb.kgc_lb.dns_name
    zone_id                = aws_lb.kgc_lb.zone_id
    evaluate_target_health = true
  }
}

# Monitoring and alerts
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "kgc-cpu-utilization-high-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "60"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors ECS CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    ClusterName = aws_ecs_cluster.kgc_cluster.name
    ServiceName = aws_ecs_service.kgc_app.name
  }
  
  tags = {
    Name        = "kgc-cpu-alarm-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "memory_high" {
  alarm_name          = "kgc-memory-utilization-high-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "60"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors ECS memory utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    ClusterName = aws_ecs_cluster.kgc_cluster.name
    ServiceName = aws_ecs_service.kgc_app.name
  }
  
  tags = {
    Name        = "kgc-memory-alarm-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "db_cpu_high" {
  alarm_name          = "kgc-db-cpu-high-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "60"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors RDS CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.kgc_db.id
  }
  
  tags = {
    Name        = "kgc-db-cpu-alarm-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_sns_topic" "alerts" {
  name = "kgc-alerts-${var.environment}"
  
  tags = {
    Name        = "kgc-alerts-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}
```

### Secret Management

```yaml
# GitHub Actions Secret Management
name: Secret Management

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to manage secrets for'
        required: true
        type: choice
        options:
          - development
          - staging
          - production

permissions:
  id-token: write
  contents: read

jobs:
  sync-secrets:
    name: Sync Secrets
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1
      
      - name: Install dependencies
        run: |
          pip install boto3 pyyaml
      
      - name: Sync secrets
        run: |
          python scripts/sync-secrets.py \
            --environment ${{ github.event.inputs.environment }} \
            --secrets-file secrets/${{ github.event.inputs.environment }}/secrets.yml
        env:
          GITHUB_TOKEN: ${{ secrets.GH_SECRETS_MANAGER_TOKEN }}
```

---

This document provides comprehensive guidance on the deployment and DevOps practices for the Keep Going Care (KGC) application. For further details or specific implementation questions, please refer to the codebase or contact the DevOps team.