SIZE: 19423 bytes

# Knowledge Card 07: Migration Playbook

## Migration Strategy Overview

### Current State Analysis
```yaml
Current Architecture:
  Frontend: Single React app in /client
  Backend: Express.js app in /server  
  Shared: Common schemas in /shared
  Database: Single PostgreSQL instance
  Deployment: Monolithic Replit deployment

Target Architecture:
  Frontend: Multiple apps in /apps (web, admin, mobile)
  Backend: Microservices in /services (api, workers, integrations)
  Shared: Packages in /packages (shared, ui, types)
  Database: Same PostgreSQL with better organization
  Deployment: Distributed services (Vercel + AWS)

Migration Complexity: Medium-High
Estimated Timeline: 4-6 weeks
Risk Level: Medium (healthcare data integrity critical)
```

### 8-Phase Migration Plan
```mermaid
Phase 1: Repository Structure Setup
Phase 2: Package Management Configuration  
Phase 3: Frontend Application Migration
Phase 4: Backend Services Migration
Phase 5: Shared Packages Migration
Phase 6: Database Schema Optimization
Phase 7: Deployment Pipeline Updates
Phase 8: Testing and Validation
```

## Phase 1: Repository Structure Setup

### New Directory Structure
```
kgc-healthcare-platform/
├── apps/                           # Frontend applications
│   ├── web/                       # Main patient/doctor/admin web app
│   ├── admin/                     # Dedicated admin dashboard  
│   └── mobile/                    # Future mobile app
│
├── services/                      # Backend services
│   ├── api/                       # Main REST API service
│   ├── workers/                   # Background job processors
│   ├── integrations/              # External service integrations
│   └── notifications/             # SMS/email service
│
├── packages/                      # Shared packages
│   ├── shared/                    # Shared types, schemas, utilities
│   ├── ui/                        # Shared UI components
│   ├── config/                    # Shared configuration
│   └── database/                  # Database utilities and migrations
│
├── tools/                         # Development and deployment tools
│   ├── scripts/                   # Build and deployment scripts
│   ├── docker/                    # Docker configurations
│   └── k8s/                       # Kubernetes manifests
│
├── docs/                          # Documentation
├── .github/                       # GitHub workflows
├── package.json                   # Root package.json (workspaces)
├── pnpm-workspace.yaml           # PNPM workspace configuration
├── turbo.json                     # Turborepo configuration
└── README.md                      # Updated documentation
```

### Workspace Configuration Setup
```json
// package.json (root)
{
  "name": "kgc-healthcare-platform",
  "private": true,
  "workspaces": [
    "apps/*",
    "services/*", 
    "packages/*"
  ],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev --parallel",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "latest",
    "@typescript-eslint/eslint-plugin": "latest",
    "@typescript-eslint/parser": "latest",
    "eslint": "latest",
    "typescript": "latest"
  },
  "packageManager": "pnpm@8.0.0"
}

// pnpm-workspace.yaml
packages:
  - "apps/*"
  - "services/*"
  - "packages/*"

// turbo.json
{
  "schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

## Phase 2: Package Management Configuration

### Shared Package Structure
```typescript
// packages/shared/package.json
{
  "name": "@kgc/shared",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./types": {
      "types": "./dist/types/index.d.ts", 
      "default": "./dist/types/index.js"
    },
    "./schemas": {
      "types": "./dist/schemas/index.d.ts",
      "default": "./dist/schemas/index.js"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "drizzle-orm": "workspace:*",
    "zod": "workspace:*"
  }
}

// packages/shared/src/index.ts
export * from './types';
export * from './schemas';
export * from './constants';
export * from './utils';

// packages/shared/src/types/index.ts
export type { User, UserRole, UserStatus } from './user';
export type { DailyScore, HealthMetric } from './health';
export type { CarePlanDirective, CPDCategory } from './care-plan';
export type { AIInteraction, MessageType } from './ai';

