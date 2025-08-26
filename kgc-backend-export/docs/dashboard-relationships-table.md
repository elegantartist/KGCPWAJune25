# KGC Dashboard Relationships Table & User Management Rules

## User Hierarchy Structure

### Total System Users: 51
- **1 Admin (X1)** - Super user managing the entire system
- **10 Doctors (A-J)** - Each managing 5 patients
- **50 Patients (A1-J5)** - Distributed across doctors

## Dashboard Relationships Table

| User ID | UIN | Name | Role | Phone | Doctor Letter | Patient Number | Created By | Dashboard Access |
|---------|-----|------|------|--------|---------------|----------------|------------|-----------------|
| 1 | X1 | Admin User | admin | +61400000001 | null | null | null | Admin Dashboard |
| 2 | A | Doctor A | doctor | +61400000002 | A | null | 1 (X1) | Doctor Dashboard |
| 3 | B | Doctor B | doctor | +61400000003 | B | null | 1 (X1) | Doctor Dashboard |
| 4 | C | Doctor C | doctor | +61400000004 | C | null | 1 (X1) | Doctor Dashboard |
| 5 | D | Doctor D | doctor | +61400000005 | D | null | 1 (X1) | Doctor Dashboard |
| 6 | E | Doctor E | doctor | +61400000006 | E | null | 1 (X1) | Doctor Dashboard |
| 7 | F | Doctor F | doctor | +61400000007 | F | null | 1 (X1) | Doctor Dashboard |
| 8 | G | Doctor G | doctor | +61400000008 | G | null | 1 (X1) | Doctor Dashboard |
| 9 | H | Doctor H | doctor | +61400000009 | H | null | 1 (X1) | Doctor Dashboard |
| 10 | I | Doctor I | doctor | +61400000010 | I | null | 1 (X1) | Doctor Dashboard |
| 11 | J | Doctor J | doctor | +61400000011 | J | null | 1 (X1) | Doctor Dashboard |
| 12 | A1 | Patient A1 | patient | +61400000012 | A | 1 | 2 (Doctor A) | Patient Dashboard |
| 13 | A2 | Patient A2 | patient | +61400000013 | A | 2 | 2 (Doctor A) | Patient Dashboard |
| 14 | A3 | Patient A3 | patient | +61400000014 | A | 3 | 2 (Doctor A) | Patient Dashboard |
| 15 | A4 | Patient A4 | patient | +61400000015 | A | 4 | 2 (Doctor A) | Patient Dashboard |
| 16 | A5 | Patient A5 | patient | +61400000016 | A | 5 | 2 (Doctor A) | Patient Dashboard |
| 17 | B1 | Patient B1 | patient | +61400000017 | B | 1 | 3 (Doctor B) | Patient Dashboard |
| 18 | B2 | Patient B2 | patient | +61400000018 | B | 2 | 3 (Doctor B) | Patient Dashboard |
| 19 | B3 | Patient B3 | patient | +61400000019 | B | 3 | 3 (Doctor B) | Patient Dashboard |
| 20 | B4 | Patient B4 | patient | +61400000020 | B | 4 | 3 (Doctor B) | Patient Dashboard |
| 21 | B5 | Patient B5 | patient | +61400000021 | B | 5 | 3 (Doctor B) | Patient Dashboard |
| 22 | C1 | Patient C1 | patient | +61400000022 | C | 1 | 4 (Doctor C) | Patient Dashboard |
| 23 | C2 | Patient C2 | patient | +61400000023 | C | 2 | 4 (Doctor C) | Patient Dashboard |
| 24 | C3 | Patient C3 | patient | +61400000024 | C | 3 | 4 (Doctor C) | Patient Dashboard |
| 25 | C4 | Patient C4 | patient | +61400000025 | C | 4 | 4 (Doctor C) | Patient Dashboard |
| 26 | C5 | Patient C5 | patient | +61400000026 | C | 5 | 4 (Doctor C) | Patient Dashboard |
| 27 | D1 | Patient D1 | patient | +61400000027 | D | 1 | 5 (Doctor D) | Patient Dashboard |
| 28 | D2 | Patient D2 | patient | +61400000028 | D | 2 | 5 (Doctor D) | Patient Dashboard |
| 29 | D3 | Patient D3 | patient | +61400000029 | D | 3 | 5 (Doctor D) | Patient Dashboard |
| 30 | D4 | Patient D4 | patient | +61400000030 | D | 4 | 5 (Doctor D) | Patient Dashboard |
| 31 | D5 | Patient D5 | patient | +61400000031 | D | 5 | 5 (Doctor D) | Patient Dashboard |
| 32 | E1 | Patient E1 | patient | +61400000032 | E | 1 | 6 (Doctor E) | Patient Dashboard |
| 33 | E2 | Patient E2 | patient | +61400000033 | E | 2 | 6 (Doctor E) | Patient Dashboard |
| 34 | E3 | Patient E3 | patient | +61400000034 | E | 3 | 6 (Doctor E) | Patient Dashboard |
| 35 | E4 | Patient E4 | patient | +61400000035 | E | 4 | 6 (Doctor E) | Patient Dashboard |
| 36 | E5 | Patient E5 | patient | +61400000036 | E | 5 | 6 (Doctor E) | Patient Dashboard |
| 37 | F1 | Patient F1 | patient | +61400000037 | F | 1 | 7 (Doctor F) | Patient Dashboard |
| 38 | F2 | Patient F2 | patient | +61400000038 | F | 2 | 7 (Doctor F) | Patient Dashboard |
| 39 | F3 | Patient F3 | patient | +61400000039 | F | 3 | 7 (Doctor F) | Patient Dashboard |
| 40 | F4 | Patient F4 | patient | +61400000040 | F | 4 | 7 (Doctor F) | Patient Dashboard |
| 41 | F5 | Patient F5 | patient | +61400000041 | F | 5 | 7 (Doctor F) | Patient Dashboard |
| 42 | G1 | Patient G1 | patient | +61400000042 | G | 1 | 8 (Doctor G) | Patient Dashboard |
| 43 | G2 | Patient G2 | patient | +61400000043 | G | 2 | 8 (Doctor G) | Patient Dashboard |
| 44 | G3 | Patient G3 | patient | +61400000044 | G | 3 | 8 (Doctor G) | Patient Dashboard |
| 45 | G4 | Patient G4 | patient | +61400000045 | G | 4 | 8 (Doctor G) | Patient Dashboard |
| 46 | G5 | Patient G5 | patient | +61400000046 | G | 5 | 8 (Doctor G) | Patient Dashboard |
| 47 | H1 | Patient H1 | patient | +61400000047 | H | 1 | 9 (Doctor H) | Patient Dashboard |
| 48 | H2 | Patient H2 | patient | +61400000048 | H | 2 | 9 (Doctor H) | Patient Dashboard |
| 49 | H3 | Patient H3 | patient | +61400000049 | H | 3 | 9 (Doctor H) | Patient Dashboard |
| 50 | H4 | Patient H4 | patient | +61400000050 | H | 4 | 9 (Doctor H) | Patient Dashboard |
| 51 | H5 | Patient H5 | patient | +61400000051 | H | 5 | 9 (Doctor H) | Patient Dashboard |
| 52 | I1 | Patient I1 | patient | +61400000052 | I | 1 | 10 (Doctor I) | Patient Dashboard |
| 53 | I2 | Patient I2 | patient | +61400000053 | I | 2 | 10 (Doctor I) | Patient Dashboard |
| 54 | I3 | Patient I3 | patient | +61400000054 | I | 3 | 10 (Doctor I) | Patient Dashboard |
| 55 | I4 | Patient I4 | patient | +61400000055 | I | 4 | 10 (Doctor I) | Patient Dashboard |
| 56 | I5 | Patient I5 | patient | +61400000056 | I | 5 | 10 (Doctor I) | Patient Dashboard |
| 57 | J1 | Patient J1 | patient | +61400000057 | J | 1 | 11 (Doctor J) | Patient Dashboard |
| 58 | J2 | Patient J2 | patient | +61400000058 | J | 2 | 11 (Doctor J) | Patient Dashboard |
| 59 | J3 | Patient J3 | patient | +61400000059 | J | 3 | 11 (Doctor J) | Patient Dashboard |
| 60 | J4 | Patient J4 | patient | +61400000060 | J | 4 | 11 (Doctor J) | Patient Dashboard |
| 61 | J5 | Patient J5 | patient | +61400000061 | J | 5 | 11 (Doctor J) | Patient Dashboard |

