# CI/CD Pipeline Documentation

## Overview
The KGC Healthcare Platform uses GitHub Actions for continuous integration and deployment. The pipeline ensures code quality, security, and successful builds before deployment to production environments.

## Pipeline Architecture

### Trigger Events
```yaml
Triggers:
  - Push to main/develop branches
  - Pull requests to any branch  
  - Manual workflow dispatch (for releases)
```

### Pipeline Stages
```mermaid
graph TB
    A[Code Push/PR] --> B[Install Dependencies]
    B --> C[Lint & Format Check]
    B --> D[TypeScript Type Check] 
    B --> E[Run Tests]
    B --> F[Security Scan]
    C --> G[Build Web App]
    D --> G
    E --> G
    C --> H[Build API Service]
    D --> H
    E --> H
    F --> I[CI Summary]
    G --> I
    H --> I
    I --> J[Artifact Storage]
```

## CI Stages Detailed

### Stage 1: Install Dependencies
**Purpose**: Set up the build environment and install project dependencies
**Duration**: ~2-3 minutes

```yaml
Responsibilities:
  - Detect package manager (PNPM/NPM/Yarn)
  - Setup Node.js 20 LTS environment  
  - Cache dependencies for faster builds
  - Install all workspace dependencies
  - Prepare build environment
```

**Caching Strategy**:
- Dependencies cached by package manager lockfile hash
- Cache includes node_modules for all workspaces
- 90% faster builds on cache hit
- Automatic cache invalidation on dependency changes

**Outputs**:
- `package-manager`: Detected package manager (pnpm/npm/yarn)
- `node-modules-cache-key`: Cache status for dependency restoration

### Stage 2: Lint & Format Check
**Purpose**: Ensure code quality and consistent formatting
**Duration**: ~30-60 seconds

```yaml
Tools Used:
  - ESLint: Code quality and best practices
  - Prettier: Code formatting consistency
  - EditorConfig: Cross-editor consistency
```

**Checks Performed**:
- TypeScript/JavaScript linting rules
- Healthcare-specific security patterns
- Import/export consistency
- Code style compliance
- Markdown and YAML formatting

**Configuration Files**:
- `.eslintrc.cjs` - ESLint rules and overrides
- `.prettierrc` - Prettier formatting rules
- `.editorconfig` - Editor configuration

### Stage 3: TypeScript Type Check
**Purpose**: Validate TypeScript types across the entire monorepo
**Duration**: ~1-2 minutes

```yaml
Validation Areas:
  - Shared package type exports
  - Cross-workspace type compatibility
  - Database schema type safety (Drizzle)
  - API contract type validation
  - Frontend/backend type alignment
```

**Type Safety Features**:
- Strict TypeScript configuration
- Shared type definitions from `@kgc/shared`
- Zod schema validation
- API response type checking
- Database query type safety

### Stage 4: Run Tests  
**Purpose**: Execute comprehensive test suites
**Duration**: ~3-5 minutes

```yaml
Test Categories:
  - Unit Tests: Component and function testing
  - Integration Tests: API endpoint testing  
  - Database Tests: Schema and query validation
  - Security Tests: Input sanitization validation
  - Healthcare Compliance Tests: TGA/HIPAA validation
```

**Test Environment**:
- Isolated test database (in-memory)
- Mocked external APIs (OpenAI, Twilio, SendGrid)
- Test-specific environment variables
- Coverage reporting and artifact upload

**Test Frameworks**:
- Jest/Vitest for unit testing
- Supertest for API testing  
- React Testing Library for component testing
- Custom healthcare compliance validators

### Stage 5: Security Scan (PR only)
**Purpose**: Identify security vulnerabilities and compliance issues
**Duration**: ~1-2 minutes

```yaml
Security Checks:
  - npm/pnpm audit: Dependency vulnerabilities
  - Dependency review: New vulnerability detection
  - Secret scanning: Prevent credential leaks
  - Healthcare compliance: PII/PHI handling validation
```