// packages/shared/src/schemas/index.ts
export { users, dailyScores, carePlanDirectives, aiInteractions } from './database';
export { UserInsertSchema, DailyScoreInsertSchema } from './validation';
```

### UI Component Package
```typescript
// packages/ui/package.json
{
  "name": "@kgc/ui",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts --external react",
    "dev": "tsup src/index.ts --format cjs,esm --dts --external react --watch",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "dependencies": {
    "@radix-ui/react-slot": "latest",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest"
  }
}

// packages/ui/src/index.ts
export { Button } from './components/button';
export { Input } from './components/input';
export { Card, CardHeader, CardContent, CardFooter } from './components/card';
export { Dialog, DialogContent, DialogHeader } from './components/dialog';
export { cn } from './utils';

// packages/ui/src/components/button.tsx
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
```

## Phase 3: Frontend Application Migration

### Main Web Application Setup
```typescript
// apps/web/package.json
{
  "name": "@kgc/web",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@kgc/shared": "workspace:*",
    "@kgc/ui": "workspace:*",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tanstack/react-query": "latest",
    "wouter": "latest",
    "react-hook-form": "latest",
    "@hookform/resolvers": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "latest",
    "typescript": "latest",
    "vite": "latest",
    "tailwindcss": "latest",
    "autoprefixer": "latest",
    "postcss": "latest"
  }
}

// apps/web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@kgc/shared": path.resolve(__dirname, "../../packages/shared/src"),
      "@kgc/ui": path.resolve(__dirname, "../../packages/ui/src")
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});

// apps/web/src/App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router, Route, Switch } from 'wouter';
import { AuthProvider } from './contexts/AuthContext';
import { HomePage } from './pages/HomePage';
import { PatientDashboard } from './pages/PatientDashboard';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { LoginPage } from './pages/LoginPage';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/login" component={LoginPage} />
            <Route path="/patient/*" component={PatientDashboard} />
            <Route path="/doctor/*" component={DoctorDashboard} />
            <Route path="/admin/*" component={AdminDashboard} />
          </Switch>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

### Component Migration Strategy
```typescript
// Migration utility for component updates
interface ComponentMigrationPlan {
  oldPath: string;
  newPath: string;
  dependencies: string[];
  breaking Changes: string[];
}

const COMPONENT_MIGRATIONS: ComponentMigrationPlan[] = [
  {
    oldPath: 'client/src/components/ui/Button.tsx',
    newPath: 'packages/ui/src/components/button.tsx',
    dependencies: ['@radix-ui/react-slot', 'class-variance-authority'],
    breakingChanges: [
      'Import path changed from @/components/ui to @kgc/ui',
      'Button variants now use cva instead of manual classes'
    ]
  },
  {
    oldPath: 'client/src/pages/PatientDashboard.tsx',
    newPath: 'apps/web/src/pages/PatientDashboard.tsx',
    dependencies: ['@kgc/shared', '@kgc/ui'],
    breakingChanges: [
      'API client import path changed',
      'Type imports now from @kgc/shared'
    ]
  }
];

// Automated migration script
async function migrateComponent(migration: ComponentMigrationPlan): Promise<void> {
  const oldContent = await fs.readFile(migration.oldPath, 'utf-8');
  
  // Update import paths
  let newContent = oldContent
    .replace(/from ['"]@\/components\/ui['"]/g, "from '@kgc/ui'")
    .replace(/from ['"]@\/lib['"]/g, "from '@kgc/shared'")
    .replace(/from ['"]\.\.\/shared['"]/g, "from '@kgc/shared'");
  
  // Ensure new directory exists
  await fs.ensureDir(path.dirname(migration.newPath));
  
  // Write migrated file
  await fs.writeFile(migration.newPath, newContent);
  
  console.log(`✅ Migrated ${migration.oldPath} → ${migration.newPath}`);
}
```

## Phase 4: Backend Services Migration