## Dashboard Relationship Rules

### Rule 1: Admin Dashboard (X1)
- **Access Level**: Full system administration
- **Can Create**: Doctor users (A-J)
- **Can Manage**: All users in the system
- **Can Reassign**: Patients from one doctor to another
- **Authentication**: Twilio SMS to registered phone number
- **Dashboard Features**:
  - Create/edit/deactivate doctor accounts
  - Reassign patients between doctors
  - System monitoring and analytics
  - Feature management and configuration

### Rule 2: Doctor Dashboard (A-J)
- **Access Level**: Manage assigned patients only
- **Can Create**: Patient users (numbered 1-5 with their letter prefix)
- **Can Manage**: Their assigned patients only
- **Cannot Access**: Other doctors' patients or admin functions
- **Authentication**: Twilio SMS to registered phone number
- **Dashboard Features**:
  - Create/edit patient accounts (max 5 per doctor)
  - Create/update Care Plan Directives (CPDs) for their patients
  - Generate Patient Progress Reports (PPRs) for their patients
  - Review patient health scores and engagement metrics

### Rule 3: Patient Dashboard (A1-J5)
- **Access Level**: Personal health management only
- **Can Access**: Own health data and features
- **Cannot Access**: Other patients' data or administrative functions
- **Authentication**: Twilio SMS to registered phone number
- **Dashboard Features**:
  - Daily self-scoring (medication, diet, exercise)
  - MCP-powered health assistant chatbot
  - Health tracking and progress visualization
  - Access to all patient features (MIP, Inspiration Machines, etc.)

