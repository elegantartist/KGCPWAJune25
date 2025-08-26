# Infrastructure & Local Development Guide

## Overview
This guide covers local development setup and AWS infrastructure deployment for the KGC Healthcare Platform. The platform is designed for Australian healthcare compliance with TGA Class I SaMD requirements and Australian Privacy Principles.

## Local Development Setup

### Prerequisites
- **Node.js 20+**: LTS version recommended
- **PostgreSQL**: Local or cloud instance (Neon recommended)
- **Git**: Version control
- **Package Manager**: pnpm (preferred), npm, or yarn
- **Docker**: Optional for container testing
- **AWS CLI**: Required for AWS deployments

### Quick Start
```bash
# Clone repository
git clone https://github.com/yourusername/kgc-healthcare.git
cd kgc-healthcare

# Run automated development setup
chmod +x tools/scripts/dev_all.sh
./tools/scripts/dev_all.sh
```

The `dev_all.sh` script will:
1. ✅ Check and install dependencies
2. ✅ Validate environment configuration  
3. ✅ Set up database connections
4. ✅ Start development servers
5. ✅ Run health checks

### Manual Setup

#### Step 1: Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

#### Required Environment Variables
```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/kgc_development

# Session Security  
SESSION_SECRET=generate_64_character_random_string

# AI Services (Optional for basic dev)
OPENAI_API_KEY=sk-proj-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# Communication Services (Optional for basic dev)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token  
TWILIO_PHONE_NUMBER=+61412345678
SENDGRID_API_KEY=SG.your_sendgrid_key
SENDGRID_FROM_EMAIL=welcome@keepgoingcare.com

# External APIs (Optional)
TAVILY_API_KEY=tvly-your-tavily-key

# Healthcare Compliance
NODE_ENV=development
AUDIT_LOGGING_LEVEL=info
DATA_RESIDENCY_REGION=AU
```

#### Step 2: Database Setup
```bash
# Using local PostgreSQL
createdb kgc_development

# Or use Neon (cloud PostgreSQL)
# Sign up at https://neon.tech
# Create database and get connection string

# Run database migrations
pnpm db:push

# Optional: Start database studio
pnpm db:studio
```

#### Step 3: Install Dependencies
```bash
# Install with pnpm (recommended)
pnpm install

# Or with npm
npm install

# Or with yarn
yarn install
```

#### Step 4: Start Development Servers
```bash
# Start all services
pnpm dev

# Or manually start individual services
pnpm run dev:api      # Backend API (port 5000)
pnpm run dev:web      # Frontend dev server (port 5173)
```

### Development URLs
- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend API**: http://localhost:5000 (Express server)
- **Database Studio**: http://localhost:5555 (Drizzle Studio)
- **API Documentation**: http://localhost:5000/api/docs (if available)

## Project Structure (Current)

### Pre-Monorepo Migration
```
kgc-healthcare/
├── client/                # React frontend application
│   ├── src/
│   │   ├── components/    # UI components  
│   │   ├── pages/         # Route components
│   │   ├── lib/           # Utilities and hooks
│   │   └── App.tsx        # Main application
│   └── package.json       # Frontend dependencies
├── server/                # Express.js backend
│   ├── routes/            # API endpoints
│   ├── services/          # Business logic
│   ├── middleware/        # Request processors
│   ├── ai/                # AI service integrations
│   └── index.ts           # Server entry point
├── shared/                # Shared types and schemas
│   ├── schema.ts          # Database schemas (Drizzle)
│   └── types.ts           # TypeScript definitions
├── public/                # Static assets and PWA manifest
├── docs/                  # Documentation
├── tools/                 # Development scripts
└── package.json           # Root dependencies
```

### Post-Monorepo Migration (P11)
```
kgc-healthcare-monorepo/
├── apps/
│   └── web/               # Frontend application
├── services/
│   ├── api/               # Main API service
│   └── privacy-proxy/     # Privacy protection service
├── packages/
│   └── shared/            # Shared libraries
├── infrastructure/        # AWS infrastructure code
├── .github/               # CI/CD workflows
└── tools/                 # Development and deployment scripts
```

## Available Development Scripts