### API Service Configuration
```typescript
// services/api/package.json
{
  "name": "@kgc/api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@kgc/shared": "workspace:*",
    "@kgc/database": "workspace:*",
    "express": "latest",
    "cors": "latest",
    "helmet": "latest",
    "express-session": "latest",
    "express-rate-limit": "latest",
    "bcryptjs": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "@types/express": "latest",
    "@types/cors": "latest",
    "@types/bcryptjs": "latest",
    "tsx": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}

// services/api/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { healthRoutes } from './routes/health';
import { chatRoutes } from './routes/chat';
import { errorHandler } from './middleware/errorHandler';
import { auditLogger } from './middleware/auditLogger';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Audit logging
app.use(auditLogger);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/chat', chatRoutes);

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 API service running on port ${PORT}`);
});
```

### Microservice Architecture Pattern
```typescript
// Service base class for consistency
abstract class BaseService {
  protected serviceName: string;
  protected port: number;
  protected app: express.Application;
  
  constructor(serviceName: string, port: number) {
    this.serviceName = serviceName;
    this.port = port;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }
  
  protected setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(express.json());
    this.app.use('/health', (req, res) => {
      res.json({ 
        service: this.serviceName,
        status: 'healthy',
        timestamp: new Date().toISOString()
      });
    });
  }
  
  protected abstract setupRoutes(): void;
  
  protected setupErrorHandling(): void {
    this.app.use(errorHandler);
  }
  
  public start(): void {
    this.app.listen(this.port, () => {
      console.log(`🚀 ${this.serviceName} running on port ${this.port}`);
    });
  }
}

// Notifications service example
class NotificationService extends BaseService {
  constructor() {
    super('notification-service', 5001);
  }
  
  protected setupRoutes(): void {
    this.app.post('/api/notifications/sms', async (req, res) => {
      // SMS sending logic
    });
    
    this.app.post('/api/notifications/email', async (req, res) => {
      // Email sending logic
    });
  }
}
```

## Phase 5: Database Migration Strategy

### Schema Organization
```typescript
// packages/database/src/schema/index.ts
export * from './users';
export * from './health';
export * from './care-plans';
export * from './ai-interactions';
export * from './audit';

// packages/database/src/migrations/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

export async function runMigrations(): Promise<void> {
  const migrationClient = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(migrationClient);
  
  await migrate(db, { migrationsFolder: './migrations' });
  await migrationClient.end();
}

// packages/database/drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/*.ts',
  out: './migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!
  }
} satisfies Config;
```

### Data Migration Scripts
```typescript
// Migration script template
interface MigrationScript {
  version: string;
  description: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

const migration_2024_01_15_add_uin_format: MigrationScript = {
  version: '2024.01.15.001',
  description: 'Add new UIN format for unlimited scaling',
  
  async up() {
    // Add new UIN column
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN new_uin VARCHAR(20) UNIQUE;
    `);
    
    // Migrate existing UINs to new format
    const users = await db.select().from(usersTable);
    for (const user of users) {
      const newUin = generateNewUIN(user.role, user.id);
      await db.update(usersTable)
        .set({ newUin })
        .where(eq(usersTable.id, user.id));
    }
    
    // Drop old UIN column after verification
    await db.execute(sql`
      ALTER TABLE users 
      DROP COLUMN uin,
      RENAME COLUMN new_uin TO uin;
    `);
  },
  
  async down() {
    // Rollback logic
    console.warn('UIN format rollback requires manual intervention');
  }
};
```

## Phase 6: Deployment Pipeline Updates

### Vercel Frontend Deployment
```yaml
# .github/workflows/deploy-frontend.yml
name: Deploy Frontend to Vercel

on:
  push:
    branches: [main]
    paths: ['apps/web/**', 'packages/ui/**', 'packages/shared/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build packages
        run: pnpm run build --filter=@kgc/shared --filter=@kgc/ui
      
      - name: Build web app
        run: pnpm run build --filter=@kgc/web
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./apps/web
          vercel-args: '--prod'
```

### AWS Backend Deployment
```yaml
# .github/workflows/deploy-backend.yml
name: Deploy Backend to AWS

on:
  push:
    branches: [main]
    paths: ['services/**', 'packages/shared/**', 'packages/database/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ap-southeast-2
      
      - name: Build and deploy API service
        run: |
          cd services/api
          docker build -t kgc-api .
          
          # Push to ECR
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
          docker tag kgc-api:latest $ECR_REGISTRY/kgc-api:latest
          docker push $ECR_REGISTRY/kgc-api:latest
          
          # Update App Runner service
          aws apprunner start-deployment --service-arn ${{ secrets.API_SERVICE_ARN }}
```

### Docker Configuration
```dockerfile
# services/api/Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build the app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm install -g pnpm && pnpm run build --filter=@kgc/api

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/services/api/dist ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

USER nextjs

EXPOSE 5000
ENV PORT 5000

CMD ["node", "index.js"]
```

## Phase 7: Testing and Validation

### Migration Testing Strategy
```typescript
// Migration validation tests
describe('Migration Validation', () => {
  beforeAll(async () => {
    // Setup test database
    await setupTestDatabase();
  });
  
  test('Component imports work correctly', async () => {
    // Test that all component imports resolve
    const { Button } = await import('@kgc/ui');
    const { UserType } = await import('@kgc/shared');
    
    expect(Button).toBeDefined();
    expect(UserType).toBeDefined();
  });
  
  test('API endpoints respond correctly', async () => {
    const response = await fetch('http://localhost:5000/api/health');
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });
  
  test('Database schema is consistent', async () => {
    // Verify all tables exist
    const tables = await db.execute(sql`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const expectedTables = ['users', 'daily_scores', 'care_plan_directives', 'ai_interactions', 'audit_logs'];
    expectedTables.forEach(table => {
      expect(tables.find(t => t.table_name === table)).toBeDefined();
    });
  });
  