## Data Segregation Rules

### Rule 4: CPD Data Flow
1. **Doctor creates CPDs** for each patient (max 3 CPDs per patient)
2. **CPDs are fed into patient's AI system** for personalized recommendations
3. **Patient interactions generate data** (self-scores, chat sentiment, feature usage)
4. **PPR system compiles patient data** for doctor review
5. **Doctor receives PPR** and can update CPDs based on insights
6. **Cycle repeats** to optimize patient health outcomes

### Rule 5: Data Access Restrictions
- **Patients can only see**: Their own health data, CPDs, and progress
- **Doctors can only see**: Their assigned patients' data and PPRs
- **Admin can see**: System-wide analytics but not detailed patient health data (HIPAA compliance)

### Rule 6: Authentication Flow
1. User enters phone number on login screen
2. System identifies user role and dashboard access based on phone number
3. Twilio sends SMS verification code
4. User enters code and gains access to their specific dashboard
5. No passwords required - SMS-only authentication for all 51 users

## Workflow Integration

### Patient → Doctor Workflow
1. Patient completes daily self-scores
2. Patient interacts with MCP chatbot (guided by CPDs)
3. System analyzes: scores + chat sentiment + feature usage + CPD compliance
4. Doctor requests PPR for specific patient
5. AI generates comprehensive PPR with improvement recommendations
6. Doctor reviews PPR and updates patient's CPDs if needed
7. Updated CPDs immediately flow back to patient's AI system

### Admin → Doctor → Patient Workflow
1. Admin creates doctor account (assigns letter A-J)
2. Doctor creates patient accounts (assigns numbers 1-5 with their letter)
3. Doctor creates initial CPDs for each patient
4. Patient begins health journey with personalized AI guidance
5. Admin can reassign patients between doctors if needed
6. All relationships tracked in dashboard_relationships table

This structure ensures complete data segregation while maintaining the therapeutic relationship flow between patients and their assigned doctors.