# Keep Going Care (KGC) - Class I SaMD Healthcare Platform

A comprehensive digital healthcare platform providing personalized patient support, seamless care management, and intelligent health tracking through advanced AI technology.

## 🏥 Overview

Keep Going Care is a **Class I Software as a Medical Device (SaMD)** designed for the Australian healthcare market, compliant with TGA regulations. The platform combines cutting-edge AI technology with robust healthcare compliance to deliver personalized patient care through an intuitive web-based interface.

## ✨ Key Features

### 🤖 AI-Powered Health Assistant
- Advanced chatbot with British/Australian English responses
- Contextual health guidance based on Care Plan Directives
- Cognitive behavioral therapy techniques
- Emergency detection and response protocols

### 🔐 Multi-Role Authentication
- **SMS-based authentication** via Twilio (no passwords required)
- **Doctor onboarding** with email verification and orientation
- **Patient login** with secure SMS verification
- **Admin oversight** with full system management

### 📋 Care Plan Management
- **Doctor-created Care Plan Directives (CPDs)** (max 3 per patient)
- **Real-time patient tracking** of directive compliance
- **Progress monitoring** through daily self-scores
- **Automated reporting** for healthcare providers

### 📊 Health Monitoring & Features
- **Daily Self-Scores** (targeting 8-10 range) with reward system
- **Inspiration Machine D** - Meal planning aligned with CPDs
- **MBP Wiz** - Medication price comparison via Chemist Warehouse
- **Food Database** - Australian nutritional information with FoodSwitch integration
- **Progress Milestones** - Achievement badges with monetary rewards ($100+)
- **Journaling** - Medication compliance and adherence tracking

### 🛡️ Privacy & Security
- **Patient data anonymization** before external AI processing
- **Privacy Protection Agent** maintains healthcare confidentiality
- **Session timeouts** (5 min doctors, 30 min patients)
- **Emergency monitoring** with safety keyword detection

## 🚀 Technology Stack

### Frontend
- **React.js** with TypeScript for type safety
- **Tailwind CSS** with shadcn/ui components
- **Wouter** for client-side routing
- **TanStack Query** for server state management
- **Framer Motion** for smooth animations

### Backend
- **Node.js** with Express.js framework
- **PostgreSQL** database with Drizzle ORM
- **Multiple AI providers**: OpenAI (GPT-4o), Anthropic (Claude), X.AI (Grok)
- **Twilio** for SMS authentication and notifications
- **SendGrid** for professional email communications

### Infrastructure
- **Docker** containerization ready
- **AWS deployment** configuration included
- **Environment-based** configuration management
- **Health monitoring** and automated checks

## 📦 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database access
- Required API keys (see Environment Setup)

### Installation

```bash
# Clone repository
git clone <your-repository-url>
cd keep-going-care

# Install dependencies
npm install

# Set up environment variables (copy .env.example to .env)
cp .env.example .env

# Initialize database schema
npm run db:push

# Start development server
npm run dev
```

🌐 **Application available at:** `http://localhost:5000`

## 🔧 Environment Configuration

Create `.env` file with these required variables:

```env
# Database Connection
DATABASE_URL=postgresql://user:pass@host:port/database

# AI Service Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
XAI_API_KEY=xai-...

# Communication Services
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+61...
SENDGRID_API_KEY=SG...

# Security
SESSION_SECRET=your-secure-session-secret
```

## 📁 Project Architecture

```
keep-going-care/
├── 📱 client/                    # React frontend
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/              # Application pages
│   │   ├── hooks/              # Custom React hooks
│   │   └── lib/                # Utility functions
├── 🖥️ server/                   # Express backend
│   ├── ai/                     # AI service integrations
│   ├── services/               # Healthcare business logic
│   ├── routes/                 # API endpoints
│   └── types/                  # TypeScript definitions
├── 🔄 shared/                   # Shared schemas & types
├── 📋 scripts/                  # Deployment utilities
└── 📚 migration-guide/          # Setup documentation
```

