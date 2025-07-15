# Project Structure

## Root Level Organization
```
/client/          # React frontend application
/server/          # Node.js backend server
/shared/          # Shared types and schemas
/docs/            # Documentation and guides
/migration-guide/ # AWS migration documentation
/scripts/         # Database and deployment scripts
```

## Client Structure (`/client/`)
```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (Radix-based)
│   ├── features/        # Feature-specific components
│   ├── layout/          # Layout components
│   ├── health/          # Health-related components
│   ├── chatbot/         # AI chatbot components
│   └── doctor/          # Doctor-specific components
├── pages/               # Route-level page components
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions and services
├── services/            # API and external service clients
├── context/             # React context providers
├── features/            # Feature modules with registry
└── stores/              # Zustand state stores
```

## Server Structure (`/server/`)
```
├── ai/                  # AI service integrations
├── api/                 # API route handlers
├── services/            # Business logic services
├── middleware/          # Express middleware
├── routes/              # Route definitions
├── lib/                 # Server utilities
└── types/               # Server-specific types
```

## Naming Conventions

### Files
- **Components**: PascalCase (`PatientDashboard.tsx`)
- **Pages**: kebab-case or PascalCase (`doctor-dashboard.tsx`, `LoginPage.tsx`)
- **Hooks**: camelCase with `use` prefix (`useAuth.tsx`)
- **Services**: camelCase (`chatService.ts`)
- **Types**: camelCase (`types.ts`)

### Components
- **UI Components**: PascalCase (`<Button />`, `<Dialog />`)
- **Page Components**: Descriptive names (`<PatientDashboard />`)
- **Feature Components**: Domain-prefixed (`<ChatModal />`, `<BadgeAwardModal />`)

## Import Patterns
- Use path aliases: `@/` for client src, `@shared/` for shared types
- Group imports: external libraries, internal modules, relative imports
- Prefer named exports over default exports for utilities

## Code Organization Principles
- **Feature-based**: Group related functionality together
- **Separation of Concerns**: UI, business logic, and data access separated
- **Shared Code**: Common types and utilities in `/shared/`
- **Role-based Access**: Components organized by user role (patient, doctor, admin)

## Key Directories
- `/client/src/components/ui/`: Radix UI wrapper components
- `/client/src/features/`: Self-contained feature modules
- `/server/ai/`: AI provider integrations and services
- `/server/services/`: Core business logic (privacy, analytics, etc.)
- `/shared/`: Cross-platform type definitions and schemas