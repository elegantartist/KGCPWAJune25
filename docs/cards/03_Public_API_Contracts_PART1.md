SIZE: 24891 bytes

# Knowledge Card 03: Public API Contracts

## API Overview

### Base Configuration
```typescript
Base URL: https://api.keepgoingcare.com (production)
Base URL: http://localhost:5000 (development)
API Version: v1 (implicit in routes)
Content-Type: application/json
Authentication: Session-based (httpOnly cookies)
Rate Limiting: 100 requests/15min per IP, 50 messages/day per user (AI chat)
```

### Response Format Standards
```typescript
// Success response format
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string; // ISO 8601
}

// Error response format  
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: string;
}

// Paginated response format
interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  timestamp: string;
}
```

## Authentication API

### POST /api/auth/request-sms
**Purpose**: Initiate SMS-based authentication
```typescript
// Request body
interface SMSRequestBody {
  phone: string; // E.164 format: +61412345678
}

// Response  
interface SMSRequestResponse {
  success: true;
  data: {
    message: "SMS verification code sent";
    expiresIn: 300; // 5 minutes in seconds
  };
  timestamp: string;
}

// Error responses
interface SMSRequestErrors {
  INVALID_PHONE: "Invalid phone number format";
  RATE_LIMITED: "Too many SMS requests. Try again later";
  SMS_DELIVERY_FAILED: "Failed to send SMS. Please try again";
  USER_NOT_FOUND: "No account found with this phone number";
}

// Example usage
curl -X POST https://api.keepgoingcare.com/api/auth/request-sms \
  -H "Content-Type: application/json" \
  -d '{"phone": "+61412345678"}'
```

### POST /api/auth/verify-sms  
**Purpose**: Verify SMS code and create session
```typescript
// Request body
interface SMSVerifyBody {
  phone: string;
  code: string; // 6-digit code
}

// Success response
interface SMSVerifyResponse {
  success: true;
  data: {
    user: {
      id: string;
      uin: string;
      role: 'patient' | 'doctor' | 'admin';
      firstName: string;
      lastName: string;
      email: string;
    };
    message: "Authentication successful";
  };
  timestamp: string;
}

// Error responses
interface SMSVerifyErrors {
  INVALID_CODE: "Invalid or expired verification code";
  CODE_EXPIRED: "Verification code has expired";
  MAX_ATTEMPTS: "Maximum verification attempts exceeded";
  USER_SUSPENDED: "Account is suspended";
}

// Sets httpOnly session cookie on success
// Cookie: kgc.sid=<session-id>; Path=/; HttpOnly; Secure; SameSite=Strict
```

### GET /api/auth/status
**Purpose**: Check current authentication status
```typescript
// No request body required

// Success response (authenticated)
interface AuthStatusResponse {
  success: true;
  data: {
    authenticated: true;
    user: {
      id: string;
      uin: string;
      role: 'patient' | 'doctor' | 'admin';
      firstName: string;
      lastName: string;
      email: string;
      lastLoginAt: string;
    };
  };
  timestamp: string;
}

// Response (not authenticated)
interface AuthStatusUnauthenticated {
  success: false;
  error: {
    code: "UNAUTHENTICATED";
    message: "No valid session found";
  };
  timestamp: string;
}
```

### POST /api/auth/logout
**Purpose**: Terminate current session
```typescript
// No request body required

// Success response
interface LogoutResponse {
  success: true;
  data: {
    message: "Logged out successfully";
  };
  timestamp: string;
}

// Clears session cookie and invalidates server-side session
```

## User Management API

### GET /api/users/profile
**Purpose**: Get current user's profile information
**Authorization**: Any authenticated user
```typescript
// Success response
interface UserProfileResponse {
  success: true;
  data: {
    id: string;
    uin: string;
    role: 'patient' | 'doctor' | 'admin';
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth?: string; // ISO date, patients only
    medicalLicenseNumber?: string; // doctors only
    createdAt: string;
    lastLoginAt?: string;
  };
  timestamp: string;
}

// Error responses
interface UserProfileErrors {
  UNAUTHENTICATED: "Authentication required";
  USER_NOT_FOUND: "User profile not found";
}
```

