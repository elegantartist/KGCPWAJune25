# cPanel Web Hosting Setup

This section provides comprehensive instructions for deploying the KGC application frontend using cPanel web hosting, with particular emphasis on secure connectivity between the frontend and backend systems.

## Contents

1. [cPanel Account Setup](./01-cpanel-account-setup.md)
2. [Frontend Deployment](./02-frontend-deployment.md)
3. [Security Configuration](./03-security-configuration.md)
4. [Frontend-Backend Integration](./04-frontend-backend-integration.md)
5. [User Experience Optimization](./05-user-experience-optimization.md)

## Overview

cPanel is a popular web hosting control panel that provides a graphical interface and automation tools to simplify the process of hosting websites. For the KGC application, we'll use cPanel to host the frontend while connecting securely to the AWS-hosted backend services.

The system architecture follows this pattern:

```
User -> www.keepgoingcare.com (cPanel) -> API Gateway -> AWS Backend Services
                                       -> AWS Cognito (Authentication)
```

## Security Architecture Overview

The KGC application employs a layered security approach that ensures robust protection while maintaining an excellent user experience:

1. **End-to-End Encryption**: All data transmitted between the user's browser and backend services is encrypted using TLS 1.3.

2. **Token-Based Authentication**: Secure JWT tokens with short expiration times and refresh capabilities manage user sessions.

3. **Cross-Origin Protection**: The application uses strict CORS policies to prevent unauthorized domains from accessing the API.

4. **Content Security Policy**: CSP headers restrict resource loading to trusted domains only.

5. **Data Validation**: Client and server-side validation ensures data integrity and prevents injection attacks.

6. **Least Privilege Access**: Each component operates with the minimal permissions necessary.

## User Experience Design Principles

The security implementation follows these key UX principles:

1. **Security by Design**: Security measures are integrated into the UX flow rather than added as obstacles.

2. **Progressive Disclosure**: Security complexity is hidden from users until needed.

3. **Streamlined Authentication**: Authentication flows are designed to minimize user friction while maximizing security.

4. **Transparent Security**: Users are informed about security measures in clear, non-technical language.

5. **Fail Secure**: Error states default to secure options without compromising usability.

## Prerequisites

Before proceeding with cPanel setup, ensure you have:

- Access to a cPanel hosting account with the keepgoingcare.com domain
- Login credentials for the cPanel account
- The optimized frontend build files prepared for deployment
- API endpoints for the AWS backend services
- SSL certificate ready for the domain (or ability to generate one via Let's Encrypt)

## Next Steps

Begin with [cPanel Account Setup](./01-cpanel-account-setup.md) to configure your cPanel hosting account.