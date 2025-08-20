# KGC Shared Package

## Overview
Shared TypeScript types, utilities, configurations, and schemas used across all KGC Healthcare Platform applications and services. This package ensures consistency and type safety throughout the monorepo.

## Technology Stack
- **TypeScript**: Shared type definitions
- **Zod**: Runtime validation schemas
- **Drizzle ORM**: Database schema definitions
- **Date-fns**: Date utility functions
- **Class Variance Authority**: Utility class management

## Current Implementation
Shared code is currently implemented in the monorepo root under:
- `shared/` - Database schemas, types, and utilities

## Migration Plan (P11)
In Phase 11, the current shared code will be moved to this `packages/shared/` directory with:
- `packages/shared/src/` ← `shared/`
- `packages/shared/package.json` - Shared package dependencies
- `packages/shared/tsconfig.json` - Extends base config

## Package Structure (Future)
```
packages/shared/src/
├── types/                 # TypeScript type definitions
│   ├── api.ts            # API request/response types
│   ├── auth.ts           # Authentication types
│   ├── health.ts         # Health data types
│   └── index.ts          # Re-exports
├── schemas/              # Database and validation schemas
│   ├── database.ts       # Drizzle ORM schemas
│   ├── validation.ts     # Zod validation schemas
│   └── index.ts          # Re-exports
├── utils/                # Utility functions
│   ├── date.ts           # Date formatting utilities
│   ├── validation.ts     # Data validation helpers
│   ├── encryption.ts     # Privacy/security utilities
│   └── index.ts          # Re-exports
├── config/               # Configuration constants
│   ├── constants.ts      # Application constants
│   ├── environments.ts   # Environment configurations
│   └── index.ts          # Re-exports
└── index.ts              # Main package exports
```

## Key Exports

### Database Schemas
```typescript
// Drizzle ORM table definitions
export { users, patientScores, carePlanDirectives } from './schemas/database';

// Zod schemas for validation
export { 
  insertUserSchema, 
  selectUserSchema, 
  updatePatientScoreSchema 
} from './schemas/validation';

// Type inference from schemas
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
```

### API Types
```typescript
// Authentication
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
}

// Health Data
export interface HealthMetric {
  id: number;
  patientId: number;
  date: Date;
  scores: {
    diet: number;
    exercise: number;
    medication: number;
    mood: number;
  };
}

// AI Integration
export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  response: string;
  sessionId: string;
  toolsUsed?: string[];
}
```

### Utility Functions
```typescript
// Date utilities
export const formatHealthDate = (date: Date): string;
export const isWithinLastWeek = (date: Date): boolean;
export const getAustralianTime = (): Date;

// Validation helpers
export const sanitizeInput = (input: string): string;
export const validateUIN = (uin: string): boolean;
export const isValidEmail = (email: string): boolean;

// Privacy utilities
export const anonymizeName = (name: string): string;
export const redactPII = (text: string): string;
export const generateSessionId = (): string;
```

### Constants & Configuration
```typescript
// User roles
export const USER_ROLES = {
  ADMIN: 1,
  DOCTOR: 2,
  PATIENT: 3,
} as const;

// Health score ranges
export const HEALTH_SCORE_RANGE = {
  MIN: 1,
  MAX: 10,
  DEFAULT: 5,
} as const;

// API endpoints
export const API_ENDPOINTS = {
  AUTH: '/api/auth',
  USERS: '/api/users',
  CHAT: '/api/chat',
  HEALTH: '/api/patients',
} as const;

// Environment configurations
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
} as const;
```

## Healthcare-Specific Types

### Care Plan Directives
```typescript
export interface CarePlanDirective {
  id: number;
  patientId: number;
  doctorId: number;
  category: 'diet' | 'exercise' | 'medication' | 'lifestyle';
  directive: string;
  targetScore: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Patient Progress Reports
```typescript
export interface ProgressReport {
  patientId: number;
  period: {
    start: Date;
    end: Date;
  };
  averageScores: {
    diet: number;
    exercise: number;
    medication: number;
    mood: number;
    overall: number;
  };
  compliance: {
    dailySubmissions: number;
    totalDays: number;
    percentage: number;
  };
  achievements: Badge[];
}
```

### AI Tool Definitions
```typescript
export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  category: 'health' | 'lifestyle' | 'emergency' | 'educational';
}