### Core Development
```bash
# Start development environment
pnpm dev                   # Both frontend and backend
pnpm dev:web              # Frontend only (Vite)
pnpm dev:api              # Backend only (Express)

# Build for production
pnpm build                # Build both applications
pnpm build:web            # Build frontend
pnpm build:api            # Build backend

# Type checking
pnpm type-check           # Check all TypeScript
pnpm type-check:web       # Check frontend types
pnpm type-check:api       # Check backend types
```

### Database Operations
```bash
# Database schema management
pnpm db:push              # Push schema changes to database
pnpm db:pull              # Pull schema from database
pnpm db:studio            # Open database visual editor
pnpm db:seed              # Seed database with test data
pnpm db:reset             # Reset database (caution!)

# Migrations (future)
pnpm db:migrate           # Run migrations
pnpm db:migrate:create    # Create new migration
```

### Code Quality
```bash
# Linting and formatting
pnpm lint                 # Run ESLint
pnpm lint:fix             # Fix linting issues
pnpm format               # Format with Prettier
pnpm format:check         # Check formatting

# Testing
pnpm test                 # Run all tests
pnpm test:unit            # Unit tests only  
pnpm test:integration     # Integration tests
pnpm test:e2e             # End-to-end tests
pnpm test:watch           # Watch mode testing
pnpm test:coverage        # Generate coverage report
```

### Healthcare-Specific Scripts
```bash
# Compliance checks
pnpm audit:privacy        # PII/PHI compliance check
pnpm audit:security       # Security vulnerability scan
pnpm audit:healthcare     # Healthcare-specific validation

# AI testing
pnpm test:ai              # Test AI integrations
pnpm test:emergency       # Test emergency detection
```

## Development Workflow

### Daily Development
1. **Start Development Environment**
   ```bash
   ./tools/scripts/dev_all.sh
   ```

2. **Make Changes**
   - Edit code in `client/` or `server/`
   - Automatic hot reload for frontend
   - Automatic server restart for backend

3. **Test Changes**
   ```bash
   pnpm test
   pnpm type-check
   ```

4. **Commit and Push**
   ```bash
   ./tools/scripts/push_to_github.sh
   ```

### Feature Development Process
```mermaid
graph LR
    A[Create Feature Branch] --> B[Local Development]
    B --> C[Run Tests]
    C --> D[Push to GitHub]
    D --> E[Create Pull Request]
    E --> F[CI/CD Validation]
    F --> G[Code Review]
    G --> H[Merge to Main]
    H --> I[Auto Deploy]
```

### Healthcare Compliance Workflow
1. **Privacy Review**: Ensure no PII/PHI in logs
2. **AI Boundary Check**: Validate non-diagnostic scope
3. **Emergency Detection**: Test safety keyword monitoring
4. **Australian Compliance**: Verify data residency
5. **TGA Alignment**: Confirm Class I SaMD boundaries

## AWS Infrastructure Deployment

### Prerequisites
- **AWS CLI**: Installed and configured
- **AWS Credentials**: IAM user or OIDC role
- **Docker**: For container builds (optional)
- **Infrastructure Tools**: CDK, SAM, or Terraform (auto-detected)

### Deployment Script
```bash
# Make script executable
chmod +x tools/scripts/deploy_aws.sh

# Deploy to AWS
./tools/scripts/deploy_aws.sh
```

### Manual AWS Setup

#### Step 1: AWS Authentication
```bash
# Option 1: Configure AWS CLI
aws configure

# Option 2: Environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=ap-southeast-2

# Option 3: OIDC Role (GitHub Actions)
# Configure in GitHub repository secrets
```

#### Step 2: Infrastructure Choice
The deployment script auto-detects infrastructure type:

**AWS CDK (Recommended)**
```bash
# Install CDK
npm install -g aws-cdk

# Bootstrap CDK
cdk bootstrap aws://ACCOUNT/ap-southeast-2

# Deploy services
cdk deploy --all
```

**AWS SAM**
```bash
# Install SAM CLI
# https://docs.aws.amazon.com/serverless-application-model/

# Build and deploy
sam build
sam deploy --guided
```

**Terraform**
```bash
# Install Terraform
# https://developer.hashicorp.com/terraform/downloads

# Initialize and deploy
terraform init
terraform plan
terraform apply
```