  test('User authentication flow works', async () => {
    // Test complete auth flow
    const loginResponse = await fetch('http://localhost:5000/api/auth/request-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+61412345678' })
    });
    
    expect(loginResponse.status).toBe(200);
  });
});

// Performance regression tests
describe('Performance Validation', () => {
  test('Page load times within acceptable range', async () => {
    const startTime = Date.now();
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000); // 3 second max
  });
  
  test('API response times acceptable', async () => {
    const startTime = Date.now();
    const response = await fetch('http://localhost:5000/api/users/profile');
    const responseTime = Date.now() - startTime;
    
    expect(responseTime).toBeLessThan(500); // 500ms max
  });
});
```

### Rollback Procedures
```typescript
// Emergency rollback script
interface RollbackPlan {
  phase: string;
  actions: RollbackAction[];
  estimatedTime: string;
  riskLevel: 'low' | 'medium' | 'high';
}

const ROLLBACK_PLANS: RollbackPlan[] = [
  {
    phase: 'Frontend Migration',
    actions: [
      { type: 'dns', description: 'Point domain back to old Replit deployment' },
      { type: 'verify', description: 'Verify old application is accessible' },
      { type: 'notification', description: 'Notify users of temporary service' }
    ],
    estimatedTime: '15 minutes',
    riskLevel: 'low'
  },
  {
    phase: 'Database Migration',
    actions: [
      { type: 'restore', description: 'Restore from point-in-time backup' },
      { type: 'verify', description: 'Verify data integrity' },
      { type: 'application', description: 'Update connection strings' }
    ],
    estimatedTime: '60 minutes',
    riskLevel: 'high'
  }
];

async function executeRollback(phase: string): Promise<void> {
  const plan = ROLLBACK_PLANS.find(p => p.phase === phase);
  if (!plan) {
    throw new Error(`No rollback plan found for phase: ${phase}`);
  }
  
  console.log(`🔄 Starting rollback for ${phase}`);
  console.log(`⏱️  Estimated time: ${plan.estimatedTime}`);
  console.log(`⚠️  Risk level: ${plan.riskLevel}`);
  
  for (const action of plan.actions) {
    console.log(`Executing: ${action.description}`);
    await executeRollbackAction(action);
  }
  
  console.log(`✅ Rollback completed for ${phase}`);
}
```

This comprehensive migration playbook provides step-by-step guidance for safely transitioning the KGC healthcare platform from its current monolithic structure to a scalable monorepo architecture while maintaining healthcare compliance and data integrity throughout the process.