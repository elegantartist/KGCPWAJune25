# KGC Healthcare Web App

## Overview
This is the main patient-facing web application for the Keep Going Care (KGC) Healthcare Platform. It provides the React-based frontend with TypeScript, including patient dashboards, doctor interfaces, and admin controls.

## Technology Stack
- **Framework**: React 18 + TypeScript + Vite
- **UI Components**: Radix UI + shadcn/ui + Tailwind CSS
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: Wouter
- **Forms**: React Hook Form + Zod validation
- **Animation**: Framer Motion
- **PWA Support**: Service Worker + Web App Manifest

## Current Implementation
The web app is currently implemented in the monorepo root under:
- `client/` - Frontend React application
- `public/` - Static assets and PWA manifest

## Migration Plan (P11)
In Phase 11, the current client code will be moved to this `apps/web/` directory with:
- `apps/web/src/` ← `client/src/`
- `apps/web/public/` ← `public/`
- `apps/web/package.json` - Web-specific dependencies
- `apps/web/vite.config.ts` - Vite configuration
- `apps/web/tsconfig.json` - Extends base config

## Deployment Target
- **Primary**: Vercel Edge Functions + CDN
- **Backup**: Netlify Functions + CDN
- **Development**: Vite dev server on port 5173

## Environment Variables
Web app uses these client-side variables (prefixed with `VITE_`):
- `VITE_API_BASE_URL` - Backend API endpoint
- `VITE_APP_ENV` - Application environment
- `VITE_ENABLE_DEBUG` - Debug mode toggle

## Features
- **Patient Dashboard**: Daily self-scores, progress tracking, badge system
- **Doctor Interface**: Patient management, Care Plan Directives (CPDs)
- **Admin Panel**: User management, system monitoring, audit trails
- **AI Chat Interface**: Supervisor Agent with healthcare boundaries
- **MCP Tools**: Health metrics, food database, exercise support, journaling
- **PWA Capabilities**: Offline support, push notifications, app-like experience

## Security & Compliance
- **Authentication**: Session-based with SMS verification
- **Privacy**: PII anonymization before external AI processing
- **Healthcare Compliance**: TGA Class I SaMD, HIPAA-aligned
- **CORS**: Restricted origins in production
- **CSP**: Content Security Policy headers

## Development
```bash
# Run development server
pnpm dev

# Type checking
pnpm type-check

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Testing
```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:coverage
```

## Bundle Analysis
```bash
# Analyze bundle size
pnpm analyze

# Check for unused dependencies
pnpm depcheck
```