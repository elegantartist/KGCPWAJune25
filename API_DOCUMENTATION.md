# KGC API Documentation

This document provides comprehensive documentation for all API endpoints in the Keep Going Care (KGC) application.

## Base URL
- Development: `http://localhost:3000/api`
- Production: `https://your-domain.com/api`

## Authentication
Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## User Roles
- `admin` - System administrators
- `doctor` - Healthcare providers  
- `patient` - End users receiving care

---

## Authentication Endpoints

### Admin Login
**POST** `/auth/admin-login`

Authenticates admin users with username/password.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Admin User",
    "role": "admin",
    "status": "active"
  },
  "paymentRequired": false
}
```

**Error Responses:**
- `401` - Invalid credentials
```json
{
  "message": "Invalid admin credentials."
}
```
- `404` - Admin account not found
```json
{
  "message": "Admin account not found."
}
```

### Send SMS Verification
**POST** `/auth/send-sms`

Sends SMS verification code to user's phone.

**Request Body:**
```json
{
  "email": "user@example.com",
  "role": "patient"
}
```

**Success Response (200):**
```json
{
  "message": "Verification code sent successfully"
}
```

**Error Responses:**
- `400` - Missing required fields
```json
{
  "message": "Email and role are required."
}
```
- `404` - User not found or role mismatch
```json
{
  "message": "User not found or role mismatch."
}
```

### Verify SMS Code
**POST** `/auth/verify-sms`

Verifies SMS code and returns authentication token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 2,
    "name": "John Smith",
    "role": "patient",
    "status": "active"
  },
  "paymentRequired": false
}
```

**Error Responses:**
- `400` - Invalid or expired code
```json
{
  "message": "Invalid or expired verification code."
}
```

### Logout
**POST** `/auth/logout`

Logs out the current user.

**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

## Admin Dashboard Endpoints

### Get All Users
**GET** `/admin/users`

Returns all active users (doctors and patients).

**Headers:** `Authorization: Bearer <admin_token>`

**Success Response (200):**
```json
[
  {
    "id": 2,
    "name": "Dr. Sarah Johnson",
    "email": "sarah.johnson@kgc.com",
    "role": "doctor",
    "phoneNumber": "+61412345678",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z"
  },
  {
    "id": 3,
    "name": "John Smith",
    "email": "john.smith@example.com",
    "role": "patient",
    "phoneNumber": "+61412345679",
    "isActive": true,
    "createdAt": "2024-01-16T14:20:00Z"
  }
]
```

### Get Deleted Users
**GET** `/admin/users/deleted`

Returns all soft-deleted users.

**Headers:** `Authorization: Bearer <admin_token>`

**Success Response (200):**
```json
[
  {
    "id": 4,
    "name": "Deleted User",
    "email": "deleted@example.com",
    "role": "patient",
    "phoneNumber": "+61412345680",
    "isActive": false,
    "deletedAt": "2024-01-20T09:15:00Z"
  }
]
```

### Create Doctor
**POST** `/admin/create-doctor`

Creates a new doctor account.

