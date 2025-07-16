# KGC End-to-End Testing with Cypress

This directory contains comprehensive E2E tests for the Keep Going Care (KGC) application.

## Test Structure

### Test Files
- `01-login-flow.cy.ts` - Authentication and login functionality
- `02-admin-user-creation.cy.ts` - Admin dashboard user management
- `03-patient-daily-scores.cy.ts` - Patient daily score submission
- `04-enhanced-chatbot.cy.ts` - AI chatbot integration
- `05-doctor-dashboard.cy.ts` - Doctor dashboard functionality

## Prerequisites

### 1. Backend Server Running
```bash
cd server
npm run dev
```

### 2. Frontend Development Server Running
```bash
cd client
npm run dev
```

### 3. Database Seeded with Test Data
```bash
cd server
npm run seed:quick
```

This creates test accounts:
- **Admin**: admin@kgc.com / admin123
- **Doctor**: sarah.johnson@kgc.com / doctor123  
- **Patient**: john.smith@example.com / patient123

## Running Tests

### Interactive Mode (Recommended for Development)
```bash
npm run test:e2e:open
```
Opens Cypress GUI where you can run individual tests and see real-time execution.

### Headless Mode (CI/CD)
```bash
npm run test:e2e
```
Runs all tests in headless mode and generates reports.

### Individual Test Files
```bash
npx cypress run --spec "cypress/e2e/01-login-flow.cy.ts"
npx cypress run --spec "cypress/e2e/02-admin-user-creation.cy.ts"
npx cypress run --spec "cypress/e2e/03-patient-daily-scores.cy.ts"
npx cypress run --spec "cypress/e2e/04-enhanced-chatbot.cy.ts"
npx cypress run --spec "cypress/e2e/05-doctor-dashboard.cy.ts"
```

## Test Coverage

### Authentication & Authorization
- ✅ Admin login/logout
- ✅ Doctor login/logout  
- ✅ Patient login/logout
- ✅ Invalid credential handling
- ✅ Role-based dashboard redirection

### Admin Dashboard
- ✅ User management interface
- ✅ Doctor creation with validation
- ✅ Patient creation with doctor assignment
- ✅ User deletion and restoration
- ✅ Email format validation
- ✅ Required field validation

### Patient Experience
- ✅ Daily score submission (Diet, Exercise, Medication)
- ✅ Score interpretation and feedback
- ✅ Duplicate submission prevention
- ✅ Historical progress charts
- ✅ Badge award ceremony triggers
- ✅ AI analysis integration

### Enhanced Chatbot
- ✅ Message sending and receiving
- ✅ CPD-aligned AI responses
- ✅ Feature recommendations
- ✅ Emergency situation handling
- ✅ Conversation context maintenance
- ✅ Voice control integration
- ✅ Therapeutic response patterns (CBT/MI)
- ✅ Network error handling

### Doctor Dashboard
- ✅ Patient list with alert sorting
- ✅ Patient detail navigation
- ✅ Care Plan Directive management
- ✅ Patient Progress Report generation
- ✅ New patient creation with CPDs
- ✅ MCA program access
- ✅ Analytics and metrics
- ✅ Alert handling

## Test Data Management

### Test Accounts
The tests use predefined test accounts created by the seeding script:

```typescript
// Admin Account
email: 'admin@kgc.com'
password: 'admin123'

// Doctor Account  
email: 'sarah.johnson@kgc.com'
password: 'doctor123'

// Patient Account
email: 'john.smith@example.com'  
password: 'patient123'
```

### Dynamic Test Data
Tests create temporary data with timestamps to avoid conflicts:
- New users: `test.user.${Date.now()}@example.com`
- Temporary records are cleaned up automatically

## Data Test IDs

The tests rely on `data-testid` attributes in the UI components. Key test IDs include:

### Authentication
- `login-form`
- `email-input`
- `password-input`
- `submit-button`
- `logout-button`

### Patient Dashboard
- `chat-button`
- `daily-scores-button`
- `keep-going-button`
- `progress-chart`

### Admin Dashboard
- `create-doctor-button`
- `create-patient-button`
- `delete-user-button`
- `restore-user-button`
- `active-users-tab`
- `deleted-users-tab`

### Chatbot
- `chat-input`
- `send-button`
- `voice-button`
- `ai-message`
- `typing-indicator`
- `emergency-alert`

### Doctor Dashboard
- `patient-list`
- `patient-card`
- `alert-badge`
- `generate-ppr-button`
- `edit-cpd-button`
- `mca-link`

## Configuration

### Cypress Configuration (`cypress.config.ts`)
- Base URL: `http://localhost:5173` (Vite dev server)
- Viewport: 1280x720
- Timeouts: 10 seconds for commands and requests
- Screenshots on failure enabled
- Video recording disabled for faster execution

### Environment Variables
Test credentials are stored in `cypress.config.ts` env section:
```typescript
env: {
  adminEmail: 'admin@kgc.com',
  adminPassword: 'admin123',
  doctorEmail: 'sarah.johnson@kgc.com', 
  doctorPassword: 'doctor123',
  patientEmail: 'john.smith@example.com',
  patientPassword: 'patient123'
}
```

## Troubleshooting

### Common Issues

1. **Tests failing due to missing test data**
   - Run `npm run seed:quick` in the server directory
   - Ensure database is properly connected

2. **Timeouts on AI responses**
   - Check that OpenAI/Anthropic API keys are configured
   - Verify backend SupervisorAgent is running

3. **Element not found errors**
   - Ensure frontend components have correct `data-testid` attributes
   - Check that UI matches test expectations

4. **Authentication failures**
   - Verify test credentials match seeded data
   - Check that JWT tokens are being handled correctly

### Debug Mode
Run tests with debug output:
```bash
DEBUG=cypress:* npm run test:e2e
```

### Screenshots and Videos
Failed test screenshots are saved to `cypress/screenshots/`
Test videos (if enabled) are saved to `cypress/videos/`

## CI/CD Integration

For continuous integration, use the headless mode:
```bash
npm run test:e2e
```

This will:
- Run all tests without GUI
- Generate JUnit XML reports
- Exit with appropriate status codes
- Save screenshots of failures

## Contributing

When adding new features:
1. Add appropriate `data-testid` attributes to UI components
2. Create corresponding test cases
3. Update this README with new test coverage
4. Ensure tests pass in both interactive and headless modes

## Test Philosophy

These E2E tests focus on:
- **Critical User Journeys**: Login, core feature usage, data submission
- **Integration Points**: Frontend-backend API communication
- **Error Handling**: Network failures, validation errors, edge cases
- **Healthcare Compliance**: Emergency protocols, data privacy
- **AI Integration**: Chatbot responses, CPD alignment, therapeutic patterns

The tests simulate real user behavior and verify the complete application stack works together correctly.