## 🗄️ Database Schema

Key healthcare data tables:

- **`users`** - Patients, doctors, admin accounts with role-based access
- **`care_plan_directives`** - Doctor-created treatment plans (Diet, Exercise, Medication)
- **`health_metrics`** - Daily self-scores and patient tracking data
- **`chat_memories`** - AI conversation context for personalized responses
- **`recommendations`** - AI-generated suggestions with outcome tracking
- **`sessions`** - Secure session management with timeout controls

## 🔌 API Endpoints

### Authentication & Security
```
POST /api/sms/send-verification     # Send SMS login code
POST /api/sms/verify-code          # Verify SMS and create session
POST /api/logout                   # Secure session termination
```

### Healthcare Management
```
GET /api/patients/:id              # Patient profile and health data
POST /api/health-metrics           # Submit daily self-scores
GET /api/care-plan-directives/:id  # Active CPDs for patient
POST /api/recommendations          # AI-generated health suggestions
```

### AI & Chat Services
```
POST /api/mcp/generate             # Generate healthcare AI responses
POST /api/chat/memory              # Manage conversation context
POST /api/emergency/detect         # Monitor for safety concerns
```

## 🚀 Deployment Options

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Docker Deployment
```bash
docker build -t kgc-healthcare .
docker run -p 5000:5000 --env-file .env kgc-healthcare
```

### AWS Cloud Deployment
```bash
# Automated AWS deployment
npm run deploy:aws

# Manual deployment with zip package
npm run package:aws
```

## 🏥 Healthcare Compliance

### Regulatory Compliance
- ✅ **TGA Class I SaMD** certification ready
- ✅ **Australian Privacy Act 1988** compliant
- ✅ **Healthcare data retention** (7-10 years by state)
- ✅ **Medical device software** standards adherence

### Privacy & Security Features
- 🔒 **Patient data anonymization** before external AI processing
- 🛡️ **Privacy Protection Agent** prevents healthcare data leakage
- ⏰ **Automatic session timeouts** for security compliance
- 🚨 **Emergency keyword monitoring** for patient safety
- 📊 **Audit logging** for healthcare compliance tracking

### Clinical Features
- 💊 **Care Plan Directives** limited to 3 per patient (regulatory requirement)
- 📈 **Daily self-scores** targeting 8-10 range for optimal outcomes
- 🎯 **Cognitive behavioral techniques** integrated into AI responses
- 🏆 **Reward system** for consistent health engagement

## 📧 Professional Communications

### Email System (SendGrid)
- **Welcome emails** for doctors and patients from `welcome@keepgoingcare.com`
- **Professional templates** with KGC branding and orientation videos
- **Automated notifications** for care plan updates and milestones

### SMS System (Twilio)
- **Secure authentication** with 6-digit verification codes
- **Emergency alerts** for healthcare providers when needed
- **Appointment reminders** and medication compliance notifications

## 🤝 Contributing

1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/healthcare-improvement`)
3. **Commit** changes (`git commit -m 'Add healthcare feature'`)
4. **Push** to branch (`git push origin feature/healthcare-improvement`)
5. **Open** Pull Request with detailed description

## 📄 License

**Proprietary Healthcare Software** - All rights reserved.

This software contains proprietary healthcare algorithms and patient management systems. Unauthorized use, reproduction, or distribution is strictly prohibited.

## 🆘 Support & Contact

### Technical Support
- **General Support**: support@keepgoingcare.com
- **Healthcare Compliance**: compliance@keepgoingcare.com
- **Emergency Technical Issues**: emergency@keepgoingcare.com

### Healthcare Provider Support
- **Doctor Onboarding**: doctors@keepgoingcare.com
- **Patient Support**: patients@keepgoingcare.com
- **Clinical Questions**: clinical@keepgoingcare.com

---

**Keep Going Care** - *Empowering healthier lifestyles through intelligent healthcare technology* 🏥💙