**Compliance Features**:
- TGA Class I SaMD boundary validation
- Australian Privacy Principles compliance
- HIPAA-aligned security checks
- Emergency detection keyword validation

### Stage 6: Build Applications
**Purpose**: Create production-ready builds for deployment
**Duration**: ~3-4 minutes per build target

```yaml
Build Matrix:
  - Web Application (React + Vite)
  - API Service (Node.js + Express)
  - Future: Privacy Proxy Service
  - Future: Shared Package (NPM)
```

**Build Outputs**:
- **Web App**: Static files for Vercel/CDN deployment
- **API Service**: Node.js bundle for container deployment
- **Source Maps**: For production debugging (stored separately)
- **Build Manifests**: Dependency and asset tracking

**Build Environment Variables**:
```bash
# Web App Build
NODE_ENV=production
VITE_API_BASE_URL=https://api.keepgoingcare.com
VITE_APP_ENV=production

# API Service Build  
NODE_ENV=production
BUILD_TARGET=container
```

### Stage 7: Artifact Storage
**Purpose**: Store build outputs for deployment and rollback
**Duration**: ~30-60 seconds

```yaml
Artifacts Created:
  - web-build-{sha}: Web application build
  - api-build-{sha}: API service build
  - test-results: Test coverage and reports
  - security-scan-results: Vulnerability reports
```

**Retention Policy**:
- Build artifacts: 30 days
- Test results: 7 days  
- Security scans: 14 days
- Release builds: 90 days (tagged)

## Required GitHub Secrets

### Core Application Secrets (Required for testing)
```yaml
# Database (Test Environment)
DATABASE_URL: postgresql://test_user:test_pass@localhost:5432/kgc_test

# Session Security
SESSION_SECRET: "64_character_random_string_for_jwt_signing"

# AI Services (Test Keys - Limited Quotas)
OPENAI_API_KEY: "sk-proj-test-key-for-ci-environment"
ANTHROPIC_API_KEY: "sk-ant-test-key-for-ci-environment"

# Communication Services (Test/Sandbox)
TWILIO_ACCOUNT_SID: "ACtest-account-sid-for-ci"
TWILIO_AUTH_TOKEN: "test-auth-token-for-ci"
TWILIO_PHONE_NUMBER: "+15005550006"  # Test number
SENDGRID_API_KEY: "SG.test-key-for-ci-environment"

# Search API (Test Key)
TAVILY_API_KEY: "tvly-test-key-for-ci"
```

### Build Configuration Variables
```yaml
# Frontend Build Configuration
VITE_API_BASE_URL: "https://api.keepgoingcare.com"
VITE_APP_ENV: "production"

# Healthcare Compliance
REDACTION_POLICY_VERSION: "v2.1"
DATA_RESIDENCY_REGION: "AU"
AUDIT_LOGGING_LEVEL: "info"
```

### Optional Secrets (Performance/Monitoring)
```yaml
# Performance Monitoring
SENTRY_DSN: "https://sentry-dsn-for-error-tracking"
DATADOG_API_KEY: "datadog-api-key-for-apm"

# Deployment Webhooks
SLACK_WEBHOOK_URL: "https://hooks.slack.com/services/..."
TEAMS_WEBHOOK_URL: "https://outlook.office.com/webhook/..."
```

## Environment-Specific Configuration

### Development/PR Environment
```yaml
Purpose: Feature testing and validation
Database: Temporary test database
AI Services: Sandbox/test API keys
Rate Limits: Relaxed for testing
Monitoring: Basic error logging
```

### Staging Environment (Future)
```yaml
Purpose: Pre-production validation  
Database: Staging database (production-like)
AI Services: Production API keys (limited)
Rate Limits: Production-like
Monitoring: Full APM and logging
```