**Headers:** `Authorization: Bearer <admin_token>`

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane.doe@kgc.com",
  "phone": "+61412345681"
}
```

**Success Response (201):**
```json
{
  "message": "Doctor created successfully",
  "doctor": {
    "id": 5,
    "name": "Jane Doe",
    "email": "jane.doe@kgc.com",
    "role": "doctor",
    "phoneNumber": "+61412345681",
    "isActive": true,
    "createdAt": "2024-01-21T11:00:00Z"
  },
  "welcomeEmailSent": true
}
```

**Error Responses:**
- `400` - Validation errors
```json
{
  "message": "Validation failed",
  "errors": [
    "First name is required",
    "Email must be valid"
  ]
}
```
- `409` - Email already exists
```json
{
  "message": "Email already exists"
}
```

### Create Patient
**POST** `/admin/create-patient`

Creates a new patient account.

**Headers:** `Authorization: Bearer <admin_token>`

**Request Body:**
```json
{
  "firstName": "Alice",
  "lastName": "Johnson",
  "email": "alice.johnson@example.com",
  "phone": "+61412345682",
  "assignedDoctorId": 2
}
```

**Success Response (201):**
```json
{
  "message": "Patient created successfully",
  "patient": {
    "id": 6,
    "name": "Alice Johnson",
    "email": "alice.johnson@example.com",
    "role": "patient",
    "phoneNumber": "+61412345682",
    "assignedDoctorId": 2,
    "isActive": true,
    "createdAt": "2024-01-21T12:00:00Z"
  },
  "welcomeEmailSent": true
}
```

### Delete User
**DELETE** `/admin/delete-user/:userId`

Soft deletes a user account.

**Headers:** `Authorization: Bearer <admin_token>`

**URL Parameters:**
- `userId` (integer) - ID of user to delete

**Success Response (200):**
```json
{
  "message": "User deleted successfully",
  "userId": 6
}
```

**Error Responses:**
- `404` - User not found
```json
{
  "message": "User not found"
}
```

### Restore User
**POST** `/admin/restore-user/:userId`

Restores a soft-deleted user account.

**Headers:** `Authorization: Bearer <admin_token>`

**URL Parameters:**
- `userId` (integer) - ID of user to restore

**Success Response (200):**
```json
{
  "message": "User restored successfully",
  "userId": 6
}
```

### Get Admin Statistics
**GET** `/admin/stats`

Returns system statistics for admin dashboard.

**Headers:** `Authorization: Bearer <admin_token>`

**Success Response (200):**
```json
{
  "doctorCount": 5,
  "patientCount": 20,
  "reportCount": 150
}
```

---

## Doctor Dashboard Endpoints

### Get Doctor's Patients
**GET** `/doctor/patients`

Returns patients assigned to the authenticated doctor, sorted by alert count.

**Headers:** `Authorization: Bearer <doctor_token>`

**Success Response (200):**
```json
[
  {
    "id": 3,
    "name": "John Smith",
    "email": "john.smith@example.com",
    "phoneNumber": "+61412345679",
    "alertCount": 5,
    "alerts": [
      {
        "type": "non_compliance",
        "message": "Missed daily scores for 3 days",
        "severity": "medium",
        "date": "2024-01-20T10:00:00Z"
      },
      {
        "type": "low_scores",
        "message": "Diet scores below 5 for 2 days",
        "severity": "high",
        "date": "2024-01-19T15:30:00Z"
      }
    ],
    "lastScoreDate": "2024-01-18T08:00:00Z",
    "averageScores": {
      "diet": 4.2,
      "exercise": 6.8,
      "medication": 8.1
    },
    "complianceRate": 65
  }
]
```

### Get Doctor Analytics
**GET** `/doctor/analytics`

Returns analytics and statistics for doctor dashboard.

**Headers:** `Authorization: Bearer <doctor_token>`

**Success Response (200):**
```json
{
  "totalPatients": 15,
  "activePatients": 12,
  "highRiskPatients": 3,
  "averageCompliance": 78.5,
  "complianceByCategory": {
    "diet": 72.3,
    "exercise": 81.2,
    "medication": 89.1
  },
  "recentTrends": {
    "improvingPatients": 8,
    "decliningPatients": 2,
    "stablePatients": 5
  },
  "monthlyStats": [
    {
      "month": "2024-01",
      "averageScore": 7.2,
      "complianceRate": 78.5
    }
  ]
}
```

### Get Doctor's CPDs
**GET** `/doctor/cpds`

Returns recent Care Plan Directives created by the doctor.

**Headers:** `Authorization: Bearer <doctor_token>`

**Success Response (200):**
```json
[
  {
    "id": 1,
    "patientId": 3,
    "patientName": "John Smith",
    "category": "diet",
    "directive": "Follow Mediterranean diet with reduced sodium",
    "targetValue": 8,
    "compliance": 65,
    "createdAt": "2024-01-15T10:00:00Z",
    "lastUpdated": "2024-01-18T14:30:00Z"
  },
  {
    "id": 2,
    "patientId": 3,
    "patientName": "John Smith",
    "category": "exercise",
    "directive": "30 minutes moderate exercise daily",
    "targetValue": 7,
    "compliance": 82,
    "createdAt": "2024-01-15T10:05:00Z",
    "lastUpdated": "2024-01-15T10:05:00Z"
  }
]
```

### Create Patient (Doctor)
**POST** `/doctor/create-patient`

Creates a new patient assigned to the authenticated doctor.

**Headers:** `Authorization: Bearer <doctor_token>`

**Request Body:**
```json
{
  "firstName": "Bob",
  "lastName": "Wilson",
  "email": "bob.wilson@example.com",
  "phone": "+61412345683",
  "cpds": {
    "diet": "Low-carb diet with portion control",
    "exercise": "Walking 30 minutes daily, strength training 2x/week",
    "medication": "Take metformin as prescribed, monitor blood glucose"
  }
}
```

**Success Response (201):**
```json
{
  "message": "Patient created successfully",
  "patient": {
    "id": 7,
    "name": "Bob Wilson",
    "email": "bob.wilson@example.com",
    "phoneNumber": "+61412345683",
    "assignedDoctorId": 2,
    "createdAt": "2024-01-21T13:00:00Z"
  },
  "cpdsCreated": 3,
  "welcomeEmailSent": true
}
```

### Generate Patient Progress Report
**POST** `/doctor/generate-ppr`

Generates a Patient Progress Report using AI analysis.

**Headers:** `Authorization: Bearer <doctor_token>`

**Request Body:**
```json
{
  "patientId": 3,
  "reportPeriod": "monthly"
}
```

**Success Response (200):**
```json
{
  "reportId": "ppr_123456",
  "patientId": 3,
  "patientName": "John Smith",
  "reportPeriod": "monthly",
  "generatedAt": "2024-01-21T14:00:00Z",
  "summary": {
    "overallCompliance": 68,
    "averageScores": {
      "diet": 6.2,
      "exercise": 7.1,
      "medication": 8.9
    },
    "improvementAreas": ["diet", "consistency"],
    "strengths": ["medication adherence", "exercise motivation"]
  },
  "behavioralPatterns": [
    {
      "pattern": "Lower scores on weekends",
      "frequency": "weekly",
      "impact": "negative",
      "recommendation": "Weekend meal planning support"
    }
  ],
  "aiInsights": "Patient shows strong medication adherence but struggles with dietary consistency. Recommend focusing on meal preparation strategies.",
  "cpdRecommendations": [
    {
      "category": "diet",
      "currentDirective": "Follow Mediterranean diet",
      "suggestedUpdate": "Focus on weekend meal prep and planning",
      "reasoning": "Weekend scores consistently lower"
    }
  ]
}
```

### Create/Update CPD
**POST** `/doctor/cpd`

Creates or updates a Care Plan Directive for a patient.

**Headers:** `Authorization: Bearer <doctor_token>`

**Request Body:**
```json
{
  "patientId": 3,
  "category": "diet",
  "directive": "Mediterranean diet with omega-3 supplements",
  "targetValue": 8
}
```

**Success Response (200):**
```json
{
  "message": "CPD updated successfully",
  "cpd": {
    "id": 1,
    "patientId": 3,
    "category": "diet",
    "directive": "Mediterranean diet with omega-3 supplements",
    "targetValue": 8,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-21T15:00:00Z"
  }
}
```

---

## Patient Dashboard Endpoints

### Get Patient Dashboard Data
**GET** `/patients/me/dashboard`

Returns dashboard data for authenticated patient.

**Headers:** `Authorization: Bearer <patient_token>`

**Success Response (200):**
```json
{
  "user": {
    "id": 3,
    "name": "John Smith",
    "email": "john.smith@example.com"
  },
  "todaySubmitted": false,
  "streakCount": 5,
  "badges": [
    {
      "id": 1,
      "category": "exercise",
      "level": "bronze",
      "earnedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "recentScores": [
    {
      "date": "2024-01-20",
      "diet": 7,
      "exercise": 8,
      "medication": 9
    }
  ],
  "motivationalImage": {
    "url": "/api/images/motivational/user_3.jpg",
    "uploadedAt": "2024-01-10T12:00:00Z"
  }
}
```

### Submit Daily Scores
**POST** `/patients/me/scores`

Submits daily health scores for the authenticated patient.

**Headers:** `Authorization: Bearer <patient_token>`

**Request Body:**
```json
{
  "medicationScore": 9,
  "dietScore": 7,
  "exerciseScore": 8
}
```

**Success Response (201):**
```json
{
  "message": "Scores submitted successfully",
  "scores": {
    "id": 123,
    "date": "2024-01-21",
    "medicationScore": 9,
    "dietScore": 7,
    "exerciseScore": 8,
    "averageScore": 8.0
  },
  "badgeEarned": {
    "category": "exercise",
    "level": "silver",
    "message": "Congratulations! You've earned the Silver Exercise Champion badge!"
  },
  "aiAnalysis": {
    "message": "Great improvement in your exercise score! Your consistency is paying off.",
    "recommendations": ["Continue your current exercise routine", "Consider adding strength training"]
  }
}
```

**Error Responses:**
- `409` - Already submitted today
```json
{
  "message": "Scores already submitted for today"
}
```

---

## AI Chat Endpoint

### Chat with Supervisor Agent
**POST** `/chat`

Sends a message to the AI Supervisor Agent for personalized health coaching.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "message": "I'm struggling with my diet today",
  "sessionId": "session_123456"
}
```

**Success Response (200):**
```json
{
  "message": "I understand that diet can be challenging some days. Based on your doctor's Mediterranean diet plan, here are some simple strategies that might help...",
  "interventionType": "chat",
  "urgency": "low",
  "cpdAlignment": ["diet"],
  "followUpRequired": false,
  "recommendations": [
    {
      "feature": "Inspiration Machine D",
      "reason": "Find Mediterranean diet recipes that match your preferences"
    }
  ],
  "sessionId": "session_123456",
  "timestamp": "2024-01-21T16:00:00Z"
}
```

**Emergency Response (200):**
```json
{
  "message": "I'm concerned about what you've shared. Please call 000 immediately for emergency medical assistance. Your safety is the top priority.",
  "interventionType": "doctor_alert",
  "urgency": "high",
  "emergencyProtocol": true,
  "emergencyNumber": "000",
  "followUpRequired": true,
  "sessionId": "session_123456",
  "timestamp": "2024-01-21T16:00:00Z"
}
```

**Error Responses:**
- `400` - Missing message
```json
{
  "message": "Message is required"
}
```
- `500` - AI service error
```json
{
  "message": "I'm experiencing some technical difficulties. Please try again in a moment.",
  "fallback": true
}
```

---

## User Profile Endpoints

### Get Current User
**GET** `/users/me`

Returns the authenticated user's profile information.

**Headers:** `Authorization: Bearer <token>`

**Success Response (200):**
```json
{
  "id": 3,
  "name": "John Smith",
  "email": "john.smith@example.com",
  "role": "patient",
  "phoneNumber": "+61412345679",
  "isActive": true,
  "createdAt": "2024-01-16T14:20:00Z"
}
```

### Get User Health Metrics
**GET** `/users/:userId/health-metrics`

Returns health metrics and progress data for a user.

**Headers:** `Authorization: Bearer <token>`

**URL Parameters:**
- `userId` (integer) - ID of the user

**Success Response (200):**
```json
{
  "healthProgressData": [
    {
      "date": "2024-01-21",
      "diet": 7,
      "exercise": 8,
      "medication": 9,
      "average": 8.0
    }
  ],
  "weeklyScoreData": [
    {
      "week": "2024-W03",
      "averageScore": 7.5,
      "complianceRate": 85
    }
  ],
  "activityDistributionData": {
    "diet": 72,
    "exercise": 81,
    "medication": 89
  }
}
```

---

## Error Handling

### Standard Error Response Format
All endpoints return errors in this format:

```json
{
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created successfully
- `400` - Bad request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `409` - Conflict (duplicate data)
- `500` - Internal server error

### Authentication Errors
- `401` - Token missing or invalid
- `403` - Insufficient role permissions

### Validation Errors
```json
{
  "message": "Validation failed",
  "errors": [
    "Email is required",
    "Phone number must be valid"
  ]
}
```

---

## Rate Limiting
- Most endpoints: 100 requests per minute per user
- Chat endpoint: 30 requests per minute per user
- Authentication endpoints: 10 requests per minute per IP

## Data Types

### User Object
```typescript
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'doctor' | 'patient';
  phoneNumber: string;
  isActive: boolean;
  createdAt: string; // ISO 8601 date
}
```

### Health Scores Object
```typescript
interface HealthScores {
  id: number;
  date: string; // YYYY-MM-DD format
  medicationScore: number; // 1-10
  dietScore: number; // 1-10
  exerciseScore: number; // 1-10
  averageScore: number;
}
```

### Care Plan Directive Object
```typescript
interface CarePlanDirective {
  id: number;
  patientId: number;
  category: 'diet' | 'exercise' | 'medication' | 'wellness';
  directive: string;
  targetValue: number; // 1-10
  createdAt: string; // ISO 8601 date
  updatedAt: string; // ISO 8601 date
}
```

### Badge Object
```typescript
interface Badge {
  id: number;
  category: 'exercise' | 'meal' | 'medication';
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  earnedAt: string; // ISO 8601 date
  description: string;
}
```

---

## Testing

### Test Credentials
Use these credentials for testing (created by seeding script):

**Admin:**
- Email: `admin@kgc.com`
- Password: `admin123`

**Doctor:**
- Email: `sarah.johnson@kgc.com`
- Password: `doctor123`

**Patient:**
- Email: `john.smith@example.com`
- Password: `patient123`

### Example API Calls

**Login as Admin:**
```bash
curl -X POST http://localhost:3000/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

**Get All Users (Admin):**
```bash
curl -X GET http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Submit Daily Scores (Patient):**
```bash
curl -X POST http://localhost:3000/api/patients/me/scores \
  -H "Authorization: Bearer YOUR_PATIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"medicationScore": 9, "dietScore": 7, "exerciseScore": 8}'
```

**Chat with AI (Patient):**
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer YOUR_PATIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "I need help with my diet today", "sessionId": "test_session"}'
```

---

## Notes for Developers

1. **Authentication**: All protected endpoints require a valid JWT token
2. **Role-based Access**: Endpoints are restricted by user role (admin/doctor/patient)
3. **Data Validation**: Request bodies are validated; see error responses for details
4. **AI Integration**: The `/chat` endpoint connects to the SupervisorAgent service
5. **Privacy**: PII/PHI is automatically protected in AI interactions
6. **Emergency Protocol**: The chat endpoint detects emergency situations and responds appropriately
7. **Audit Logging**: All API interactions are logged for compliance

This documentation should be updated as new endpoints are added or existing ones are modified.