### PUT /api/users/profile
**Purpose**: Update current user's profile
**Authorization**: Any authenticated user
```typescript
// Request body (partial update allowed)
interface UpdateProfileBody {
  firstName?: string;
  lastName?: string;
  email?: string;
  dateOfBirth?: string; // ISO date, patients only
}

// Success response
interface UpdateProfileResponse {
  success: true;
  data: {
    message: "Profile updated successfully";
    user: UserProfileResponse['data'];
  };
  timestamp: string;
}

// Error responses
interface UpdateProfileErrors {
  VALIDATION_ERROR: "Invalid input data";
  EMAIL_TAKEN: "Email address already in use";
  UNAUTHORIZED_FIELD: "Cannot update this field";
}
```

### GET /api/users/patients
**Purpose**: List patients (for doctors/admins)
**Authorization**: Doctor or Admin role required
```typescript
// Query parameters
interface PatientsQueryParams {
  page?: number; // Default: 1
  limit?: number; // Default: 20, Max: 100
  search?: string; // Search by name or UIN
  status?: 'active' | 'inactive' | 'suspended';
}

// Success response
interface PatientsListResponse {
  success: true;
  data: Array<{
    id: string;
    uin: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
    lastLoginAt?: string;
    createdAt: string;
    // Healthcare summary
    recentScoreAverage?: number;
    lastScoreDate?: string;
    activeCPDCount: number;
  }>;
  pagination: PaginationMeta;
  timestamp: string;
}

// For doctors: only returns their assigned patients
// For admins: returns all patients in system
```

### POST /api/users/create
**Purpose**: Create new user account
**Authorization**: Admin role required
```typescript
// Request body
interface CreateUserBody {
  role: 'patient' | 'doctor';
  firstName: string;
  lastName: string;
  email: string;
  phone: string; // E.164 format
  dateOfBirth?: string; // Required for patients
  medicalLicenseNumber?: string; // Required for doctors
}

// Success response
interface CreateUserResponse {
  success: true;
  data: {
    message: "User created successfully";
    user: {
      id: string;
      uin: string; // Auto-generated
      role: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    };
  };
  timestamp: string;
}

// Error responses
interface CreateUserErrors {
  VALIDATION_ERROR: "Invalid input data";
  EMAIL_EXISTS: "Email already registered";
  PHONE_EXISTS: "Phone number already registered";
  MAX_USERS_REACHED: "Maximum users limit reached for this role";
}
```

## Health Data API

### GET /api/patients/:patientId/scores
**Purpose**: Retrieve daily health scores for a patient
**Authorization**: Patient (own data), Doctor (assigned patients), Admin
```typescript
// Path parameters
interface ScoresPathParams {
  patientId: string; // UUID
}

// Query parameters
interface ScoresQueryParams {
  startDate?: string; // YYYY-MM-DD format
  endDate?: string; // YYYY-MM-DD format
  limit?: number; // Default: 30, Max: 365
  sort?: 'asc' | 'desc'; // Default: desc (newest first)
}

// Success response
interface PatientScoresResponse {
  success: true;
  data: {
    patient: {
      id: string;
      uin: string;
      firstName: string;
      lastName: string;
    };
    scores: Array<{
      id: string;
      date: string; // YYYY-MM-DD
      overallScore: number; // 1-10
      energyLevel: number; // 1-10
      moodScore: number; // 1-10
      painLevel?: number; // 1-10
      sleepQuality?: number; // 1-10
      notes?: string;
      submittedAt: string; // ISO timestamp
      modifiedAt?: string;
    }>;
    summary: {
      totalEntries: number;
      averageOverallScore: number;
      currentStreak: number; // consecutive days
      lastEntryDate?: string;
    };
  };
  timestamp: string;
}

// Error responses
interface ScoresErrors {
  PATIENT_NOT_FOUND: "Patient not found";
  ACCESS_DENIED: "Cannot access this patient's data";
  INVALID_DATE_RANGE: "Invalid date range specified";
}
```