**AWS App Runner (Direct)**
```bash
# Build container
docker build -t kgc-api .

# Push to ECR
aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin ECR_URI
docker push ECR_URI

# Create App Runner service (via Console or CLI)
```

### Infrastructure Components

#### Core Services
- **App Runner**: Containerized API service
- **Lambda**: Privacy proxy service (serverless)
- **RDS/Neon**: PostgreSQL database
- **ElastiCache**: Redis for sessions (optional)
- **Secrets Manager**: API keys and credentials
- **CloudWatch**: Logging and monitoring

#### Security Components
- **WAF**: Web application firewall
- **VPC**: Network isolation (optional)
- **IAM**: Access control roles and policies
- **Certificate Manager**: SSL/TLS certificates
- **Route 53**: DNS management (optional)

#### Compliance Components
- **Data Residency**: ap-southeast-2 region enforcement
- **Audit Logging**: CloudTrail + CloudWatch
- **Encryption**: KMS keys for data protection
- **Monitoring**: Healthcare-specific alerts

## Environment Management

### Development Environment
```yaml
Purpose: Local development and testing
Database: Local PostgreSQL or Neon development tier
AI Services: Test API keys with limited quotas
External APIs: Sandbox/test endpoints
Monitoring: Basic console logging
Security: Relaxed for development efficiency
```

### Staging Environment (Future)
```yaml
Purpose: Pre-production validation
Database: Dedicated staging database
AI Services: Limited production API keys  
External APIs: Production endpoints (test mode)
Monitoring: Full APM without alerting
Security: Production-like configuration
```

### Production Environment
```yaml
Purpose: Live healthcare application
Database: Production PostgreSQL (Neon Pro)
AI Services: Full production API quotas
External APIs: Live production services
Monitoring: Comprehensive healthcare monitoring
Security: Full compliance configuration
Region: ap-southeast-2 (Australian data residency)
```

## Monitoring & Observability

### Local Development Monitoring
```bash
# Application logs
pnpm dev                  # Shows real-time logs

# Database monitoring
pnpm db:studio            # Visual database explorer

# Performance profiling
NODE_ENV=development pnpm dev --inspect

# Health checks
curl http://localhost:5000/api/health
```

### Production Monitoring Stack
- **Application Performance**: DataDog, New Relic, or AWS X-Ray
- **Infrastructure Monitoring**: CloudWatch metrics and alarms
- **Log Management**: CloudWatch Logs with structured logging
- **Error Tracking**: Sentry for application errors
- **Healthcare KPIs**: Custom dashboards for compliance metrics

### Key Metrics to Monitor
```yaml
Application Metrics:
  - Response time (< 2 seconds target)
  - Error rate (< 1% target)  
  - API throughput (requests/second)
  - Database connection health
  - AI service response times

Healthcare Metrics:
  - Patient data access patterns
  - Emergency detection trigger rates
  - Privacy anonymization success rate
  - Compliance audit event frequency
  - TGA boundary validation results

Infrastructure Metrics:
  - CPU and memory utilization
  - Database performance (IOPS, connections)
  - Cache hit rates (Redis)
  - Network latency between services
```

## Troubleshooting

### Common Development Issues

#### Environment Setup Issues
```yaml
Problem: Database connection fails
Solution: 
  - Check DATABASE_URL format
  - Verify PostgreSQL is running
  - Test connection: psql $DATABASE_URL

Problem: API keys not working
Solution:
  - Verify .env file exists and is loaded
  - Check API key format and permissions
  - Test with curl or API testing tools

Problem: Hot reload not working
Solution:
  - Check file watchers aren't at system limit
  - Restart development server
  - Clear node_modules and reinstall
```

#### Build and Deployment Issues
```yaml
Problem: TypeScript compilation errors
Solution:
  - Run pnpm type-check for detailed errors
  - Update shared types in shared/schema.ts
  - Check import paths and exports

Problem: Docker build fails
Solution:
  - Check Dockerfile syntax
  - Verify all required files are included
  - Test build locally before pushing

Problem: AWS deployment fails
Solution:
  - Check AWS credentials and permissions
  - Verify region (ap-southeast-2)
  - Review CloudFormation/CDK logs
```

