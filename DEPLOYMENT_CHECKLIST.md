# KGC Application - Deployment Readiness Checklist

This checklist should be reviewed before deploying the KGC application to a production environment.

## 1. Codebase & Version Control

-   [ ] All feature branches have been merged into the `main` or `release` branch.
-   [ ] The final commit has been tagged with a version number (e.g., `v1.0.0`).
-   [ ] All debugging code (`console.log`, etc.) has been removed.
-   [ ] All TypeScript errors have been resolved.
-   [ ] Code has been linted and formatted according to project standards.

## 2. Environment Configuration

-   [ ] `server/.env` file is complete with all required production variables:
    -   [ ] `DATABASE_URL`
    -   [ ] `JWT_SECRET` (a strong, unique secret)
    -   [ ] `OPENAI_API_KEY`
    -   [ ] `ANTHROPIC_API_KEY`
    -   [ ] `TAVILY_API_KEY`
    -   [ ] `SESSION_SECRET` (a strong, unique secret)
    -   [ ] `ENCRYPTION_KEY` (a 32-byte key)
    -   [ ] `NODE_ENV=production`
-   [ ] `client/.env` file is complete with all required production variables:
    -   [ ] `VITE_API_BASE_URL` (pointing to the production server)

## 3. Database

-   [ ] The production database has been provisioned and is accessible to the server.
-   [ ] Database migrations have been run and the schema is up-to-date.
-   [ ] A database backup and recovery plan is in place.
-   [ ] Initial seed data (if any, e.g., admin user) has been loaded.

## 4. Build & Compilation

-   [ ] The client-side application has been built for production (`npm run build`).
-   [ ] The server-side TypeScript code has been compiled to JavaScript.

## 5. Security

-   [ ] All dependencies have been audited for vulnerabilities (`npm audit`).
-   [ ] HTTPS is enforced for all client-server communication.
-   [ ] Security headers (e.g., CORS, CSP) are correctly configured on the server.
-   [ ] Rate limiting is in place for sensitive endpoints (e.g., login, API calls).
-   [ ] All PII/PHI handling has been reviewed against privacy policies and regulations.

## 6. Testing

-   [ ] All unit and integration tests are passing.
-   [ ] User Acceptance Testing (UAT) has been completed and signed off.
-   [ ] Browser compatibility has been tested as per `BROWSER_COMPATIBILITY.md`.
-   [ ] Performance and load testing has been conducted on key endpoints.

## 7. Monitoring & Logging

-   [ ] A logging service is in place to capture application errors and activity.
-   [ ] An uptime monitoring service is configured to alert on downtime.
-   [ ] Performance monitoring (e.g., APM) is in place for the server.

## 8. Final Checks

-   [ ] All team members have been notified of the deployment schedule.
-   [ ] A rollback plan is in place in case of deployment failure.
-   [ ] The `README.md` is up-to-date with instructions for running the project.
