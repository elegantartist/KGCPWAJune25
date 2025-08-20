# Keep Going Care (KGC) - System Overview

## Overview
Keep Going Care (KGC) is a Class I Software as a Medical Device (SaMD) healthcare platform for the Australian market, compliant with TGA regulations. It integrates AI with healthcare compliance to offer personalized patient support, care management, and intelligent health tracking through a full-stack web application. The platform aims to provide a comprehensive, secure, and user-friendly solution for managing patient care directives, daily health scores, and progress monitoring, ensuring high standards of privacy and data integrity for up to millions of users. The business vision includes providing a comprehensive, secure, and user-friendly solution for managing patient care directives, daily health scores, and progress monitoring.

## User Preferences
Preferred communication style: Simple, everyday language.
Email system: All authentication emails sent from welcome@keepgoingcare.com to authorized users.
Authorized emails: admin@keepgoingcare.com, marijke.collins@keepgoingcare.com, reuben.collins@keepgoingcare.com.
Future users: Email addresses provided by humans through admin/doctor dashboard creation workflows.
Contact information: All user contact data must be real and human-provided (no automatic generation).

## System Architecture

### UI/UX Decisions
- **Frontend**: React + TypeScript with Vite, Tailwind CSS, and shadcn/ui for a responsive, component-based single-page application.
- **Visuals**: Intentional overlay designs, semi-transparent floating buttons that become opaque on hover, enlarged buttons and icons for mobile optimization, vertical carousels with motivational messages, and consistent metallic blue branding.
- **User Flow**: Simplified daily score submission, personalized welcome messages, professional KGC PWA landing page for authentication, and clear feature recommendations.

### Technical Implementations
- **Frontend**: Tanstack Query for data fetching, component-based architecture.
- **Backend**: Express.js REST API with Node.js 20, session-based authentication with RBAC, modular service architecture, and middleware for request processing.
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM for type-safe operations, Redis for session/caching (Redis can be optional).
- **Authentication**: Multi-role support (doctors, patients, admins), SMS-based verification via Twilio, secure JWT tokens, rate limiting, and robust session management.
- **Data Management**: Care Plan Directives (CPDs), Daily Self-Scores (patientScores for official submissions, healthMetrics for real-time tracking), Patient Progress Reports (PPRs), and health metrics tracking.
- **AI Integration**:
    - **Multi-AI Provider Support**: OpenAI GPT-4o and Anthropic Claude 3.7 Sonnet.
    - **Privacy Protection Agent**: Anonymizes PII before external AI processing.
    - **True MCP (Model Context Protocol) Architecture**: Patient features as server-side tools with client-side host agent coordination.
    - **Legacy Memory-Context-Planning System**: Maintained for Supervisor Agent/Chatbot UI.
    - **CBT and MI Integration**: All MCP tools incorporate Cognitive Behavioral Therapy and Motivational Interviewing techniques.
    - **AI-Powered Features (MCP Tools)**: Includes `health-metrics`, `inspiration-machine-d`, `mbp-wizard`, `food-database`, `ew-support`, `progress-milestones`, `care-plan-directives`, `journaling`, `motivational-imaging`.
    - **Emergency Detection**: Safety keyword monitoring across all AI tools.
- **Privacy & Security**: Healthcare data anonymization, environment-aware security configuration, audit logging, encryption service, and input sanitization. Comprehensive security hardening addressing authentication, authorization, input validation, password security, error handling, IDOR protection, rate limiting, security headers, client-side security, emergency detection, account security, and role assignment.

### System Design Choices
- **Hierarchical User Management**: Supports 1 Admin, 10 Doctors, 50 Patients (extensible to millions) with SMS authentication and data segregation. New unlimited UIN format (KGC-ADM-001, KGC-DOC-001, KGC-PAT-001) for scalable user identification.
- **Modular Design**: Separation of concerns with dedicated services and components for various functionalities.
- **Scalability**: Designed for large user bases with unlimited UIN scaling, robust database, and AWS-ready deployment.
- **Compliance**: TGA Class I SaMD and HIPAA compliance through audit logging, data protection, and secure architecture.
- **Real-time Synchronization**: CPDs automatically update when doctors modify them.
- **Safety Protocols**: Comprehensive content validation and blacklisting for AI-generated content (e.g., videos) to ensure appropriateness.

## External Dependencies

