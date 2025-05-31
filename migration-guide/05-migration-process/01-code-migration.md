# Code Migration Strategy

This document outlines the strategy for migrating the KGC application codebase from Replit to AWS.

## Migration Goals

The code migration has the following primary goals:

1. **Preserve Functionality**: Ensure all existing features work correctly after migration
2. **Enhance Security**: Improve security through AWS best practices
3. **Minimize Disruption**: Maintain application availability throughout the migration
4. **Enable Scalability**: Position the application to scale with user growth
5. **Support Modularity**: Allow independent updates to different application modules

## Source Code Analysis

Before migration, a comprehensive analysis of the codebase reveals the following structure:

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components for each route
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions and helpers
│   │   ├── services/       # Service layer for API interactions
│   │   └── ...
├── server/                 # Backend Express application
│   ├── routes.ts           # API route definitions
│   ├── db.ts               # Database connection and configuration
│   ├── index.ts            # Server startup code
│   └── ...
├── shared/                 # Shared code between client and server
│   ├── schema.ts           # Database schema and types
│   └── ...
└── ...
```

## Migration Approach

The code migration will use a parallel deployment approach with these phases:

### Phase 1: Repository Setup

1. **Create New Repository**:
   - Set up a new Git repository for the AWS version
   - Configure branch protection and code review requirements
   - Set up CI/CD pipelines for automated testing and deployment

2. **Copy Codebase**:
   - Copy existing codebase to the new repository
   - Update configuration files to point to AWS resources
   - Commit initial version to the master branch

### Phase 2: Frontend Migration

1. **Separating the Frontend**:
   - Extract the frontend application for independent deployment
   - Update build scripts for S3/CloudFront deployment
   - Create deployment workflows for frontend-only changes

2. **API Endpoint Configuration**:
   - Update API service layer to use API Gateway endpoints
   - Implement environment-specific configuration
   - Set up environment variables for different environments
   
3. **Authentication Updates**:
   - Integrate AWS Cognito for authentication (as detailed in [Cognito Authentication Integration](../04-security-implementation/01-cognito-authentication.md))
   - Update protected routes and components

4. **Asset Management**:
   - Move static assets to S3 with appropriate caching
   - Update image loading to use CloudFront URLs
   - Set up versioned asset deployment

### Phase 3: Backend Migration

1. **API Implementation**:
   - Convert Express routes to Lambda functions or refactor for container deployment
   - Organize Lambda functions by domain/feature
   - Implement proper error handling and logging

2. **Database Access Layer**:
   - Update database connection to use AWS RDS
   - Implement connection pooling for optimal performance
   - Add retries and circuit breakers for resilience

3. **Environment Configuration**:
   - Move configuration to AWS Parameter Store / Secrets Manager
   - Implement environment-specific configuration loading
   - Set up secure access to configuration values

### Phase 4: Specialized Services

1. **AI Integration**:
   - Update OpenAI integration to use AWS Lambda for serverless processing
   - Implement robust error handling and retries
   - Set up proper logging and monitoring

2. **WebSocket Migration**:
   - Migrate WebSocket functionality to AWS API Gateway WebSockets
   - Implement connection management via DynamoDB
   - Update client code to connect to new WebSocket endpoints

## Code Structure for AWS

The AWS version will have a restructured codebase optimized for cloud deployment:

```
├── frontend/                       # React frontend application
│   ├── src/                        # Source code
│   ├── public/                     # Static assets
│   ├── deployment/                 # Deployment scripts
│   └── ...
├── backend/                        # Backend services
│   ├── functions/                  # Lambda functions organized by domain
│   │   ├── auth/                   # Authentication-related functions
│   │   ├── health-metrics/         # Health metrics API
│   │   ├── users/                  # User management API
│   │   └── ...
│   ├── layers/                     # Lambda layers for shared code
│   │   ├── database/               # Database access layer
│   │   ├── utils/                  # Utility functions
│   │   └── ...
│   └── ...
├── infrastructure/                 # Infrastructure as Code
│   ├── cloudformation/             # CloudFormation templates
│   │   ├── networking.yml          # VPC, subnets, security groups
│   │   ├── database.yml            # RDS configuration
│   │   ├── compute.yml             # Lambda and ECS resources
│   │   └── ...
│   └── ...
└── ...
```

## Service-Specific Migrations

### Authentication Service

Migration approach for the authentication system:

1. Add Cognito integration to the existing codebase
2. Run both authentication systems in parallel during transition
3. Migrate users to Cognito in batches
4. Switch to Cognito-only once all users are migrated

### Database Access

Migration approach for database access:

1. Create read-only replica of Replit PostgreSQL database in AWS RDS
2. Test all database operations against the RDS replica
3. When ready, promote replica to primary and update connection strings
4. Verify all operations with new database

### WebSocket Communication

Migration approach for WebSocket functionality:

1. Implement AWS API Gateway WebSocket API
2. Update client to connect to both old and new WebSocket endpoints
3. Monitor usage and stability of new WebSocket implementation
4. Switch to AWS-only implementation when stable

## Code Modifications Required

The following code modifications are required for AWS compatibility:

1. **Environment Configuration**:
   ```typescript
   // Before
   const apiUrl = process.env.API_URL || 'http://localhost:5000';
   
   // After
   import { getParameter } from './aws-params';
   const apiUrl = await getParameter('/kgc/api/url');
   ```

2. **Authentication Integration**:
   ```typescript
   // Before
   import { authService } from '../services/authService';
   
   // After
   import { Auth } from 'aws-amplify';
   ```

3. **Database Connection**:
   ```typescript
   // Before
   import { Pool } from 'pg';
   const pool = new Pool({ connectionString: process.env.DATABASE_URL });
   
   // After
   import { RDSDataClient } from '@aws-sdk/client-rds-data';
   const client = new RDSDataClient({ region: 'ap-southeast-2' });
   ```

4. **File Storage**:
   ```typescript
   // Before
   import fs from 'fs';
   await fs.promises.writeFile(filePath, data);
   
   // After
   import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
   const s3Client = new S3Client({ region: 'ap-southeast-2' });
   await s3Client.send(new PutObjectCommand({
     Bucket: 'kgc-storage',
     Key: fileName,
     Body: data
   }));
   ```

## Source Control Strategy

The migration will use this source control strategy:

1. **Feature Branches**: Create feature branches for each component migration
2. **Pull Requests**: Use pull requests with code reviews for all changes
3. **Tagging**: Tag versions deployed to each environment
4. **Rollback Plan**: Maintain ability to revert to previous versions
5. **Migration Branches**: Separate long-running branches for major migration phases

## Testing Strategy

The migration will use a comprehensive testing approach:

1. **Unit Tests**: Update and run unit tests for all modified components
2. **Integration Tests**: Test all service integrations in the AWS environment
3. **End-to-End Tests**: Perform complete user journey testing
4. **Performance Testing**: Verify performance in the AWS environment
5. **Security Testing**: Conduct security scans and penetration testing

## Deployment Process

The AWS codebase will be deployed using this process:

1. **CI/CD Pipeline**: Set up AWS CodePipeline for automated deployments
2. **Environment Promotion**: Progress code through dev → test → staging → production
3. **Deployment Verification**: Run automated tests after each deployment
4. **Canary Deployments**: Use canary deployments for critical components
5. **Rollback Capability**: Ensure ability to quickly roll back problematic deployments

## Monitoring and Validation

During and after migration, implement robust monitoring:

1. **CloudWatch Dashboards**: Create dashboards for key metrics
2. **Alarms**: Set up alarms for critical issues
3. **Log Analysis**: Implement log analysis for error detection
4. **User Feedback**: Gather user feedback on the migrated application
5. **Performance Comparison**: Compare performance metrics before and after migration

## Timeline

The code migration is expected to take 4-5 weeks with this timeline:

| Week | Phase | Key Activities |
|------|-------|----------------|
| 1 | Repository Setup | Create repository, copy codebase, update configuration |
| 1-2 | Frontend Migration | Extract frontend, update API endpoints, integrate Cognito |
| 2-3 | Backend Migration | Convert routes to Lambda, update database access, configure environments |
| 3-4 | Specialized Services | Migrate AI integration and WebSockets |
| 4-5 | Testing and Validation | Comprehensive testing, monitoring setup, user acceptance testing |

## Next Steps

After defining the code migration strategy, proceed to [Database Migration](./02-database-migration.md) to plan the approach for migrating the database to AWS RDS.