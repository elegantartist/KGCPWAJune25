# Component to API Endpoint Mapping

This document maps the frontend components to the backend API endpoints they interact with.

## Admin Dashboard (`client/src/pages/admin-dashboard.tsx`)

- **GET /api/admin/doctors**: Fetches the list of doctors.
- **GET /api/admin/patients**: Fetches the list of patients.
- **POST /api/admin/create-doctor**: Creates a new doctor.
- **POST /api/admin/patients**: Creates a new patient.
- **DELETE /api/admin/users/:userId**: Deactivates a user.
- **PATCH /api/admin/users/:userId/contact**: Updates a user's contact information.
- **POST /api/doctor/mca-access**: Generates an MCA access token for a doctor.
- **POST /api/admin/assign-patient**: Assigns a patient to a doctor.

## Daily Self Scores (`client/src/pages/daily-self-scores.tsx`)

- **POST /api/patients/me/scores**: Submits the daily scores for the current patient.
- **GET /api/users/:userId/health-metrics**: Fetches the health metrics for a user.

## Enhanced Chatbot (`client/src/components/chatbot/EnhancedSupervisorAgent.tsx`)

- **POST /api/chat**: Sends a message to the supervisor agent.

## Food Database (`client/src/pages/FoodDatabasePage.tsx`)

- **GET /api/food-database/cpd-aligned**: Fetches CPD-aligned food recommendations.
- **GET /api/food-database/favourites**: Fetches the user's favorite foods.
- **POST /api/food-database/favourites/toggle**: Toggles the favorite status of a food item.

## Inspiration Machine D (`client/src/pages/inspiration-d.tsx`)

- **POST /api/recipes/videos**: Searches for cooking videos.
- **POST /api/users/:userId/saved-recipes**: Saves a recipe to the user's favorites.
- **GET /api/users/:userId/saved-recipes**: Fetches the user's saved recipes.

## Inspiration Machine E&W (`client/src/pages/inspiration-ew.tsx`)

- **POST /api/exercise-wellness/videos**: Searches for exercise and wellness videos.

## Login / Authentication

- **POST /api/auth/admin-login**: Authenticates an admin user.
- **POST /api/auth/send-sms**: Sends an SMS verification code.
- **POST /api/auth/verify-sms**: Verifies an SMS code and authenticates a user.

## Motivational Image Processor (`client/src/pages/motivation.tsx`)

- **GET /api/users/:userId/motivational-image**: Gets the motivational image for a user.

## Progress Milestones (`client/src/pages/progress-milestones.tsx`)

- **GET /api/badges/:patientId**: Fetches the badges for a patient.
- **POST /api/badges/check/:patientId**: Checks for and updates new badges for a patient.