### POST /api/patients/:patientId/scores
**Purpose**: Submit daily health scores
**Authorization**: Patient (own data only)
```typescript
// Path parameters
interface SubmitScoresPathParams {
  patientId: string; // Must match authenticated user's ID
}

// Request body
interface SubmitScoresBody {
  date: string; // YYYY-MM-DD format
  overallScore: number; // 1-10, required
  energyLevel: number; // 1-10, required
  moodScore: number; // 1-10, required
  painLevel?: number; // 1-10, optional
  sleepQuality?: number; // 1-10, optional
  notes?: string; // Max 500 characters
}

// Success response
interface SubmitScoresResponse {
  success: true;
  data: {
    message: "Health scores submitted successfully";
    score: {
      id: string;
      date: string;
      overallScore: number;
      energyLevel: number;
      moodScore: number;
      painLevel?: number;
      sleepQuality?: number;
      notes?: string;
      submittedAt: string;
    };
    streak: {
      current: number;
      best: number;
    };
  };
  timestamp: string;
}

// Error responses
interface SubmitScoresErrors {
  VALIDATION_ERROR: "Invalid score values (must be 1-10)";
  DUPLICATE_ENTRY: "Scores already submitted for this date";
  FUTURE_DATE: "Cannot submit scores for future dates";
  UNAUTHORIZED: "Can only submit scores for your own account";
}

// Note: If scores exist for the date, returns 409 Conflict
// Use PUT /api/patients/:patientId/scores/:scoreId to update
```

### GET /api/patients/:patientId/progress
**Purpose**: Get patient progress analytics
**Authorization**: Patient (own data), Doctor (assigned patients), Admin
```typescript
// Path parameters
interface ProgressPathParams {
  patientId: string;
}

// Query parameters
interface ProgressQueryParams {
  period?: '7d' | '30d' | '90d' | '1y'; // Default: 30d
  metrics?: string[]; // ['overall', 'energy', 'mood', 'pain', 'sleep']
}

// Success response
interface PatientProgressResponse {
  success: true;
  data: {
    patient: {
      id: string;
      uin: string;
      firstName: string;
      lastName: string;
    };
    period: {
      startDate: string;
      endDate: string;
      daysInPeriod: number;
    };
    metrics: {
      overallScore: {
        average: number;
        trend: 'improving' | 'stable' | 'declining';
        trendPercentage: number; // +/- percentage change
        highest: number;
        lowest: number;
      };
      energyLevel: ProgressMetric;
      moodScore: ProgressMetric;
      painLevel?: ProgressMetric;
      sleepQuality?: ProgressMetric;
    };
    engagement: {
      submissionRate: number; // Percentage of days with submissions
      currentStreak: number;
      longestStreak: number;
      totalSubmissions: number;
    };
    carePlanCompliance?: {
      totalDirectives: number;
      completedDirectives: number;
      compliancePercentage: number;
    };
  };
  timestamp: string;
}

interface ProgressMetric {
  average: number;
  trend: 'improving' | 'stable' | 'declining';
  trendPercentage: number;
  highest: number;
  lowest: number;
}
```

## Care Plan Directives API

### GET /api/patients/:patientId/cpd
**Purpose**: Get care plan directives for a patient
**Authorization**: Patient (own data), Doctor (assigned patients), Admin
```typescript
// Path parameters
interface CPDPathParams {
  patientId: string;
}

// Query parameters
interface CPDQueryParams {
  status?: 'active' | 'completed' | 'paused' | 'cancelled';
  category?: 'medication_adherence' | 'exercise_routine' | 'dietary_changes' | 'mental_health_practices' | 'lifestyle_modifications' | 'monitoring_requirements' | 'follow_up_appointments';
  priority?: 'low' | 'medium' | 'high';
}

// Success response
interface CPDResponse {
  success: true;
  data: {
    patient: {
      id: string;
      uin: string;
      firstName: string;
      lastName: string;
    };
    directives: Array<{
      id: string;
      title: string;
      description: string;
      category: string;
      priority: 'low' | 'medium' | 'high';
      status: 'active' | 'completed' | 'paused' | 'cancelled';
      targetCompletionDate?: string;
      actualCompletionDate?: string;
      complianceScore?: number; // 0-100
      createdAt: string;
      updatedAt: string;
      doctor: {
        id: string;
        firstName: string;
        lastName: string;
        medicalLicenseNumber?: string;
      };
    }>;
    summary: {
      total: number;
      active: number;
      completed: number;
      overallCompliance: number; // 0-100
    };
  };
  timestamp: string;
}
```