### Production Environment
```yaml
Purpose: Live healthcare application
Database: Production PostgreSQL (Neon)
AI Services: Full production API keys
Rate Limits: Healthcare-appropriate limits
Monitoring: Comprehensive healthcare monitoring
Compliance: Full audit logging and encryption
```

## Package Manager Detection

### Automatic Detection Logic
```yaml
Detection Order:
  1. pnpm-lock.yaml exists → Use PNPM
  2. yarn.lock exists → Use Yarn  
  3. package-lock.json exists → Use NPM
  4. Default → NPM
```

### PNPM Workspace Support
```bash
# Install all workspace dependencies
pnpm install --frozen-lockfile

# Run commands across workspaces
pnpm --stream run build
pnpm --parallel run test

# Filter by workspace
pnpm --filter @kgc/web build
pnpm --filter @kgc/api test
```

### NPM Workspace Support (Fallback)
```bash
# Install dependencies
npm ci

# Run scripts
npm run build
npm run test

# Workspace-specific commands
npm run build --workspace=apps/web
```

## Build Caching Strategy

### Dependency Caching
```yaml
Cache Key: OS + Package Manager + Lockfile Hash
Cache Paths:
  - node_modules/
  - apps/*/node_modules/
  - services/*/node_modules/ 
  - packages/*/node_modules/
  - ~/.cache/pnpm
  - ~/.npm/
```

### Build Caching (Future Enhancement)
```yaml
Build Cache Targets:
  - TypeScript compilation output
  - Vite build cache  
  - ESBuild cache
  - Test result cache
  - Lint result cache
```

### Cache Performance
```yaml
Cache Hit Ratio: ~85-90% for dependency cache
Build Time Reduction: 
  - Cold build: ~8-10 minutes
  - Warm build: ~3-4 minutes  
  - Cache hit: ~2-3 minutes
```

## Failure Handling & Notifications

### Failure Types & Actions
```yaml
Install Failure:
  - Retry with clean cache
  - Report dependency conflicts
  - Block all subsequent stages

Lint Failure:
  - Report specific violations
  - Allow build to continue
  - Create review comments (PR)

Type Check Failure:
  - Report type errors with locations
  - Block build stages
  - Require fixes before merge

Test Failure:
  - Report failed tests with details
  - Upload test artifacts  
  - Block deployment
  - Generate coverage report

Build Failure:
  - Report build errors
  - Block deployment
  - Preserve build logs
  - Alert development team

Security Failure:
  - Report vulnerabilities
  - Block deployment (high/critical)
  - Create security issues
  - Notify security team
```

### Notification Channels
```yaml
GitHub:
  - PR status checks
  - Issue creation (security)
  - Review comments (lint/format)
  
Slack (Future):
  - Build failure notifications
  - Security alert notifications
  - Deployment status updates

Email (Critical Only):
  - Security vulnerability alerts
  - Production build failures
  - Healthcare compliance violations
```

## Performance Metrics & SLA

### Build Time Targets
```yaml
Total Pipeline Duration:
  - Target: < 10 minutes
  - Current: ~8-12 minutes
  - Cache Hit: ~5-7 minutes

Stage Duration Targets:
  - Install: < 3 minutes
  - Lint: < 1 minute  
  - Type Check: < 2 minutes
  - Tests: < 5 minutes
  - Build: < 4 minutes per target
  - Security: < 2 minutes
```

### Reliability Targets
```yaml
Pipeline Success Rate: > 95%
False Positive Rate: < 2%
Cache Hit Rate: > 85%
Artifact Upload Success: > 99%
```

### Resource Usage
```yaml
Concurrent Jobs: 2-4 (based on GitHub plan)
Build Agent: ubuntu-latest (2 CPU, 7GB RAM)
Peak Memory Usage: ~4-5GB (large builds)
Network Usage: ~500MB-1GB (downloads)
```

## Troubleshooting Guide

### Common CI Failures