export interface AIResponse {
  content: string;
  toolsUsed: string[];
  emergencyDetected: boolean;
  confidenceScore: number;
}
```

## Privacy & Security Types

### PII/PHI Classification
```typescript
export enum DataClassification {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  PII = 'PII',
  PHI = 'PHI',
}

export interface AnonymizationMapping {
  original: string;
  anonymized: string;
  type: PIIType;
  sessionId: string;
  createdAt: Date;
}

export enum PIIType {
  NAME = 'NAME',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  ADDRESS = 'ADDRESS',
  UIN = 'UIN',
  MEDICARE = 'MEDICARE',
  SYMPTOM = 'SYMPTOM',
  MEDICATION = 'MEDICATION',
}
```

### Audit Trail Types
```typescript
export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId: number;
  userRole: keyof typeof USER_ROLES;
  action: AuditAction;
  resource: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
}

export enum AuditAction {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_MODIFY = 'DATA_MODIFY',
  AI_INTERACTION = 'AI_INTERACTION',
  PRIVACY_ANONYMIZATION = 'PRIVACY_ANONYMIZATION',
  EMERGENCY_DETECTED = 'EMERGENCY_DETECTED',
}
```

## Validation Schemas

### User Management
```typescript
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(['admin', 'doctor', 'patient']),
  phone: z.string().regex(/^\+61[0-9]{9}$/), // Australian format
});

export const updatePatientScoreSchema = z.object({
  diet: z.number().min(1).max(10),
  exercise: z.number().min(1).max(10),
  medication: z.number().min(1).max(10),
  mood: z.number().min(1).max(10),
  notes: z.string().max(500).optional(),
});
```

### Healthcare Data
```typescript
export const carePlanDirectiveSchema = z.object({
  patientId: z.number().positive(),
  category: z.enum(['diet', 'exercise', 'medication', 'lifestyle']),
  directive: z.string().min(10).max(1000),
  targetScore: z.number().min(1).max(10),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

export const healthMetricSchema = z.object({
  value: z.number().min(0).max(10),
  unit: z.string().max(20),
  category: z.string().max(50),
  timestamp: z.date(),
  notes: z.string().max(200).optional(),
});
```

## Usage in Applications

### Web App (React)
```typescript
import { User, HealthMetric, formatHealthDate } from '@kgc/shared';
import { updatePatientScoreSchema } from '@kgc/shared/schemas';

const handleScoreUpdate = (data: unknown) => {
  const validData = updatePatientScoreSchema.parse(data);
  // Use validated data
};
```

### API Service (Node.js)
```typescript
import { users, patientScores } from '@kgc/shared/schemas/database';
import { AuditAction, sanitizeInput } from '@kgc/shared';

const createPatient = async (userData: unknown) => {
  const sanitizedData = sanitizeInput(userData);
  // Database operations with shared schema
};
```

### Privacy Proxy Service
```typescript
import { PIIType, AnonymizationMapping } from '@kgc/shared/types';
import { redactPII, generateSessionId } from '@kgc/shared/utils';

const anonymizeHealthData = (text: string): AnonymizationMapping => {
  return redactPII(text, generateSessionId());
};
```

## Package Commands
```bash
# Build package
pnpm build

# Type checking
pnpm type-check

# Run tests
pnpm test

# Generate documentation
pnpm docs

# Publish (future)
pnpm publish
```

## Versioning Strategy
- **Semantic Versioning**: Major.Minor.Patch
- **Breaking Changes**: Major version bump
- **New Features**: Minor version bump
- **Bug Fixes**: Patch version bump
- **Pre-release**: Alpha/Beta tags for testing

## Dependencies
- **zod**: Runtime validation
- **drizzle-orm**: Database schema
- **date-fns**: Date utilities
- **class-variance-authority**: Utility classes
- **TypeScript**: Type definitions

## Development Guidelines
- All exports must be typed
- Include JSDoc comments for complex functions
- Validate runtime data with Zod schemas
- Follow Australian healthcare data standards
- Maintain backward compatibility where possible