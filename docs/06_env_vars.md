# Environment Variables Reference

## Overview
This document lists all environment variables used by the KGC Healthcare Platform. Variables are categorized by their purpose and deployment context.

## Variable Categories

### 🔧 Core Application Configuration

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `NODE_ENV` | Yes | `development` | Application environment mode | `production`, `development` |
| `PORT` | No | `5000` (dev) / `8080` (cloud) | Server port number | `8080` |
| `APP_ENV` | No | `local` | Application-specific environment | `local`, `staging`, `production` |

### 🔒 Security & Authentication  

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `SESSION_SECRET` | Yes | - | JWT/session encryption key (64+ chars) | `a1b2c3d4e5f6...` |
| `ADMIN_PASSWORD_HASH` | Production | - | Bcrypt hash of admin password | `$2b$12$rQJ8vQJ...` |
| `ALLOWED_ORIGINS` | Production | `*` (dev) | CORS allowed origins (comma-separated) | `https://kgc.replit.app,https://kgc.com` |
| `FORCE_HTTPS` | Production | `false` | Enforce HTTPS redirects | `true` |

### 🤖 AI Service APIs

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `OPENAI_API_KEY` | Yes | - | OpenAI GPT-4 API key | `sk-proj-abc123...` |
| `ANTHROPIC_API_KEY` | Yes | - | Anthropic Claude API key | `sk-ant-api03-abc123...` |
| `KGC_AGENT_MODEL` | No | `gpt-4o` | Primary AI model identifier | `gpt-4o`, `claude-3-5-sonnet` |
| `AI_TEMPERATURE` | No | `0.7` | AI response creativity (0.0-2.0) | `0.7` |
| `AI_TOP_P` | No | `0.9` | AI nucleus sampling parameter | `0.9` |
| `AI_MAX_TOKENS` | No | `2000` | Maximum AI response length | `2000` |

### 💾 Database Configuration

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `PGHOST` | No | `localhost` | PostgreSQL host | `ep-example.us-west-2.aws.neon.tech` |
| `PGPORT` | No | `5432` | PostgreSQL port | `5432` |
| `PGUSER` | No | `postgres` | PostgreSQL username | `neondb_owner` |
| `PGPASSWORD` | No | - | PostgreSQL password | `npg_aTgs6Ifdic9u` |
| `PGDATABASE` | No | `kgc_healthcare` | PostgreSQL database name | `neondb` |

### 📱 Communication Services

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `TWILIO_ACCOUNT_SID` | Yes | - | Twilio account identifier | `ACa1b2c3d4e5f6...` |
| `TWILIO_AUTH_TOKEN` | Yes | - | Twilio authentication token | `a1b2c3d4e5f6...` |
| `TWILIO_PHONE_NUMBER` | Yes | - | Twilio SMS sender number | `+61412345678` |
| `SENDGRID_API_KEY` | Yes | - | SendGrid email API key | `SG.abc123...` |
| `SENDGRID_FROM` | No | `welcome@keepgoingcare.com` | Default sender email | `welcome@keepgoingcare.com` |

### 🔍 External APIs

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `TAVILY_API_KEY` | Yes | - | Tavily search API key | `tvly-abc123...` |

### ☁️ Cloud Platform Configuration

#### AWS Deployment

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `AWS_REGION` | Production | `ap-southeast-2` | AWS region for services | `ap-southeast-2` |
| `AWS_ACCESS_KEY_ID` | No (OIDC) | - | AWS access key (prefer OIDC roles) | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | No (OIDC) | - | AWS secret key (prefer OIDC roles) | `abc123...` |
| `KGC_SECRET_NAME` | Production | `prod/KGC/sec` | AWS Secrets Manager secret name | `prod/KGC/sec` |

#### Google Cloud Platform

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `GOOGLE_CLOUD_PROJECT` | Production | - | GCP project identifier | `kgc-healthcare-prod` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Production | - | Path to GCP service account JSON | `/app/gcp-credentials.json` |

#### Replit Platform  

| Variable | Detected | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `REPL_ID` | Auto | - | Replit environment identifier | `12345678-1234-1234...` |
| `REPLIT_DB_URL` | Auto | - | Replit database URL | `https://kv.replit.com/...` |
| `REPLIT_DOMAINS` | Auto | - | Replit domain patterns | `*.replit.app,*.replit.co` |

### 🔐 Privacy & Compliance

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `REDACTION_POLICY_VERSION` | No | `v1.0` | PII redaction policy version | `v2.1` |
| `PRIVACY_AGENT_ENABLED` | No | `true` | Enable privacy protection agent | `true`, `false` |
| `AUDIT_LOGGING_LEVEL` | No | `info` | Audit trail logging verbosity | `debug`, `info`, `warn` |
| `DATA_RESIDENCY_REGION` | No | `AU` | Data residency requirement | `AU`, `US`, `EU` |

### 📊 MCP & Memory Configuration

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `MCP_ENABLED` | No | `true` | Enable Model Context Protocol tools | `true`, `false` |
| `MCP_CONNECTIVITY_LEVEL` | No | `FULL` | MCP processing level | `OFFLINE`, `MINIMAL`, `FUNCTIONAL`, `FULL` |
| `LANGMEM_ENABLED` | No | `true` | Enable LangMem memory system | `true`, `false` |
| `MEMORY_RETENTION_DAYS` | No | `90` | Default memory retention period | `30`, `90`, `365` |
| `SEMANTIC_SEARCH_ENABLED` | No | `true` | Enable semantic memory search | `true`, `false` |