### Third-Party Services
- **Twilio**: SMS verification and communication.
- **SendGrid**: Email delivery service.
- **OpenAI API**: GPT-4o for AI responses.
- **Anthropic API**: Claude 3.7 Sonnet for AI responses.
- **Neon Database**: Serverless PostgreSQL hosting.
- **Redis**: Session storage and caching.

### Development Tools (Integrated)
- **Vite**: Frontend build tool and development server.
- **Drizzle Kit**: Database schema management and migrations.
- **ESBuild**: Server-side TypeScript compilation.
- **TypeScript**: Type safety across the entire application.

## Recent Changes
- August 20, 2025: P13 KNOWLEDGE CARDS COMPLETE - Custom GPT Integration Documentation Created
  * KNOWLEDGE CARDS: 8 comprehensive cards totaling 139KB optimized for Custom GPT consumption
  * CARD STRUCTURE: Sitemap/Stack, C4 Architecture, Domain/Schemas, API Contracts, Agent Spec, Privacy Compliance, Env Vars, Migration Playbook
  * SIZE OPTIMIZATION: All cards under 100KB limit (9KB-25KB range) with outline/table format preference
  * INDEX SYSTEM: Complete cross-reference matrix with usage guide and healthcare compliance notes
  * CUSTOM GPT READY: Documentation structured for AI assistant knowledge base integration
- August 20, 2025: P12 OPERATIONAL DOCUMENTATION COMPLETE - Security, Compliance, and Operations Runbooks Created
  * OPERATIONS RUNBOOKS: Comprehensive incident response, rollback procedures, key rotation, and support playbooks
  * DATA RETENTION POLICY: Australian healthcare compliance with 7-year retention, user export/deletion procedures
  * SECURITY CHECKLIST: Complete OWASP Top 10 implementation, secrets management, audit logging, and dependency policies
  * HEALTHCARE COMPLIANCE: TGA Class I SaMD boundaries, Australian Privacy Principles, and emergency detection protocols
  * MONITORING FRAMEWORK: Audit log expectations, security alerting thresholds, and healthcare-specific compliance tracking
- August 20, 2025: P11 MIGRATION PLAN COMPLETE - Comprehensive Monorepo Restructuring Guide Created
  * MIGRATION STRATEGY: 8-phase systematic migration plan from current structure to monorepo workspaces  
  * ASSISTED MOVE PROMPTS: Reusable prompt templates for each migration phase with specific requirements
  * PHASE BREAKDOWN: Detailed steps for Frontend→apps/web, API→services/api, Agents→packages/shared, Data→packages/shared
  * ROLLBACK STRATEGY: Emergency rollback procedures and validation checkpoints for safe migration
  * HEALTHCARE COMPLIANCE: Maintained TGA Class I SaMD boundaries and Australian Privacy Principles throughout migration
  * SUCCESS CRITERIA: Clear technical and compliance metrics for validating successful migration completion
- August 20, 2025: P10 INFRASTRUCTURE SCRIPTS COMPLETE - Development and Deployment Automation Created
  * DEVELOPMENT AUTOMATION: Complete dev_all.sh script with environment validation, dependency installation, and service startup
  * GITHUB INTEGRATION: push_to_github.sh script with git configuration, commit automation, and healthcare compliance checks
  * AWS DEPLOYMENT: deploy_aws.sh script supporting CDK, SAM, Terraform, and direct App Runner deployments with ap-southeast-2 region
  * INFRASTRUCTURE DOCUMENTATION: Comprehensive guide covering local development setup, AWS deployment, and healthcare compliance monitoring
  * EXECUTABLE SCRIPTS: All scripts made executable and ready for immediate use in development workflows
- August 20, 2025: P9 DEPLOYMENT WORKFLOWS COMPLETE - GitHub Actions CI/CD Pipelines Created
  * VERCEL DEPLOYMENT: Complete frontend deployment pipeline with preview/production environments
  * AWS DEPLOYMENT: Backend services deployment workflow with OIDC authentication and App Runner integration
  * HEALTHCARE COMPLIANCE: Australian data residency enforcement and TGA Class I SaMD validation in CI/CD
  * SECRETS MANAGEMENT: Secure handling of API keys and credentials through GitHub Secrets and AWS integration
  * AUTOMATED TESTING: Pre-deployment validation with healthcare-specific compliance checks