#### 1. Dependency Installation Failure
```yaml
Symptoms: npm ERR! or pnpm ERR! during install
Causes: 
  - Network timeouts
  - Registry unavailability  
  - Dependency conflicts
  - Corrupted cache

Resolution:
  - Retry workflow
  - Clear dependency cache
  - Update lockfiles
  - Review dependency versions
```

#### 2. TypeScript Compilation Errors
```yaml
Symptoms: TS errors during type-check stage
Causes:
  - Missing type definitions
  - Cross-workspace type mismatches
  - Updated dependencies with breaking types
  - Shared package type exports

Resolution:
  - Update type definitions
  - Fix cross-workspace imports
  - Align shared package versions
  - Run local type-check first
```

#### 3. Test Failures
```yaml
Symptoms: Jest/Vitest test failures
Causes:
  - Environment differences (CI vs local)
  - Missing test environment variables
  - Database schema mismatches
  - Mock/stub configuration issues

Resolution:
  - Verify CI environment variables
  - Update test database schema
  - Fix mock configurations
  - Run tests locally first
```

#### 4. Build Failures
```yaml
Symptoms: Build process exits with error
Causes:
  - Memory limits exceeded
  - Missing environment variables
  - Asset optimization failures
  - Import path resolution errors

Resolution:
  - Optimize build memory usage
  - Set required build variables
  - Fix asset references
  - Update import paths
```

### Debug Commands
```bash
# Local CI simulation
npm run ci:install
npm run ci:lint  
npm run ci:typecheck
npm run ci:test
npm run ci:build

# Cache debugging
npm cache verify
pnpm store status

# Dependency debugging
npm ls --depth=0
pnpm list --depth=0
```

### Performance Optimization

#### Build Optimization Strategies
```yaml
1. Dependency Optimization:
   - Remove unused dependencies
   - Use lighter alternatives
   - Enable tree-shaking
   - Optimize bundle splitting

2. Cache Optimization:  
   - Maximize cache key stability
   - Use fine-grained caching
   - Parallel cache restoration
   - Incremental builds

3. Parallel Execution:
   - Run lint/typecheck/test in parallel
   - Matrix builds for multiple targets
   - Parallel workspace operations
   - Concurrent artifact uploads
```

#### Monitoring & Alerts
```yaml
Build Performance Tracking:
  - Average build duration trends
  - Cache hit rate monitoring
  - Resource usage patterns
  - Failure rate analysis

Alert Conditions:
  - Build duration > 15 minutes
  - Success rate < 90% (24h)
  - Cache hit rate < 70%
  - Security vulnerabilities detected
```

## Migration to Production CI/CD

### Phase P9: Deployment Integration (Future)
```yaml
Additional Stages:
  - Container builds (Docker)
  - Security container scanning
  - Infrastructure validation
  - Blue/green deployment
  - Health check validation
  - Rollback capability

Deployment Targets:
  - Vercel (Web App)
  - AWS App Runner (API)
  - Google Cloud Run (Privacy Proxy)
```

### Phase P10: Advanced Monitoring
```yaml
Monitoring Integration:
  - Application Performance Monitoring (APM)
  - Real User Monitoring (RUM)
  - Error tracking and alerting
  - Healthcare compliance monitoring
  - Audit trail validation
```

## Compliance & Security

### Healthcare Compliance CI Checks
```yaml
TGA Class I SaMD Validation:
  - Non-diagnostic scope enforcement
  - Medical boundary validation
  - Emergency detection testing

Australian Privacy Principles:
  - PII anonymization validation  
  - Data residency compliance
  - Audit logging verification

HIPAA Alignment:
  - PHI protection validation
  - Access control testing
  - Encryption verification
```

### Security Integration
```yaml
Secret Management:
  - GitHub Secrets encryption
  - Environment-specific secrets
  - Secret rotation tracking
  - Access audit logging

Vulnerability Management:
  - Automated dependency scanning
  - Container security scanning  
  - Code security analysis
  - Healthcare-specific threat modeling
```