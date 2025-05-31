# Keep Going Care (KGC) Technical Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
   - [Multi-Dashboard Architecture](#multi-dashboard-architecture)
   - [Technology Stack](#technology-stack)
3. [Core Features](#core-features)
4. [Data Model](#data-model)
5. [User Authentication & Authorization](#user-authentication--authorization)
6. [Integration Points](#integration-points)
7. [LLM & AI Implementation](#llm--ai-implementation)
8. [Database Structure](#database-structure)
9. [API Endpoints](#api-endpoints)
10. [Frontend Components](#frontend-components)
11. [Real-time Functionality](#real-time-functionality)
12. [Offline Support](#offline-support)
13. [Security & Compliance](#security--compliance)
14. [Optimization Strategy](#optimization-strategy)
15. [Deployment Guide](#deployment-guide)

## System Overview

Keep Going Care (KGC) is a Class 1 non-diagnostic software as a medical device (SaMD) designed for personal health management. The platform employs a sophisticated multi-AI model validation approach to provide intelligent, privacy-focused wellness monitoring and personalized health recommendations.

The system is structured around three interconnected dashboards:

1. **Patient Dashboard**: The primary user-facing application for health tracking and monitoring
2. **Doctor Dashboard**: Medical professional interface for patient monitoring and care plan management
3. **Admin Dashboard**: Administrative oversight for system management and analytics

KGC utilizes a unique Unique Identity Number (UIN) system to maintain relationships between patients, doctors, and administrators while leveraging advanced AI components including a Supervisor Agent built on a Model Context Protocol (MCP) system.

## Architecture

### Multi-Dashboard Architecture

The KGC application follows a multi-dashboard architecture with shared components and services:

```
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│  Patient Dashboard │     │  Doctor Dashboard │     │  Admin Dashboard  │
└─────────┬─────────┘     └─────────┬─────────┘     └─────────┬─────────┘
          │                         │                         │
          └─────────────┬───────────┴─────────────┬───────────┘
                        │                         │
               ┌────────▼────────┐      ┌─────────▼──────────┐
               │   Shared API    │◄────►│ Shared Components  │
               └────────┬────────┘      └──────────┬─────────┘
                        │                          │
                        └──────────┬──────────────┘
                                   │
                         ┌─────────▼─────────┐
                         │      Database     │
                         └───────────────────┘
```

### Technology Stack

- **Frontend**:
  - React.js with TypeScript
  - Tailwind CSS for styling
  - shadcn/ui component library
  - TanStack React Query for data fetching
  - Progressive Web App (PWA) support

- **Backend**:
  - Express.js server
  - Drizzle ORM for database operations
  - WebSocket for real-time updates

- **Database**:
  - PostgreSQL for secure data storage
  - Optimized schema with relationship tables

- **AI Integration**:
  - OpenAI API for LLM capabilities
  - Anthropic API for additional validation
  - LangMem SDK for memory management
  - Multi-AI model validation architecture

- **Authentication & Security**:
  - JWT-based authentication
  - Role-based access control
  - HIPAA-compliant data handling

## Core Features

### Patient Dashboard

1. **Health Metrics Tracking**
   - Daily health scores for medication, diet, and exercise
   - Progress visualization with charts and trends
   - Historical data analysis

2. **Progress Milestones**
   - Customizable goals with progress tracking
   - Category-based organization (Diet, Exercise, Medication, Wellness, Engagement)
   - Offline-capable progress updates

3. **Supervisor Agent Chatbot**
   - AI-powered health assistant with memory systems
   - Care Plan Directive (CPD) aware recommendations
   - Multi-model validation for response accuracy
   - CBT/MI counseling techniques

4. **Motivational Image Processing (MIP)**
   - User-uploaded motivational image storage
   - Image analysis and sentiment extraction
   - Visual reinforcement of health goals

5. **Food Database**
   - Nutritional information lookup
   - Recipe recommendations aligned with CPDs
   - Favourites and preference tracking

6. **Emergency Alert System**
   - One-click emergency contact notification
   - Location sharing for emergency services
   - Automated doctor notification

### Doctor Dashboard

1. **Patient Management**
   - Comprehensive patient list with filtering
   - Patient assignment and relationship management
   - Patient detail views with health metrics

2. **Patient Progress Reports (PPR)**
   - Automatically generated health summaries
   - Period-based analytics on patient adherence
   - Recommendation success tracking

3. **Care Plan Directive (CPD) Management**
   - Creation and management of patient care directives
   - Category-based organization (diet, exercise, medication)
   - Target setting and progress tracking

4. **Patient Invitation System**
   - Email-based patient onboarding
   - UIN generation and assignment
   - Invitation tracking and management

### Admin Dashboard

1. **User Management**
   - Doctor and patient account oversight
   - Role assignment and permissions
   - Account activation/deactivation

2. **System Analytics**
   - Usage statistics and feature engagement
   - Patient and doctor metrics
   - Performance analytics

3. **Emergency Event Monitoring**
   - System-wide emergency notification tracking
   - Resolution status monitoring
   - Emergency response auditing

## Data Model

The KGC data model is designed for flexibility, security, and performance. Core entities include:

### Core Tables

1. **User Roles**
   - Defines system roles (admin, doctor, patient)

2. **Users**
   - Central user table with role-based configuration
   - UIN system for unique identification
   - Authentication credentials

3. **Health Metrics**
   - Daily health measurements for patients
   - Three primary domains: medication, diet, exercise
   - Timestamp-based tracking

4. **Progress Milestones**
   - Patient achievement tracking system
   - Category-based organization
   - Progression percentage and completion status

5. **Chat Memory**
   - Enhanced memory system for AI interactions
   - Multi-level memory types (short-term, medium-term, long-term)
   - Memory system classification (semantic, procedural, episodic)

6. **Care Plan Directives (CPD)**
   - Doctor-assigned care instructions
   - Categorized by health domain
   - Active/inactive status tracking

### Relationship Tables

1. **Doctor-Patient Relationships**
   - Links doctors to their patients
   - Assignment tracking with timestamps
   - Active status for current relationships

2. **Patient Invitations**
   - Tracks invitations sent to new patients
   - Token-based authentication for registration
   - Status tracking (pending, accepted, expired)

### Content Tracking Tables

1. **User Content Preferences**
   - Tracks patient content interests for personalization
   - Weighted preference system
   - Content type categorization

2. **User Favourites**
   - Saves patient-favoured content
   - Validation against CPDs for relevance
   - Metadata storage for rich display

3. **Content Interactions**
   - Tracks all user interactions with content
   - Multiple interaction types (view, favourite, dislike)
   - Timestamp-based engagement tracking

## User Authentication & Authorization

### Authentication Flow

1. **Registration Process**
   - Doctor-initiated patient invitation
   - UIN-based registration system
   - Role-specific registration flows

2. **Login System**
   - Secure credential verification
   - JWT token issuance with expiration
   - Refresh token mechanism

3. **Session Management**
   - Secure cookie storage for authentication tokens
   - Inactivity timeout and forced re-authentication
   - Cross-device session tracking

### Authorization System

1. **Role-Based Access Control**
   - Three primary roles: admin, doctor, patient
   - Permission sets for API endpoints and UI components
   - Feature access control based on role

2. **Data Access Control**
   - Doctor access limited to assigned patients
   - Patient data isolation and privacy controls
   - Admin oversight with audit logging

## Integration Points

### Third-Party API Integrations

1. **OpenAI API**
   - Core LLM capabilities for Supervisor Agent
   - Primary response generation
   - Content validation

2. **Anthropic Claude API**
   - Secondary validation model
   - Enhanced response for complex medical queries
   - Cross-validation with OpenAI

3. **Tavily API**
   - Content search and retrieval
   - Personalized recommendations
   - CPD-aligned information gathering

### Internal System Integrations

1. **WebSocket System**
   - Real-time health metric updates
   - Doctor-patient communication
   - Emergency alert propagation

2. **File System Integration**
   - Image storage and retrieval
   - Document management
   - Secure media handling

## LLM & AI Implementation

### Supervisor Agent Architecture

The Supervisor Agent is the central AI component using a sophisticated Model Context Protocol (MCP) system:

```
┌───────────────────────────┐
│    Supervisor Agent       │
│  ┌───────────────────┐    │
│  │   Context Manager │    │
│  └────────┬──────────┘    │
│           │               │
│  ┌────────▼──────────┐    │
│  │   Memory Systems  │    │
│  └────────┬──────────┘    │
│           │               │
│  ┌────────▼──────────┐    │
│  │ Model Coordinator │    │
│  └────────┬──────────┘    │
│           │               │
└───────────┼───────────────┘
            │
┌───────────▼───────────────┐
│      Model Processors     │
│ ┌──────────┐ ┌──────────┐ │
│ │  OpenAI  │ │ Anthropic│ │
│ └──────────┘ └──────────┘ │
└───────────────────────────┘
```

### Memory Systems

1. **LangMem SDK Implementation**
   - Semantic memory for factual knowledge
   - Episodic memory for user interactions
   - Procedural memory for action patterns

2. **Memory Retrieval System**
   - Importance-based retrieval
   - Context-aware memory access
   - Temporal decay mechanisms

3. **Memory Storage**
   - Database persistence for long-term memory
   - In-memory caching for active sessions
   - Expiration system for outdated information

### Multi-Model Validation

1. **Response Generation**
   - Primary model (OpenAI) generates initial response
   - Secondary model (Anthropic) validates medical accuracy
   - Conflict resolution for contradictory outputs

2. **Response Scoring**
   - Confidence scoring for model outputs
   - User feedback incorporation
   - Adaptive response selection

3. **Model Selection Strategy**
   - Query classification for appropriate model routing
   - Fallback mechanisms for API failures
   - Cost optimization through selective model usage

## Database Structure

### Schema Diagram

The PostgreSQL database uses a comprehensive schema with proper indexing and relationships:

```
users (id, uin, name, email, role_id, phone_number, joined_date, username, password, is_active, last_login)
  ↑
  ├── user_roles (id, name, description, created_at)
  ↓
health_metrics (id, user_id, date, medication_score, diet_score, exercise_score)
  
motivational_images (id, user_id, image_data, created_at, updated_at)
  
care_plan_directives (id, user_id, directive, category, target_value, active, created_at, updated_at)
  
feature_usage (id, user_id, feature_name, usage_count, last_used, created_at)
  
chat_memory (id, user_id, memory_system, type, content, context, importance, 
              embeddings, last_accessed, access_count, expires_at, created_at)
  
recommendations (id, user_id, directive_id, recommended_feature, alternative_features, 
                reasoning_text, was_followed, score_before_recommendation, 
                score_after_recommendation, created_at)
  
progress_milestones (id, user_id, title, description, category, progress, completed,
                    target_date, completed_date, icon_type, created_at, updated_at,
                    last_synced_at, local_uuid)
  
doctor_patients (id, doctor_id, patient_id, assigned_date, active, notes, last_reviewed)
  
patient_progress_reports (id, patient_id, created_by_id, report_date, report_period_start_date,
                        report_period_end_date, avg_medication_score, avg_diet_score,
                        avg_exercise_score, keep_going_button_usage_count, chat_sentiment_score,
                        chat_sentiment_analysis, feature_usage_summary, recommendation_success,
                        system_recommendations, new_cpd_suggestions, doctor_notes, shared)
  
patient_invitations (id, email, doctor_id, uin, token, sent_date, expires_date, 
                    accepted_date, status)
  
emergency_events (id, patient_id, doctor_id, event_time, event_type, trigger_reason,
                patient_location, resolved, resolved_time, notes)
  
admin_activity_log (id, admin_id, activity_type, description, timestamp)
  
user_content_preferences (id, user_id, content_type, keyword, weight, created_at, updated_at)
  
user_favorites (id, user_id, content_type, content_url, content_title, content_description,
              image_url, metadata, validation_score, is_valid, created_at)
  
content_interactions (id, user_id, content_type, content_url, interaction_type, created_at)
```

### Indexing Strategy

The database employs a strategic indexing approach:

1. **Primary Keys**
   - Auto-incrementing IDs for all tables

2. **Foreign Keys**
   - Proper references with cascading updates/deletes where appropriate
   - Index on all foreign key columns

3. **Composite Indexes**
   - Multiple-column indexes for common query patterns
   - Optimized for join operations

4. **Performance Indexes**
   - Date-based indexes for time-series data
   - Text indexes for search operations
   - Unique indexes for constraint enforcement

## API Endpoints

The KGC API follows a RESTful design pattern with proper versioning and documentation:

### Authentication Endpoints

```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh-token
POST /api/auth/logout
GET  /api/auth/user
```

### Patient Dashboard Endpoints

```
GET  /api/health-metrics/user/:userId
POST /api/health-metrics
GET  /api/health-metrics/latest/user/:userId

GET  /api/progress-milestones/user/:userId
POST /api/progress-milestones
PATCH /api/progress-milestones/:id

GET  /api/motivational-image/user/:userId
POST /api/motivational-image
PATCH /api/motivational-image/user/:userId

GET  /api/chat/memories/user/:userId
POST /api/chat/memory
DELETE /api/chat/memories/expired

GET  /api/care-plan/directives/user/:userId
GET  /api/care-plan/directives/active/user/:userId

POST /api/feature-usage/:userId/:featureName
GET  /api/feature-usage/most-used/:userId

POST /api/emergency/alert
```

### Doctor Dashboard Endpoints

```
GET  /api/doctor/patients/:doctorId
GET  /api/doctor/patient/:patientId/metrics
POST /api/doctor/directive
PATCH /api/doctor/directive/:id
DELETE /api/doctor/directive/:id

POST /api/doctor/invite
GET  /api/doctor/invitations/:doctorId
PATCH /api/doctor/invitation/:id

GET  /api/doctor/reports/patient/:patientId
POST /api/doctor/report
PATCH /api/doctor/report/:id/share
```

### Admin Dashboard Endpoints

```
GET  /api/admin/doctors
GET  /api/admin/patients
POST /api/admin/user/activate/:id
POST /api/admin/user/deactivate/:id
GET  /api/admin/stats
GET  /api/admin/emergency-events
PATCH /api/admin/emergency-event/:id/resolve
```

### Food Database Endpoints

```
GET  /api/food-database/search?query=:query
GET  /api/food-database/favourites/:userId
POST /api/food-database/favourite
DELETE /api/food-database/favourite/:userId/:url
POST /api/food-database/interaction
```

## Frontend Components

The KGC frontend utilizes a component-based architecture with a focus on reusability and performance:

### Shared Components

1. **HealthMetricsDisplay**
   - Reusable component for displaying health scores
   - Supports loading states, compact view, and customization
   - Used across multiple dashboards

2. **ProgressMilestones**
   - Milestone management and display component
   - Filterable by category with creation interface
   - Offline-capable with synchronization

3. **SupervisorAgent**
   - Chat interface for AI interaction
   - Memory-aware conversation component
   - CPD-informed response system

4. **UserProfileCard**
   - Consistent user information display
   - Role-based information presentation
   - Avatar and contact details

5. **NavigationSystem**
   - Role-based navigation menu
   - Mobile-responsive design
   - Active state tracking

### Dashboard-Specific Components

1. **Patient Dashboard**
   - DailyHealthTracker
   - MotivationalImageUploader
   - EmergencyAlertButton
   - FoodSearchInterface

2. **Doctor Dashboard**
   - PatientListView
   - CarePlanEditor
   - PatientInvitationManager
   - ProgressReportGenerator

3. **Admin Dashboard**
   - UserManagementInterface
   - SystemStatisticsDisplay
   - EmergencyEventMonitor
   - ActivityLogViewer

## Real-time Functionality

KGC implements WebSocket-based real-time functionality for critical features:

### WebSocket Architecture

```
┌────────────────┐       ┌────────────────┐
│   Client       │◄─────►│   WebSocket    │
│   Application  │       │   Server       │
└────────────────┘       └───────┬────────┘
                                │
                       ┌────────▼────────┐
                       │ Event Processor │
                       └────────┬────────┘
                                │
                       ┌────────▼────────┐
                       │    Database     │
                       └─────────────────┘
```

### Real-time Features

1. **Emergency Alerts**
   - Immediate notification to doctors
   - Real-time status updates
   - Location tracking

2. **Health Metric Updates**
   - Live dashboard updates
   - Real-time score calculation
   - Trend visualization

3. **Doctor-Patient Communication**
   - Instant messaging capability
   - Read receipts
   - Typing indicators

4. **Notification System**
   - System alerts and updates
   - CPD reminder notifications
   - Report availability alerts

## Offline Support

KGC implements a robust offline capability system:

### Offline Architecture

```
┌────────────────────┐
│ Service Worker     │
│ ┌────────────────┐ │
│ │ Cache Strategy │ │
│ └────────────────┘ │
└─────────┬──────────┘
          │
┌─────────▼──────────┐
│ IndexedDB          │
│ ┌────────────────┐ │
│ │ Offline Store  │ │
│ └────────────────┘ │
└─────────┬──────────┘
          │
┌─────────▼──────────┐
│ Sync Manager       │
│ ┌────────────────┐ │
│ │ Background     │ │
│ │ Synchronization│ │
│ └────────────────┘ │
└────────────────────┘
```

### Offline-Capable Features

1. **Progress Milestone Updates**
   - Local storage for offline changes
   - Background synchronization when online
   - Conflict resolution strategy

2. **Health Metrics Recording**
   - Offline data entry
   - Local storage with timestamp
   - Automatic synchronization

3. **Chat Interaction**
   - Cached responses for common queries
   - Message queuing for offline messages
   - History retention across sessions

4. **Content Access**
   - Cached food database entries
   - Pre-downloaded favourite content
   - Offline reading mode

## Security & Compliance

As a Class 1 SaMD, KGC implements comprehensive security measures:

### Security Implementation

1. **Data Encryption**
   - TLS for all data in transit
   - Database encryption for sensitive data
   - Secure storage for authentication tokens

2. **Authentication Security**
   - Password hashing with bcrypt
   - Secure token handling
   - Anti-brute force measures

3. **Audit Logging**
   - Comprehensive activity tracking
   - Security event logging
   - Access control verification

### HIPAA Compliance

1. **PHI Protection**
   - Data minimization principles
   - Access controls for protected information
   - Consent management system

2. **Breach Protection**
   - Intrusion detection systems
   - Automated vulnerability scanning
   - Regular security audits

3. **Compliance Documentation**
   - Privacy policy implementation
   - Terms of service
   - Data processing agreements

## Optimization Strategy

KGC implements performance optimization at multiple levels:

### Frontend Optimization

1. **Code Splitting**
   - Route-based bundle splitting
   - Component lazy loading
   - Critical CSS path optimization

2. **Component Optimization**
   - React.memo for expensive components
   - useMemo and useCallback for performance
   - Virtualized lists for large datasets

3. **Asset Optimization**
   - Image compression and responsive loading
   - Font subsetting and optimization
   - Efficient caching strategy

### Backend Optimization

1. **Query Optimization**
   - Efficient SQL query patterns
   - Prepared statements
   - Result set limiting and pagination

2. **Caching Strategy**
   - In-memory caching for frequent data
   - Response caching for static content
   - Query result caching

3. **API Efficiency**
   - Request batching support
   - Optimized response payloads
   - Compression for large responses

### Database Optimization

1. **Schema Design**
   - Normalized structure for flexibility
   - Strategic denormalization for performance
   - Efficient column types and constraints

2. **Index Strategy**
   - Covered indexes for common queries
   - Statistical analysis for index creation
   - Regular index maintenance

3. **Connection Pooling**
   - Optimized pool size
   - Connection reuse
   - Timeout configuration

## Deployment Guide

KGC is designed for secure, scalable deployment:

### Infrastructure Requirements

1. **Hosting Environment**
   - Node.js runtime (v16+)
   - PostgreSQL database (v14+)
   - HTTPS-enabled web server
   - WebSocket support

2. **External Services**
   - OpenAI API access
   - Anthropic API access
   - Email delivery service
   - Cloud storage (optional)

3. **Scaling Considerations**
   - Horizontal scaling for web servers
   - Database replication strategy
   - Load balancing configuration

### Deployment Process

1. **Environment Setup**
   - Configuration via environment variables
   - Database initialization and migration
   - Schema verification

2. **Build Process**
   - Frontend asset compilation
   - Server-side code transpilation
   - Dependency optimization

3. **Deployment Strategy**
   - Blue-green deployment support
   - Rollback capability
   - Zero-downtime updates

### Monitoring & Maintenance

1. **Health Monitoring**
   - API endpoint monitoring
   - Database performance tracking
   - Error rate alerting

2. **Usage Analytics**
   - User activity tracking
   - Feature engagement metrics
   - Performance benchmarking

3. **Update Management**
   - Versioned API strategy
   - Database migration planning
   - Client-side update notifications

---

This document provides a comprehensive overview of the Keep Going Care (KGC) application architecture, features, and implementation details. For further information or specific implementation questions, please refer to the codebase or contact the development team.