### 🚀 Performance & Monitoring

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `LOG_LEVEL` | No | `info` | Application logging level | `debug`, `info`, `warn`, `error` |
| `REDIS_URL` | No | - | Redis cache connection (optional) | `redis://localhost:6379` |
| `MAX_REQUEST_SIZE` | No | `50mb` | Maximum HTTP request body size | `10mb`, `50mb` |
| `HEALTH_CHECK_PATH` | No | `/api/health` | Health check endpoint path | `/health` |
| `ENABLE_CORS` | Development | `true` | Enable CORS in development | `true`, `false` |
| `REQUEST_TIMEOUT` | No | `30000` | HTTP request timeout (ms) | `30000` |

### 🧪 Development & Testing

| Variable | Environment | Default | Description | Example |
|----------|-------------|---------|-------------|---------|
| `DEV_MODE` | Development | `false` | Enable development features | `true`, `false` |
| `MOCK_EXTERNAL_APIS` | Testing | `false` | Mock external API calls | `true`, `false` |
| `ENABLE_DEBUG_ROUTES` | Development | `false` | Enable debug API endpoints | `true`, `false` |
| `BYPASS_AUTH` | Testing | `false` | Bypass authentication (testing only) | `true`, `false` |

## Platform-Specific Settings

### Replit Environment
- **Auto-detected**: `REPL_ID`, `REPLIT_DB_URL`, `REPLIT_DOMAINS`
- **Security**: Uses flexible CORS, default admin credentials
- **Database**: Supports both Neon and Replit DB
- **Secrets**: Falls back to environment variables

### AWS Production Environment  
- **Secrets**: Uses AWS Secrets Manager (`KGC_SECRET_NAME`)
- **Authentication**: Prefers IAM roles over access keys
- **Region**: Defaults to `ap-southeast-2` for Australian compliance
- **Security**: Strict CORS, required admin password hash

### Google Cloud Run Environment
- **Port**: Uses `8080` (required by Cloud Run)
- **Secrets**: Uses Secret Manager integration
- **Authentication**: Service account credentials
- **Region**: Prefers `australia-southeast1`

### Local Development Environment
- **Port**: Uses `5000` 
- **CORS**: Permissive localhost origins
- **Database**: Local PostgreSQL or Neon
- **Secrets**: Environment variables in `.env` file

## Security Classifications

### 🔴 Critical Secrets (Never in plain text)
- `SESSION_SECRET` - Session encryption key
- `ADMIN_PASSWORD_HASH` - Admin authentication
- All API keys (`OPENAI_`, `ANTHROPIC_`, `TWILIO_`, `SENDGRID_`, `TAVILY_`)
- Database credentials (`DATABASE_URL`, `PG*`)

### 🟡 Configuration Secrets (Environment-specific)
- `ALLOWED_ORIGINS` - Production domains
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - Cloud credentials
- `GOOGLE_APPLICATION_CREDENTIALS` - Service account path

### 🟢 Public Configuration (Safe to expose)
- `NODE_ENV` - Application mode
- `PORT` - Server port
- `LOG_LEVEL` - Logging verbosity
- Feature flags (`MCP_ENABLED`, `LANGMEM_ENABLED`)

## Validation Rules

### Required for Startup
```typescript
const REQUIRED_VARS = [
  'SESSION_SECRET',      // Must be 64+ characters
  'DATABASE_URL',        // Must start with 'postgresql://'
  'OPENAI_API_KEY',      // Must start with 'sk-'
  'TWILIO_ACCOUNT_SID',  // Must start with 'AC'
  'TWILIO_AUTH_TOKEN',   // Must be 32+ characters
  'TWILIO_PHONE_NUMBER'  // Must be E.164 format
];
```

### Production Additional Requirements
```typescript
const PRODUCTION_REQUIRED = [
  'ADMIN_PASSWORD_HASH',  // Must be bcrypt hash
  'ALLOWED_ORIGINS',      // Must be HTTPS URLs
  'FORCE_HTTPS',          // Must be 'true'
  'KGC_SECRET_NAME'       // AWS Secrets Manager name
];
```

### Validation Patterns
- **SESSION_SECRET**: Minimum 64 characters, no weak patterns
- **DATABASE_URL**: Valid PostgreSQL connection string
- **API Keys**: Platform-specific format validation
- **Origins**: HTTPS URLs only in production
- **Phone Numbers**: E.164 international format

## Health Check Dependencies

The `/api/health` endpoint validates:
1. **Database connectivity** - `DATABASE_URL`
2. **AI service availability** - `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`
3. **SMS service** - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
4. **Email service** - `SENDGRID_API_KEY` (if configured)
5. **Search service** - `TAVILY_API_KEY`

## Environment Loading Order
1. **AWS Secrets Manager** (production)
2. **Google Secret Manager** (GCP)
3. **Environment variables** (fallback)
4. **Default values** (where specified)

## Migration Notes

### From v1.0 to v2.0
- `ADMIN_USERNAME` deprecated → Use `ADMIN_PASSWORD_HASH` only
- `REDIS_URL` now optional → In-memory sessions supported
- `MCP_ENABLED` added → Controls tool availability
- `REDACTION_POLICY_VERSION` added → Privacy compliance tracking