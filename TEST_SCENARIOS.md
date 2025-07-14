# KGC Application - User Acceptance Test (UAT) Scenarios

This document outlines key test scenarios for the KGC application from the perspective of each user role.

## 1. Patient Workflow

**Objective:** To ensure a new patient can successfully onboard, use the core features, and track their progress.

| # | Scenario | Steps | Expected Result |
|---|---|---|---|
| 1.1 | **Successful Registration & Onboarding** | 1. Receive welcome email. <br> 2. Click registration link. <br> 3. Complete profile setup. <br> 4. Log in for the first time. | User is logged in and sees the main patient dashboard. |
| 1.2 | **Log Daily Scores** | 1. Navigate to "Daily Self-Scores". <br> 2. Adjust sliders for Diet, Exercise, and Medication. <br> 3. Click "Submit". | Scores are saved. A confirmation appears. The historical chart updates. |
| 1.3 | **Interact with AI Supervisor** | 1. Open the Chat feature. <br> 2. Ask a question related to a CPD (e.g., "What are some good low-carb snacks?"). <br> 3. Ask a question about a non-authorized feature (e.g., "Can you book a doctor's appointment for me?"). | 2. The AI provides a relevant, safe, and CPD-aligned answer. <br> 3. The AI politely declines and states it can only discuss the 13 authorized features. |
| 1.4 | **Use "Keep Going" Sequence** | 1. Navigate to the dashboard. <br> 2. Click the "Keep Going" button. | The motivational image, calming video, and breathing exercise sequence begins. |
| 1.5 | **Upload Motivational Image** | 1. Go to the "Motivation" feature. <br> 2. Upload a new image. <br> 3. (Optional) Apply the "Enhance with Stars" effect. <br> 4. Save the image. | The new (enhanced) image is saved and appears in the "Keep Going" sequence. |
| 1.6 | **Earn a Progress Milestone** | 1. Log consistently high scores (e.g., 8+) for two consecutive weeks. | A celebratory pop-up appears announcing the new badge. The "Progress Milestones" page updates to show the earned badge. |
| 1.7 | **Emergency Expression** | 1. In the chat, type a message indicating a medical emergency (e.g., "I think I'm having a heart attack"). | The AI immediately responds with a message instructing the user to call Triple Zero (000) and disengages. |

## 2. Doctor Workflow

**Objective:** To ensure a doctor can manage their patients, set care plans, and monitor progress effectively.

| # | Scenario | Steps | Expected Result |
|---|---|---|---|
| 2.1 | **Invite a New Patient** | 1. Log in to the Doctor Dashboard. <br> 2. Navigate to "Invite Patient". <br> 3. Fill in the patient's details and send the invite. | The patient receives a welcome email with a registration link. The invitation appears in the doctor's "pending invites" list. |
| 2.2 | **Create/Update a Care Plan Directive (CPD)** | 1. Select a patient from the patient list. <br> 2. Go to the "Care Plan" section. <br> 3. Add a new directive (e.g., "Walk 30 minutes daily"). <br> 4. Save the CPD. | The CPD is saved and becomes active for the patient. The AI Supervisor for that patient will now incorporate this new directive. |
| 2.3 | **Request a Patient Progress Report (PPR)** | 1. Select a patient. <br> 2. Click "Request PPR". | A PPR is generated, showing the patient's recent score trends, feature usage, chat sentiment, and other key metrics. |
| 2.4 | **Review Patient Data** | 1. From the dashboard, view the list of assigned patients. <br> 2. Click on a patient to see their latest scores and activity. | The doctor can view up-to-date, relevant health data for the selected patient. |

## 3. Admin Workflow

**Objective:** To ensure an administrator can manage system users and maintain the application.

| # | Scenario | Steps | Expected Result |
|---|---|---|---|
| 3.1 | **Create a New Doctor Account** | 1. Log in to the Admin Dashboard. <br> 2. Navigate to "Create Doctor". <br> 3. Fill in the doctor's details and save. | The doctor account is created. The doctor receives a welcome email and can now log in. |
| 3.2 | **View System Users** | 1. Navigate to the "Users" section. <br> 2. Filter by role (e.g., "Doctor", "Patient"). | A list of all users matching the filter is displayed. |
| 3.3 | **Deactivate a User Account** | 1. Find a user in the user list. <br> 2. Click the "Deactivate" button. | The user's account is marked as inactive and they can no longer log in. |
