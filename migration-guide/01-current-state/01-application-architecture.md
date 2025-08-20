# Application Architecture Analysis

## Overall Architecture

The current KGC application is built on a modern JavaScript stack with React frontend and Node.js backend. It follows a multi-dashboard architecture designed to support different user roles with specialized interfaces and features.

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Client Side   │      │   Server Side   │      │    Database     │
│  (React + PWA)  │◄────►│  (Node.js/Express) ◄────►│  (PostgreSQL)   │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

## Frontend Components

### Core Technologies
- **React**: JavaScript library for building the user interface
- **TypeScript**: For type safety across the application
- **Tailwind CSS**: For responsive design and styling
- **ShadCN UI**: Component library for consistent UI elements
- **Progressive Web App (PWA)**: For offline capabilities and mobile experience

### Key Dashboard Interfaces
1. **Patient Dashboard**
   - Daily health scoring interface
   - Progress charts and visualizations
   - Chatbot interface (Supervisor Agent)
   - PWA features for offline access
   - Motivational Image Processing (MIP) component

2. **Doctor Dashboard**
   - Patient list and management
   - Care Plan Directive (CPD) creation and updates
   - Progress report generation
   - Patient alert monitoring system

3. **Admin Dashboard**
   - User management (create/edit doctors and patients)
   - System statistics and monitoring
   - Feature management and configuration

### Critical Frontend Services
- **Authentication**: Simple token-based auth with localStorage storage
- **Connectivity Management**: Handles offline/online state transitions
- **WebSocket**: Real-time communication for chat and alerts
- **Query Management**: React Query for data fetching and caching
- **Form Handling**: React Hook Form with Zod validation

## Backend Components

### Core Technologies
- **Node.js**: JavaScript runtime for the server
- **Express**: Web framework for API endpoints
- **TypeScript**: For type safety and better development experience
- **Drizzle ORM**: For database interactions
- **PostgreSQL**: Relational database for persistent storage

### Key Backend Services
1. **API Layer**
   - RESTful endpoints for all application features
   - Role-based access control (basic implementation)
   - Error handling and response formatting

2. **Authentication System**
   - Simple JWT token-based authentication
   - Basic role checking (admin, doctor, patient)
   - Password hashing for security

3. **AI Integration**
   - OpenAI API integration for the Supervisor Agent
   - Context management for personalized patient interactions
   - Sub-agent dispatching system for specialized tasks

4. **Data Management**
   - CRUD operations for all entities
   - Transaction support for complex operations
   - Data validation and sanitization

## Database Schema

The PostgreSQL database has several key tables:

1. **Users**: Stores user accounts for all roles (admin, doctor, patient)
2. **Health Metrics**: Daily patient self-scores and related metadata
3. **Care Plan Directives (CPDs)**: Doctor-created care plans for patients
4. **Doctor-Patient Relationships**: Links between doctors and their patients
5. **Chat History**: Stored conversations between patients and the Supervisor Agent
6. **System Logs**: Application events and user activities

## Service Workers and PWA

The application was designed with PWA capabilities, but the Service Worker system is currently disabled due to development complexity. This affects:

1. **Offline Functionality**: Reduced capability for offline use
2. **Data Synchronization**: Challenges with syncing data after offline periods
3. **Push Notifications**: Limited ability to send notifications to users

## Authentication Flow

The current authentication flow uses a simple approach:

1. User submits credentials (username/password)
2. Server validates credentials and creates a JWT token
3. Token is returned to client and stored in localStorage
4. Token is included in API requests via Authorization header
5. Server validates token and checks user role for each protected endpoint

## Known Issues and Limitations

1. **Admin Authentication**: Issues with "Admin not found" errors during patient creation
2. **Self-Score Analysis**: Dual analysis problem between page-level code and EnhancedSupervisorAgent
3. **Service Worker Limitations**: Disabled PWA features affecting offline functionality
4. **Security Vulnerabilities**: localStorage token storage vulnerable to XSS attacks
5. **Limited Audit Logging**: Insufficient tracking of system and user activities
6. **CPD Data Retention**: Need for 7-year retention not fully implemented

## Next Steps

Based on this architecture analysis, the following areas require attention before migration:

1. Fix the admin authentication system to properly identify admin users
2. Resolve the self-score analysis conflicts to prevent duplicate processing
3. Implement a UIN-based CPD storage system for regulatory compliance
4. Prepare the authentication system for migration to AWS Cognito
5. Strengthen security practices throughout the codebase