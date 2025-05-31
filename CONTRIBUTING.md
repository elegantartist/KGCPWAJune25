# Contributing to Keep Going Care

Thank you for your interest in contributing to Keep Going Care, a Class I Software as Medical Device (SaMD) healthcare platform. This document provides guidelines for contributing to ensure code quality, healthcare compliance, and patient safety.

## Code of Conduct

By participating in this project, you agree to maintain:
- **Patient Privacy**: All healthcare data must be handled with utmost confidentiality
- **Code Quality**: Follow established patterns and maintain comprehensive testing
- **Regulatory Compliance**: Ensure all changes comply with TGA and healthcare regulations
- **Professional Conduct**: Maintain respectful and professional communication

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database access
- Required API keys (OpenAI, Anthropic, Twilio, SendGrid)
- Understanding of healthcare compliance requirements

### Development Setup
```bash
# Fork and clone the repository
git clone https://github.com/your-username/keep-going-care.git
cd keep-going-care

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in your API keys and database credentials

# Initialize database
npm run db:push

# Start development server
npm run dev
```

## Project Structure

### Healthcare-Specific Guidelines
- **Patient Data**: Always anonymize before external AI processing
- **Care Plan Directives**: Limited to 3 per patient per TGA requirements
- **Session Management**: Implement appropriate timeouts (5min doctors, 30min patients)
- **Emergency Detection**: Maintain safety keyword monitoring

### Code Organization
```
client/src/
├── components/           # Reusable UI components
│   ├── health/          # Health-specific components
│   ├── chatbot/         # AI assistant components
│   └── admin/           # Administrative interfaces
├── pages/               # Application pages
├── hooks/               # Custom React hooks
└── lib/                 # Utility functions

server/
├── ai/                  # AI service integrations
├── services/            # Healthcare business logic
├── routes/              # API endpoints
└── types/               # TypeScript definitions
```

## Development Guidelines

### Frontend Development
- Use TypeScript for all new components
- Follow the existing shadcn/ui pattern for UI components
- Implement proper error handling for healthcare data
- Use TanStack Query for server state management
- Ensure accessibility compliance for healthcare users

### Backend Development
- Validate all healthcare data with Zod schemas
- Implement proper error handling and logging
- Use the storage interface for all database operations
- Maintain API endpoint documentation
- Follow RESTful conventions

### Database Changes
- Use Drizzle ORM for schema management
- Run `npm run db:push` after schema changes
- Ensure proper indexing for healthcare data queries
- Maintain data integrity constraints
- Document retention policies for healthcare compliance

## Healthcare Compliance Requirements

### Privacy Protection
- Patient data must be anonymized before external AI processing
- Implement proper session timeouts and security measures
- Ensure audit logging for all healthcare data access
- Follow Australian Privacy Act 1988 requirements

### Medical Device Compliance
- Maintain TGA Class I SaMD compliance
- Document all healthcare-related algorithm changes
- Ensure proper error handling for patient safety
- Implement emergency detection and response protocols

### Data Retention
- Health data: 10 years retention
- Chat memories: 7 years retention
- Session data: 90 days retention
- Audit logs: Permanent retention

## Contribution Workflow

### 1. Issue Creation
Before starting work, create an issue describing:
- The healthcare problem being addressed
- Proposed solution approach
- Potential compliance considerations
- Impact on patient safety or privacy

### 2. Branch Naming
Use descriptive branch names:
```
feature/health-metric-tracking
bugfix/patient-session-timeout
compliance/data-anonymization
security/emergency-detection
```

### 3. Code Changes
- Write comprehensive tests for healthcare functionality
- Update documentation for API changes
- Ensure TypeScript type safety
- Follow existing code patterns and conventions

### 4. Testing Requirements
```bash
# Run all tests before submitting
npm run test

# Test database operations
npm run test:db

# Test AI service integrations
npm run test:ai

# Test healthcare compliance features
npm run test:compliance
```

### 5. Pull Request Guidelines
Your PR should include:
- Clear description of changes and healthcare impact
- Link to related issue
- Screenshots for UI changes
- Compliance checklist completion
- Test coverage for new features

## AI Service Integration

### Adding New AI Providers
When integrating new AI services:
- Implement privacy protection for patient data
- Add fallback mechanisms for service failures
- Ensure response formatting consistency
- Document new provider capabilities
- Test with healthcare-specific scenarios

### Modifying AI Prompts
Healthcare AI prompts must:
- Include safety disclaimers
- Prevent role impersonation attempts
- Maintain professional medical tone
- Follow Australian medical terminology
- Include emergency detection keywords

## Security Considerations

### Authentication & Authorization
- Implement proper role-based access control
- Use secure session management
- Enable SMS-based authentication
- Maintain audit trails for access

### Data Protection
- Encrypt sensitive healthcare data
- Implement proper backup procedures
- Use secure communication channels
- Follow OWASP security guidelines

## Documentation Standards

### Code Documentation
- Document all healthcare-specific functions
- Include compliance notes for regulatory features
- Provide examples for API endpoints
- Maintain architecture decision records

### API Documentation
- Document all endpoints with examples
- Include healthcare data schemas
- Specify authentication requirements
- Note compliance considerations

## Review Process

### Code Review Checklist
- [ ] Healthcare data properly anonymized
- [ ] Patient safety considerations addressed
- [ ] Regulatory compliance maintained
- [ ] Security best practices followed
- [ ] Performance impact assessed
- [ ] Tests passing and coverage adequate
- [ ] Documentation updated

### Healthcare Review
For healthcare-related changes, additional review includes:
- Clinical workflow validation
- Patient safety impact assessment
- Regulatory compliance verification
- Emergency scenario testing

## Deployment Guidelines

### Staging Environment
- Test all healthcare workflows thoroughly
- Validate AI service integrations
- Verify compliance features
- Check performance under load

### Production Deployment
- Follow blue-green deployment strategy
- Monitor healthcare metrics post-deployment
- Maintain rollback capabilities
- Update compliance documentation

## Community and Support

### Getting Help
- Join development discussions in issues
- Ask questions about healthcare compliance requirements
- Request clarification on medical terminology
- Seek guidance on regulatory requirements

### Reporting Issues
For healthcare-related bugs:
1. Assess patient safety impact
2. Include steps to reproduce
3. Provide relevant logs (anonymized)
4. Tag with appropriate severity level

## Recognition

Contributors who make significant healthcare improvements will be:
- Acknowledged in release notes
- Added to the contributors list
- Invited to participate in healthcare compliance reviews
- Recognized for their commitment to patient care

---

Thank you for contributing to Keep Going Care and helping improve healthcare technology for patients and providers.