### POST /api/patients/:patientId/cpd
**Purpose**: Create new care plan directive
**Authorization**: Doctor (assigned patients), Admin
```typescript
// Path parameters
interface CreateCPDPathParams {
  patientId: string;
}

// Request body
interface CreateCPDBody {
  title: string; // Max 200 characters
  description: string; // Max 2000 characters
  category: 'medication_adherence' | 'exercise_routine' | 'dietary_changes' | 'mental_health_practices' | 'lifestyle_modifications' | 'monitoring_requirements' | 'follow_up_appointments';
  priority: 'low' | 'medium' | 'high';
  targetCompletionDate?: string; // ISO date
}

// Success response
interface CreateCPDResponse {
  success: true;
  data: {
    message: "Care plan directive created successfully";
    directive: {
      id: string;
      title: string;
      description: string;
      category: string;
      priority: string;
      status: 'active';
      targetCompletionDate?: string;
      createdAt: string;
      createdByDoctorId: string;
    };
  };
  timestamp: string;
}

// Error responses
interface CreateCPDErrors {
  VALIDATION_ERROR: "Invalid directive data";
  PATIENT_NOT_FOUND: "Patient not found";
  MAX_DIRECTIVES: "Maximum directives limit reached for patient";
  UNAUTHORIZED: "Cannot create directives for this patient";
}
```

### PUT /api/patients/:patientId/cpd/:directiveId
**Purpose**: Update care plan directive
**Authorization**: Doctor (who created it), Admin
```typescript
// Path parameters
interface UpdateCPDPathParams {
  patientId: string;
  directiveId: string;
}

// Request body (partial update allowed)
interface UpdateCPDBody {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'active' | 'completed' | 'paused' | 'cancelled';
  targetCompletionDate?: string;
  actualCompletionDate?: string;
  complianceScore?: number; // 0-100
}

// Success response follows same format as CreateCPDResponse
```

## AI Chat API

### POST /api/chat
**Purpose**: Send message to AI and get response
**Authorization**: Any authenticated user
```typescript
// Request body
interface ChatRequestBody {
  message: string; // Max 2000 characters
  sessionId?: string; // Optional conversation session
  context?: {
    includeHealthData?: boolean; // Include recent health scores
    includeCPD?: boolean; // Include care plan directives
  };
}

// Success response
interface ChatResponse {
  success: true;
  data: {
    response: string;
    sessionId: string; // Conversation session ID
    messageId: string; // Unique message ID
    aiProvider: 'openai' | 'anthropic';
    model: string;
    tokensUsed: number;
    responseTime: number; // milliseconds
    emergency: boolean; // True if emergency keywords detected
    emergencyResources?: Array<{
      name: string;
      phone: string;
      description: string;
    }>;
    followUp?: string[]; // Suggested follow-up questions
  };
  timestamp: string;
}

// Emergency response format (when emergency keywords detected)
interface EmergencyResponse {
  success: true;
  data: {
    emergency: true;
    message: "If this is a medical emergency, please call 000 immediately.";
    resources: Array<{
      name: string;
      phone: string;
      description: string;
    }>;
    sessionId: string;
    messageId: string;
  };
  timestamp: string;
}

// Error responses
interface ChatErrors {
  MESSAGE_TOO_LONG: "Message exceeds maximum length";
  DAILY_LIMIT_EXCEEDED: "Daily message limit exceeded";
  AI_SERVICE_UNAVAILABLE: "AI service temporarily unavailable";
  INAPPROPRIATE_CONTENT: "Message contains inappropriate content";
  RATE_LIMITED: "Too many requests. Please wait before sending another message";
}

// Rate limiting: 10 messages per minute, 50 messages per day per user
```

### GET /api/chat/history
**Purpose**: Retrieve chat conversation history
**Authorization**: Any authenticated user (own conversations only)
```typescript
// Query parameters
interface ChatHistoryQueryParams {
  sessionId?: string; // Specific session, or all sessions if omitted
  limit?: number; // Default: 20, Max: 100
  page?: number; // Default: 1
  startDate?: string; // ISO date
  endDate?: string; // ISO date
}

// Success response
interface ChatHistoryResponse {
  success: true;
  data: {
    conversations: Array<{
      sessionId: string;
      messages: Array<{
        id: string;
        userMessage: string;
        aiResponse: string;
        messageType: 'health_guidance' | 'motivational_support' | 'care_plan_assistance' | 'general_wellness' | 'emergency_detection' | 'system_interaction';
        aiProvider: 'openai' | 'anthropic';
        emergencyDetected: boolean;
        createdAt: string;
      }>;
      startedAt: string;
      lastMessageAt: string;
      messageCount: number;
    }>;
  };
  pagination: PaginationMeta;
  timestamp: string;
}

// Note: Messages older than 90 days have user content anonymized for privacy
```