#### Healthcare Compliance Issues
```yaml
Problem: PII detected in logs
Solution:
  - Review privacy protection service
  - Update anonymization patterns
  - Audit logging configuration

Problem: Cross-border data transfer detected
Solution:
  - Verify AWS region configuration
  - Check external API endpoints
  - Review data flow architecture

Problem: AI responses exceed medical boundaries
Solution:
  - Update system prompts and guardrails
  - Review emergency detection keywords
  - Test with healthcare-specific scenarios
```

### Getting Help

#### Documentation Resources
- **Project Documentation**: `/docs` directory
- **API Reference**: Generated from OpenAPI specs
- **Architecture Overview**: `replit.md`
- **Compliance Guide**: `docs/05_privacy_security_au.md`

#### Development Support
- **GitHub Issues**: Report bugs and feature requests
- **Code Review**: Pull request discussions
- **Team Chat**: Internal communication channels
- **Healthcare Compliance**: Dedicated compliance review process

#### External Resources
- **AWS Documentation**: https://docs.aws.amazon.com/
- **TGA Guidelines**: https://www.tga.gov.au/products/software-medical-device
- **Australian Privacy Principles**: https://www.oaic.gov.au/privacy/australian-privacy-principles
- **React Documentation**: https://react.dev/
- **Express.js Guide**: https://expressjs.com/

## Performance Optimization

### Development Performance
```bash
# Optimize dependencies
pnpm audit                # Check for vulnerabilities
pnpm dedupe               # Remove duplicate dependencies
npx depcheck              # Find unused dependencies

# Build optimization
pnpm build --analyze      # Analyze bundle sizes
VITE_BUNDLE_ANALYZER=true pnpm build

# Database optimization
pnpm db:optimize          # Run VACUUM and ANALYZE
```

### Production Performance
- **CDN Integration**: CloudFront for static assets
- **Database Optimization**: Connection pooling, query optimization
- **Caching Strategy**: Redis for sessions and API responses
- **Container Optimization**: Multi-stage builds, minimal base images
- **Auto-scaling**: App Runner automatic scaling configuration

### Healthcare-Specific Optimizations
- **PII Anonymization Caching**: Cache anonymization mappings
- **AI Response Caching**: Cache appropriate AI responses
- **Audit Log Optimization**: Efficient structured logging
- **Emergency Detection**: Fast keyword matching algorithms

## Security Best Practices

### Development Security
- **Environment Isolation**: Separate credentials for each environment
- **Local HTTPS**: Use mkcert for local SSL development
- **Secret Management**: Never commit secrets to version control
- **Dependency Scanning**: Regular vulnerability assessments

### Production Security
- **HTTPS Everywhere**: Enforce TLS 1.3 minimum
- **Security Headers**: Implement comprehensive security headers
- **Input Validation**: Sanitize all user inputs
- **Rate Limiting**: Protect against abuse and DDoS
- **Regular Updates**: Keep dependencies current

### Healthcare Security
- **Data Encryption**: AES-256 for data at rest
- **Access Logging**: Comprehensive audit trails
- **Role-Based Access**: Principle of least privilege
- **Incident Response**: Defined procedures for security events

## Cost Optimization

### Development Costs
- **Neon Free Tier**: Use for development and testing
- **AWS Free Tier**: Leverage free tier resources
- **Local Development**: Minimize cloud usage during development

### Production Cost Management
- **Right-sizing**: Monitor and adjust resource allocation
- **Auto-scaling**: Scale down during low usage periods
- **Reserved Instances**: Consider reserved capacity for predictable workloads
- **Cost Monitoring**: Set up billing alerts and budgets

### Healthcare Cost Considerations
- **Compliance Overhead**: Factor in audit and compliance requirements
- **Data Residency**: Australian region may have premium pricing
- **High Availability**: Healthcare applications require redundancy
- **Monitoring Costs**: Comprehensive monitoring has associated costs

This guide provides comprehensive coverage of local development and AWS deployment for the KGC Healthcare Platform. The automated scripts in `tools/scripts/` simplify common operations while maintaining healthcare compliance and security standards.