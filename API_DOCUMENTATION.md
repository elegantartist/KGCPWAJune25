# KGC API Documentation

This document provides a comprehensive overview of the Keep Going Care (KGC) API endpoints.

## Authentication

### POST /api/auth/admin-login

Authenticates an admin user.

**Request Body:**

```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Success Response (200 OK):**

```json
{
  "accessToken": "your_jwt_token",
  "user": {
    "id": 1,
    "name": "Admin User",
    "role": "admin",
    "status": "active"
  },
  "paymentRequired": false
}
```

**Error Response (401 Unauthorized):**

```json
{
  "message": "Invalid admin credentials."
}
```

### POST /api/auth/send-sms

Sends an SMS verification code to a user.

**Request Body:**

```json
{
  "email": "user@example.com",
  "role": "patient"
}
```

**Success Response (200 OK):**

```json
{
  "message": "SMS sent successfully"
}
```

### POST /api/auth/verify-sms

Verifies an SMS code and authenticates a user.

**Request Body:**

```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "accessToken": "your_jwt_token",
  "user": {
    "id": 2,
    "name": "Test Patient",
    "email": "test.patient@example.com",
    "role": "patient",
    "status": "active"
  },
  "paymentRequired": false
}
```

### POST /api/auth/logout

Logs out the current user.

**Success Response (200 OK):**

```json
{
  "message": "Logout successful"
}
```

## User Management (Admin)

### POST /api/admin/create-doctor

Creates a new doctor.

**Request Body:**

```json
{
  "name": "Dr. Smith",
  "email": "dr.smith@example.com",
  "phoneNumber": "+1234567890"
}
```

**Success Response (200 OK):**

```json
{
  "message": "Doctor created successfully",
  "doctor": {
    "id": 3,
    "name": "Dr. Smith",
    "email": "dr.smith@example.com",
    "phoneNumber": "+1234567890",
    "role": "doctor",
    "isActive": true,
    "createdAt": "2025-07-16T12:00:00.000Z"
  },
  "uin": "DOC12345"
}
```

### POST /api/doctors/create-patient

Creates a new patient (as a doctor).

**Request Body:**

```json
{
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "phoneNumber": "+1987654321"
}
```

**Success Response (200 OK):**

```json
{
  "message": "Patient created successfully",
  "patient": {
    "id": 4,
    "userId": 5,
    "name": "Jane Doe",
    "email": "jane.doe@example.com",
    "phoneNumber": "+1987654321",
    "role": "patient"
  },
  "uin": "PAT54321"
}
```

## Data Endpoints

### GET /api/users/me

Gets the current authenticated user's data.

**Success Response (200 OK):**

```json
{
  "id": 2,
  "name": "Test Patient",
  "email": "test.patient@example.com",
  "role": "patient",
  "status": "active",
  "createdAt": "2025-07-16T10:00:00.000Z"
}
```

### GET /api/users/:userId/motivational-image

Gets the motivational image for a user.

**Success Response (200 OK):**

```json
{
  "imageData": "data:image/png;base64,..."
}
```

**Error Response (404 Not Found):**

```json
{
  "message": "No motivational image found for this user."
}
```

### POST /api/admin/clear-impersonation-patient

Clears the admin's impersonation of a patient.

**Success Response (200 OK):**

```json
{
  "message": "Patient impersonation cleared."
}
```

### POST /api/admin/set-impersonated-patient

Sets the admin's impersonation of a patient.

**Request Body:**

```json
{
  "patientIdToImpersonate": 4
}
```

**Success Response (200 OK):**

```json
{
  "message": "Impersonation context set."
}
```

### GET /api/users/:userId/health-metrics

Gets the health metrics for a user.

**Success Response (200 OK):**

```json
{
  "healthProgressData": [],
  "weeklyScoreData": [],
  "activityDistributionData": []
}
```

### GET /api/patients/me/dashboard

Gets the dashboard data for the current patient.

**Success Response (200 OK):**

```json
{
  "id": 1,
  "userId": 2,
  "user": {
    "name": "Test Patient",
    "email": "test.patient@example.com",
    "createdAt": "2025-07-16T10:00:00.000Z"
  },
  "carePlanDirectives": []
}
```

### POST /api/patients/me/scores

Submits the daily scores for the current patient.

**Request Body:**

```json
{
  "medicationScore": 8,
  "dietScore": 7,
  "exerciseScore": 9
}
```

**Success Response (200 OK):**

```json
{
  "message": "Scores submitted successfully",
  "metric": {
    "id": 1,
    "patientId": 2,
    "medicationScore": 8,
    "dietScore": 7,
    "exerciseScore": 9,
    "date": "2025-07-16T12:00:00.000Z"
  }
}
```

## Chat

### POST /api/chat

Sends a message to the supervisor agent.

**Request Body:**

```json
{
  "message": "Hello, how are you?",
  "sessionId": "some_session_id"
}
```

**Success Response (200 OK):**

```json
{
  "response": "I am doing well, thank you for asking."
}
```