## Admin API

### GET /api/admin/users
**Purpose**: Get all users in system
**Authorization**: Admin role required
```typescript
// Query parameters
interface AdminUsersQueryParams {
  role?: 'patient' | 'doctor' | 'admin';
  status?: 'active' | 'inactive' | 'suspended' | 'pending_deletion';
  search?: string; // Search by name, email, or UIN
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'lastLoginAt' | 'firstName';
  sortOrder?: 'asc' | 'desc';
}

// Success response
interface AdminUsersResponse {
  success: true;
  data: {
    users: Array<{
      id: string;
      uin: string;
      role: string;
      status: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      createdAt: string;
      lastLoginAt?: string;
      // Healthcare metadata
      totalHealthScores?: number;
      lastScoreDate?: string;
      activeCPDCount?: number;
      assignedPatients?: number; // For doctors
    }>;
  };
  pagination: PaginationMeta;
  timestamp: string;
}
```

### GET /api/admin/metrics
**Purpose**: Get system performance and usage metrics
**Authorization**: Admin role required
```typescript
// Query parameters
interface MetricsQueryParams {
  period?: '24h' | '7d' | '30d' | '90d';
  metrics?: string[]; // ['users', 'health', 'ai', 'system']
}

// Success response
interface SystemMetricsResponse {
  success: true;
  data: {
    period: {
      startDate: string;
      endDate: string;
    };
    users: {
      total: number;
      active: number;
      newRegistrations: number;
      byRole: {
        patients: number;
        doctors: number;
        admins: number;
      };
    };
    health: {
      totalScoresSubmitted: number;
      dailySubmissionRate: number; // Percentage
      averageScores: {
        overall: number;
        energy: number;
        mood: number;
      };
    };
    ai: {
      totalMessages: number;
      averageResponseTime: number; // milliseconds
      emergencyDetections: number;
      providerUsage: {
        openai: number;
        anthropic: number;
      };
    };
    system: {
      uptime: number; // percentage
      averageResponseTime: number; // milliseconds
      errorRate: number; // percentage
      databaseConnections: number;
    };
  };
  timestamp: string;
}
```

## Error Handling Standards

### HTTP Status Codes
```typescript
200 OK: Successful request
201 Created: Resource created successfully
400 Bad Request: Invalid request data
401 Unauthorized: Authentication required
403 Forbidden: Insufficient permissions
404 Not Found: Resource not found
409 Conflict: Resource already exists
422 Unprocessable Entity: Validation failed
429 Too Many Requests: Rate limit exceeded
500 Internal Server Error: Server error
503 Service Unavailable: External service error
```

### Error Code Standards
```typescript
// Authentication errors
AUTH_REQUIRED: "Authentication required"
INVALID_CREDENTIALS: "Invalid phone number or verification code"
SESSION_EXPIRED: "Session has expired"
ACCOUNT_SUSPENDED: "Account is suspended"

// Authorization errors
INSUFFICIENT_PERMISSIONS: "Insufficient permissions for this action"
PATIENT_NOT_ASSIGNED: "Patient is not assigned to your care"
RESOURCE_NOT_OWNED: "Cannot access resource owned by another user"

// Validation errors
VALIDATION_FAILED: "Request validation failed"
INVALID_DATE_FORMAT: "Date must be in YYYY-MM-DD format"
SCORE_OUT_OF_RANGE: "Score values must be between 1 and 10"
MESSAGE_TOO_LONG: "Message exceeds maximum length"

// Rate limiting
RATE_LIMIT_EXCEEDED: "Too many requests"
DAILY_LIMIT_REACHED: "Daily usage limit reached"
SMS_RATE_LIMITED: "Too many SMS requests"

// External service errors
AI_SERVICE_UNAVAILABLE: "AI service temporarily unavailable"
SMS_DELIVERY_FAILED: "Failed to send SMS"
EMAIL_DELIVERY_FAILED: "Failed to send email"

// Data errors
DUPLICATE_ENTRY: "Resource already exists"
RESOURCE_NOT_FOUND: "Requested resource not found"
DATA_INTEGRITY_ERROR: "Data integrity constraint violation"
```