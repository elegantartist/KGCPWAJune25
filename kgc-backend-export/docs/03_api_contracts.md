# API Contracts Documentation

## Overview

This document provides comprehensive API contract specifications for the Keep Going Care (KGC) Healthcare Platform. The API follows REST principles with JSON payloads and implements a session-based authentication system with role-based access control.

## Table of Contents

1. [API Standards](#api-standards)
2. [Authentication & Authorization](#authentication--authorization)
3. [Rate Limiting & Security](#rate-limiting--security)
4. [Error Handling](#error-handling)
5. [Event Schemas](#event-schemas)
6. [API Groups](#api-groups)
7. [Integration Patterns](#integration-patterns)
8. [Compliance & Audit](#compliance--audit)

## API Standards

### Base URL Structure
- **Production**: `https://kgcpwa-june-25-admin1023.replit.app`
- **Development**: `http://localhost:3000`
- **API Prefix**: All endpoints use `/api` prefix

### Content Type
- **Request**: `application/json`
- **Response**: `application/json`
- **Character Encoding**: UTF-8

### HTTP Methods
- `GET`: Retrieve resources
- `POST`: Create new resources
- `PUT`: Update entire resources
- `PATCH`: Partial updates (used for milestone sync)
- `DELETE`: Remove resources (limited use for security)

### Response Format
All API responses follow a consistent structure:

```json
{
  "success": true,
  "data": {},
  "pagination": {},
  "errors": [],
  "timestamp": "2025-08-20T10:30:00Z"
}
```

## Authentication & Authorization

### Session-Based Authentication
The API uses HTTP-only cookies for session management:

```http
Cookie: connect.sid=s%3A<session-id>
```

### Role-Based Access Control (RBAC)
- **Admin (Role ID: 1)**: Full system access, user management
- **Doctor (Role ID: 2)**: Patient management, report generation
- **Patient (Role ID: 3)**: Own data access, health tracking

### Authentication Flow
1. **SMS Verification** (Patients): Send code → Verify code → Session creation
2. **Email/Password** (Doctors/Admins): Credential validation → Session creation
3. **Session Validation**: Every request validates session and role permissions

### Permission Matrix

| Resource | Admin | Doctor | Patient |
|----------|-------|--------|---------|
| User Management | Full | Assigned Patients | Own Profile |
| Care Plan Directives | Full | Create/Update | Read Only |
| Health Metrics | View All | Assigned Patients | Own Data |
| AI Chat | Monitor | Patient Context | Full Access |
| Reports | All Reports | Generated Reports | Own Reports |

## Rate Limiting & Security

### Rate Limiting Rules
- **Authentication**: 5 attempts per 15 minutes per IP
- **SMS Verification**: 3 codes per hour per phone number
- **API Calls**: 1000 requests per hour per user
- **Chat Messages**: 60 messages per hour per user

### Security Headers
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

### Input Validation
- **Zod Schema Validation**: All request bodies validated
- **SQL Injection Protection**: Parameterized queries only
- **XSS Prevention**: Input sanitization and output encoding
- **CSRF Protection**: Session-based CSRF tokens

## Error Handling

### Standard Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request data |
| 401 | `UNAUTHORIZED` | Authentication required |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 429 | `RATE_LIMITED` | Rate limit exceeded |
| 500 | `INTERNAL_ERROR` | Server error |

### Error Response Format
```json
{
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "email",
    "received": "invalid-email",
    "expected": "valid email format"
  },
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "INVALID_EMAIL"
    }
  ],
  "timestamp": "2025-08-20T10:30:00Z"
}
```

### Healthcare-Specific Errors
- `DAILY_SUBMISSION_LIMIT`: Health scores already submitted today
- `CPD_ACCESS_DENIED`: Cannot access other patient's care plan directives
- `EMERGENCY_DETECTED`: Emergency keywords detected in chat
- `COMPLIANCE_VALIDATION_FAILED`: CPD compliance check failed

## Event Schemas

The API publishes events for real-time features and audit logging. Events are defined in separate schema files:

### Core Events
- **User Events**: `events/user-events.json`
- **Health Events**: `events/health-events.json`
- **Chat Events**: `events/chat-events.json`
- **Alert Events**: `events/alert-events.json`
- **Audit Events**: `events/audit-events.json`

### Event Structure
```json
{
  "eventId": "uuid-v4",
  "eventType": "health_metric_submitted",
  "userId": 123,
  "timestamp": "2025-08-20T10:30:00Z",
  "data": {
    "metricId": 456,
    "scores": {
      "diet": 8,
      "exercise": 7,
      "medication": 9
    }
  },
  "metadata": {
    "source": "patient_dashboard",
    "userAgent": "Mozilla/5.0...",
    "ipAddress": "10.0.0.1"
  }
}
```

## API Groups

### 1. Authentication APIs (`/api/auth`)
- Session management and user authentication
- SMS verification for patients
- Role-based login flows

**Key Endpoints:**
- `POST /api/auth/login` - User login
- `POST /api/auth/sms/send` - Send SMS verification
- `POST /api/auth/sms/verify` - Verify SMS code
- `GET /api/auth/status` - Check auth status

### 2. User Management APIs (`/api/users`)
- User CRUD operations with role restrictions
- Profile management
- UIN (User Identification Number) system

**Key Endpoints:**
- `GET /api/users` - List users (Admin/Doctor)
- `POST /api/users` - Create user (Admin only)
- `GET /api/users/{userId}` - Get user profile
- `PUT /api/users/{userId}` - Update user profile

### 3. Health Metrics APIs (`/api/users/{userId}/health-metrics`)
- Daily self-score submission with 24-hour enforcement
- Health trend analysis
- Compliance tracking

**Key Endpoints:**
- `POST /api/users/{userId}/health-metrics` - Submit daily scores
- `GET /api/users/{userId}/health-metrics` - Get health history
- `GET /api/users/{userId}/health-metrics/latest` - Get latest scores

### 4. Care Plan Directive APIs (`/api/care-plan-directives`)
- Medical directive management
- Doctor-created patient care plans
- Compliance monitoring

**Key Endpoints:**
- `POST /api/care-plan-directives` - Create CPD (Doctor/Admin)
- `GET /api/care-plan-directives` - List CPDs
- `PUT /api/care-plan-directives/{cpdId}` - Update CPD
- `PUT /api/care-plan-directives/{cpdId}/deactivate` - Deactivate CPD

### 5. AI Chat APIs (`/api/supervisor-agent`, `/api/chat`)
- AI-powered health conversations
- Emergency keyword detection
- Feature recommendations

**Key Endpoints:**
- `POST /api/supervisor-agent/chat` - Chat with AI
- `GET /api/chat/messages` - Get chat history
- `POST /api/chat/messages` - Save chat message

### 6. MCP (Model Context Protocol) Tool APIs (`/api/mcp`)
- AI tool integrations with healthcare focus
- Privacy-compliant AI processing
- CBT/MI therapeutic techniques

**Key Endpoints:**
- `POST /api/mcp/health-metrics` - Health metrics analysis tool
- `POST /api/mcp/inspiration-machine-d` - Cooking videos and inspiration
- `POST /api/mcp/care-plan-directives` - CPD analysis tool
- `POST /api/mcp/food-database` - Australian food standards tool

### 7. Progress Tracking APIs (`/api/users/{userId}/progress-milestones`)
- Patient milestone management
- Offline-first synchronization
- Achievement tracking

**Key Endpoints:**
- `GET /api/users/{userId}/progress-milestones` - Get milestones
- `POST /api/users/{userId}/progress-milestones` - Create milestone
- `PATCH /api/users/{userId}/progress-milestones/sync` - Sync milestones

### 8. Doctor Report APIs (`/api/doctor`)
- Patient Progress Report (PPR) generation
- Health snapshots and analytics
- Doctor dashboard data

**Key Endpoints:**
- `POST /api/doctor/reports` - Generate PPR
- `GET /api/doctor/reports` - List reports
- `GET /api/doctor/health-snapshots/{patientId}` - Get health snapshots

### 9. Content Search APIs (`/api/content`, `/api/recipes`)
- Tavily-powered health content search
- Recipe search and analysis
- Local service discovery

**Key Endpoints:**
- `POST /api/content/search` - Search health content
- `POST /api/recipes/search` - Search recipes
- `POST /api/recipes/analyze` - Analyze recipe nutrition

### 10. Alert System APIs (`/api/doctor/{doctorId}/alerts`, `/api/alerts`)
- Patient alert management for doctors
- Emergency notifications
- Alert resolution tracking

**Key Endpoints:**
- `GET /api/doctor/{doctorId}/alerts` - Get doctor alerts
- `GET /api/doctor/{doctorId}/alerts/count` - Get alert count
- `PUT /api/alerts/{alertId}/read` - Mark alert as read
- `PUT /api/alerts/{alertId}/resolve` - Resolve alert

## Integration Patterns

### 1. Offline-First Architecture
The API supports offline-first patterns for critical features:

```typescript
// Progress milestone sync pattern
PATCH /api/users/{userId}/progress-milestones/sync
{
  "localMilestones": [
    {
      "localUuid": "client-generated-uuid",
      "title": "Walk 30 minutes daily",
      "updatedAt": "2025-08-20T10:00:00Z",
      // ... other fields
    }
  ]
}
```

**Response includes conflict resolution:**
```json
{
  "synced": {
    "created": [...],
    "updated": [...],
    "unchanged": [...]
  },
  "allMilestones": [...]
}
```

### 2. Real-Time Features
- **Server-Sent Events**: For real-time notifications
- **WebSocket Support**: Planned for chat features
- **Push Notifications**: Via service workers

### 3. AI Integration Pattern
All AI tools follow the MCP (Model Context Protocol) pattern:

```typescript
// Generic MCP tool request
POST /api/mcp/{tool-name}
{
  "userId": 123,
  "action": "analyze_compliance",
  "parameters": {
    "category": "diet",
    "includeHistory": true
  }
}
```

**Response includes privacy compliance:**
```json
{
  "success": true,
  "data": {
    "analysis": "...",
    "recommendations": [...]
  },
  "privacyCompliant": true,
  "auditLogged": true,
  "emergencyDetected": false
}
```

### 4. Pagination Pattern
Large datasets use cursor-based pagination:

```typescript
GET /api/users?limit=50&offset=0

Response:
{
  "users": [...],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 150,
    "hasMore": true
  }
}
```

### 5. Search Pattern
Health content search with filtering:

```typescript
POST /api/content/search
{
  "query": "diabetes-friendly recipes",
  "contentType": "youtube_recipes",
  "maxResults": 10,
  "userId": 123,
  "dietType": "low-carb",
  "mealType": "dinner"
}
```

## Compliance & Audit

### HIPAA/TGA Compliance Features
- **Audit Logging**: All data access logged with user, timestamp, action
- **PII Protection**: Personal information redacted before AI processing
- **Data Minimization**: Only necessary data included in responses
- **Encryption**: All data encrypted in transit and at rest

### Audit Event Types
- `DATA_ACCESS`: User data accessed
- `DATA_MODIFICATION`: User data modified
- `AI_INTERACTION`: AI tool usage
- `EMERGENCY_DETECTION`: Emergency keywords detected
- `ADMIN_ACTION`: Administrative actions
- `LOGIN_ATTEMPT`: Authentication attempts

### Privacy Protection
The API implements privacy-first design:

1. **PII Redaction**: Personal information anonymized before AI processing
2. **Role-Based Data Access**: Users can only access authorized data
3. **Session Security**: HTTP-only cookies with secure flags
4. **IP Logging**: Request IP addresses logged for security
5. **Data Retention**: Automatic cleanup of expired data

### Australian Compliance
- **Medicare Number Validation**: 10-digit format validation
- **AHPRA Registration**: Doctor registration format validation
- **Australian Phone Numbers**: +61 format validation
- **TGA Class I SaMD**: Non-diagnostic scope maintained

## Sample Integration

### Complete User Journey Example

```typescript
// 1. Patient SMS Authentication
POST /api/auth/sms/send
{
  "phoneNumber": "+61412345678"
}

// 2. Verify SMS Code
POST /api/auth/sms/verify
{
  "phoneNumber": "+61412345678",
  "code": "123456"
}

// 3. Submit Daily Health Scores
POST /api/users/123/health-metrics
{
  "dietScore": 8,
  "exerciseScore": 7,
  "medicationScore": 9,
  "notes": "Felt good today, followed meal plan"
}

// 4. Chat with AI Assistant
POST /api/supervisor-agent/chat
{
  "message": "I'm struggling with my diet plan",
  "userId": 123
}

// 5. Get Care Plan Directives
GET /api/care-plan-directives?userId=123&active=true

// 6. Use MCP Food Database Tool
POST /api/mcp/food-database
{
  "userId": 123,
  "action": "get_recommendations",
  "filterByCPD": true
}
```

## Conclusion

The KGC API provides a comprehensive, secure, and compliant interface for healthcare data management. The design prioritizes:

- **Security**: Session-based auth with RBAC
- **Privacy**: PII protection and audit logging
- **Compliance**: TGA/HIPAA requirements
- **Usability**: Consistent patterns and clear error handling
- **Scalability**: Efficient pagination and caching
- **AI Integration**: Privacy-compliant AI tools

For complete API specifications, refer to the OpenAPI 3.1 specification in `openapi/openapi.yaml`.

---

**Document Version**: 2.0.0  
**Last Updated**: August 20, 2025  
**Next Review**: September 20, 2025