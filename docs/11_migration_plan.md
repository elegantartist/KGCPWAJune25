# Migration Plan: Monorepo Restructuring

## Overview
This document provides a step-by-step migration plan to restructure the KGC Healthcare Platform from its current single-repository structure to a well-organized monorepo workspace. The migration preserves all existing functionality while improving maintainability, deployment flexibility, and development workflows.

## Migration Strategy
The migration follows a **phased approach** where each component is moved individually, tested, and validated before proceeding to the next. This ensures the application remains functional throughout the transition and allows for easy rollback if issues arise.

## Pre-Migration Checklist
- [ ] ✅ All current tests are passing
- [ ] ✅ Documentation is up to date  
- [ ] ✅ Git working directory is clean
- [ ] ✅ Backup current codebase (git tag or branch)
- [ ] ✅ Workspace structure is prepared (P7 complete)
- [ ] ✅ CI/CD pipelines are configured (P8-P9 complete)

## Migration Phases

### Phase 1: Frontend Application Migration
**Target**: Move React frontend to `apps/web/`

#### Current Structure → Target Structure
```
client/                    →    apps/web/
├── src/                   →    ├── src/
│   ├── components/        →    │   ├── components/
│   ├── pages/             →    │   ├── pages/
│   ├── lib/               →    │   ├── lib/
│   ├── hooks/             →    │   ├── hooks/
│   ├── styles/            →    │   ├── styles/
│   └── App.tsx            →    │   └── App.tsx
├── public/                →    ├── public/           ← from root /public
├── index.html             →    ├── index.html
├── package.json           →    ├── package.json     ← web-specific deps
├── vite.config.ts         →    ├── vite.config.ts
├── tsconfig.json          →    ├── tsconfig.json    ← extends base
└── README.md              →    └── README.md
```

#### Migration Steps
1. **Create Web App Structure**
   ```bash
   mkdir -p apps/web/src
   mkdir -p apps/web/public
   ```

2. **Move Frontend Code**
   ```bash
   # Move client source code
   mv client/src/* apps/web/src/
   mv client/index.html apps/web/
   mv client/vite.config.ts apps/web/
   
   # Move public assets from root
   mv public/* apps/web/public/
   ```

3. **Create Web App Configuration**
   ```json
   // apps/web/package.json
   {
     "name": "@kgc/web",
     "private": true,
     "version": "0.0.0",
     "type": "module",
     "scripts": {
       "dev": "vite",
       "build": "tsc && vite build",
       "preview": "vite preview",
       "type-check": "tsc --noEmit"
     },
     "dependencies": {
       // Frontend-specific dependencies only
     }
   }
   ```

4. **Update TypeScript Configuration**
   ```json
   // apps/web/tsconfig.json
   {
     "extends": "../../tsconfig.base.json",
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["./src/*"],
         "@kgc/shared/*": ["../../packages/shared/src/*"]
       }
     },
     "include": ["src", "vite.config.ts"],
     "references": [
       { "path": "../../packages/shared" }
     ]
   }
   ```

5. **Update Import Paths**
   - Replace relative imports to shared code with `@kgc/shared/*`
   - Update asset imports to use new structure
   - Fix component imports after restructuring

#### Assisted Move Prompt for Frontend
```
Replit Agent, move folder client/ to apps/web/. Also move public/ to apps/web/public/. Update imports/paths in all moved files, especially:
- Update shared imports to use @kgc/shared/*
- Fix asset imports for new public/ location  
- Update vite.config.ts paths
- Create apps/web/package.json with frontend dependencies
- Create apps/web/tsconfig.json extending base config
Run typecheck/tests. If issues: fix or open TODOs. Commit with message 'migrate: client/ + public/ → apps/web/'.
```

---

### Phase 2: API Service Migration
**Target**: Move Express.js backend to `services/api/`

#### Current Structure → Target Structure
```
server/                    →    services/api/
├── routes/                →    ├── src/
│   ├── auth.ts            →    │   ├── routes/
│   ├── users.ts           →    │   │   ├── auth.ts
│   └── ...                →    │   │   └── ...
├── services/              →    │   ├── services/
├── middleware/            →    │   ├── middleware/
├── ai/                    →    │   ├── ai/
├── config/                →    │   ├── config/
├── storage.ts             →    │   ├── storage/
├── index.ts               →    │   └── index.ts
├── package.json           →    ├── package.json     ← API-specific deps
├── tsconfig.json          →    ├── tsconfig.json    ← extends base  
├── Dockerfile             →    ├── Dockerfile
└── README.md              →    └── README.md
```

#### Migration Steps
1. **Create API Service Structure**
   ```bash
   mkdir -p services/api/src
   ```

2. **Move Backend Code**
   ```bash
   # Move all server code to services/api/src/
   mv server/* services/api/src/
   
   # Keep Dockerfile at service root
   mv services/api/src/Dockerfile services/api/
   ```

3. **Create API Service Configuration**
   ```json
   // services/api/package.json
   {
     "name": "@kgc/api",
     "private": true,
     "version": "1.0.0",
     "type": "module",
     "scripts": {
       "dev": "tsx src/index.ts",
       "build": "tsc",
       "start": "node dist/index.js",
       "type-check": "tsc --noEmit"
     },
     "dependencies": {
       // Backend-specific dependencies only
     }
   }
   ```

4. **Update Database and Storage Imports**
   - Move database schemas to shared package (Phase 4)
   - Update storage adapters to use shared interfaces
   - Fix import paths for moved modules

#### Assisted Move Prompt for API
```
Replit Agent, move folder server/ to services/api/src/. Update imports/paths in all moved files, especially:
- Update shared imports to use @kgc/shared/*
- Fix internal relative imports within the service
- Update database/schema imports to point to shared package
- Create services/api/package.json with backend dependencies
- Create services/api/tsconfig.json extending base config
- Move Dockerfile to services/api/ root
Run typecheck/tests. If issues: fix or open TODOs. Commit with message 'migrate: server/ → services/api/'.
```

---

### Phase 3: AI Agent Code Migration  
**Target**: Move AI agents to `packages/shared/agent/` or `services/api/agent/`

#### Current Structure → Target Structure
```
server/ai/                 →    packages/shared/agent/  (if reusable)
├── mcpTools/              →    ├── tools/              OR services/api/agent/ (if API-specific)
├── privacyProtectionAgent.ts → ├── privacy/
├── supervisorAgent.ts     →    ├── supervisor/
└── prompts/               →    └── prompts/
```

#### Decision Matrix
| Component | Location | Reasoning |
|-----------|----------|-----------|
| MCP Tools | `packages/shared/agent/tools/` | Reusable across services |
| System Prompts | `packages/shared/agent/prompts/` | Shared healthcare knowledge |
| Privacy Agent | `services/privacy-proxy/agent/` | Service-specific logic |
| Supervisor Agent | `services/api/agent/` | API service integration |

#### Migration Steps
1. **Analyze Agent Dependencies**
   ```bash
   # Check which agents use external APIs vs shared logic
   grep -r "import.*openai\|anthropic" server/ai/
   grep -r "import.*shared" server/ai/
   ```

2. **Move Reusable Components to Shared**
   ```bash
   mkdir -p packages/shared/agent/{tools,prompts,types}
   
   # Move MCP tools (reusable across services)
   mv server/ai/mcpTools/* packages/shared/agent/tools/
   
   # Move system prompts
   mv server/ai/prompts/* packages/shared/agent/prompts/
   ```

3. **Move Service-Specific Agents**
   ```bash
   # Supervisor agent stays with API service
   mkdir -p services/api/agent
   mv server/ai/supervisorAgent.ts services/api/agent/
   
   # Privacy agent moves to privacy proxy service (Phase 5)
   # Will be moved in Phase 5 when extracting privacy service
   ```

#### Assisted Move Prompt for Agent Code
```
Replit Agent, analyze server/ai/ folder and move components as follows:
- MCP tools (reusable) → packages/shared/agent/tools/
- System prompts → packages/shared/agent/prompts/ 
- Supervisor agent → services/api/agent/
- Keep privacy agent in place for now (will move in Phase 5)
Update imports/paths in all moved files. Create appropriate index.ts exports in shared package. Run typecheck/tests. If issues: fix or open TODOs. Commit with message 'migrate: AI agents → shared/agent + api/agent'.
```

---

### Phase 4: Database & Storage Migration
**Target**: Move data layer to `packages/shared/data/`

#### Current Structure → Target Structure
```
shared/                    →    packages/shared/
├── schema.ts              →    ├── src/
├── types.ts               →    │   ├── data/
server/storage.ts          →    │   │   ├── schema.ts    ← from shared/
server/db.ts               →    │   │   ├── types.ts     ← from shared/
                           →    │   │   ├── storage.ts   ← from server/
                           →    │   │   └── db.ts        ← from server/
                           →    │   └── index.ts
```

#### Migration Steps
1. **Create Shared Data Package Structure**
   ```bash
   mkdir -p packages/shared/src/data
   mkdir -p packages/shared/src/types
   mkdir -p packages/shared/src/utils
   ```

2. **Move Database Schemas**
   ```bash
   # Move shared schemas and types
   mv shared/schema.ts packages/shared/src/data/
   mv shared/types.ts packages/shared/src/types/
   
   # Move storage interfaces from server
   mv server/storage.ts packages/shared/src/data/
   mv server/db.ts packages/shared/src/data/
   ```

3. **Create Shared Package Configuration**
   ```json
   // packages/shared/package.json
   {
     "name": "@kgc/shared",
     "version": "1.0.0",
     "type": "module",
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "exports": {
       ".": "./dist/index.js",
       "./data": "./dist/data/index.js",
       "./types": "./dist/types/index.js",
       "./utils": "./dist/utils/index.js"
     }
   }
   ```

4. **Update All Import Statements**
   - Replace `../shared/schema` with `@kgc/shared/data`
   - Replace `./storage` with `@kgc/shared/data`
   - Update TypeScript path mappings

#### Assisted Move Prompt for Data Layer
```
Replit Agent, move data-related files to packages/shared/:
- shared/schema.ts → packages/shared/src/data/schema.ts
- shared/types.ts → packages/shared/src/types/index.ts  
- server/storage.ts → packages/shared/src/data/storage.ts
- server/db.ts → packages/shared/src/data/db.ts
Update all imports across the codebase to use @kgc/shared/data and @kgc/shared/types. Create packages/shared/package.json with shared dependencies. Run typecheck/tests. If issues: fix or open TODOs. Commit with message 'migrate: data layer → packages/shared/data'.
```

---

### Phase 5: Workers & Background Jobs (If Exist)
**Target**: Extract background jobs to `services/workers/`

#### Current Structure Analysis
```bash
# Check for background job patterns
find . -name "*.js" -o -name "*.ts" | xargs grep -l "setInterval\|cron\|schedule\|worker"
grep -r "background\|job\|queue" server/
```

#### Potential Worker Services
- **Alert Monitor**: Patient engagement monitoring (7PM reminders)
- **Data Cleanup**: Audit log rotation, session cleanup
- **Health Checks**: Service monitoring and reporting
- **Compliance Tasks**: Privacy audit, data retention

#### Migration Steps (If Workers Exist)
1. **Identify Background Processes**
   ```bash
   # Look for current background jobs
   grep -r "Alert Monitor\|setInterval" server/
   ```

2. **Extract to Workers Service**
   ```bash
   mkdir -p services/workers/src
   
   # Move background job logic
   # Example: mv server/services/alertMonitor.ts services/workers/src/
   ```

#### Assisted Move Prompt for Workers
```
Replit Agent, analyze server/ for background jobs, scheduled tasks, or worker processes. If found, move them to services/workers/src/. Common patterns: setInterval, cron, Alert Monitor, cleanup tasks. Update imports/paths. Create services/workers/package.json if workers exist. Run typecheck/tests. If issues: fix or open TODOs. Commit with message 'migrate: background workers → services/workers/'.
```

---

### Phase 6: Scripts & Tools Migration
**Target**: Organize scripts in `tools/`

#### Current Structure → Target Structure
```
scripts/                   →    tools/scripts/
├── build-*.sh             →    ├── build/
├── deploy-*.sh            →    ├── deploy/  
├── dev-*.js               →    ├── dev/
└── test-*.js              →    └── test/

package.json scripts       →    tools/package.json (if needed)
```

#### Migration Steps
1. **Analyze Existing Scripts**
   ```bash
   find . -name "*.sh" -o -name "deploy*" -o -name "build*" | grep -v node_modules
   grep -A5 -B5 '"scripts"' package.json
   ```

2. **Organize by Purpose**
   ```bash
   # Development scripts
   mkdir -p tools/scripts/dev
   mv scripts/dev-* tools/scripts/dev/ 2>/dev/null || true
   
   # Build scripts  
   mkdir -p tools/scripts/build
   mv scripts/build-* tools/scripts/build/ 2>/dev/null || true
   
   # Deployment scripts (already created in P10)
   # tools/scripts/deploy_aws.sh already exists
   
   # Testing scripts
   mkdir -p tools/scripts/test
   mv scripts/test-* tools/scripts/test/ 2>/dev/null || true
   ```

#### Assisted Move Prompt for Scripts
```
Replit Agent, move any remaining scripts to tools/scripts/ organized by purpose:
- Build scripts → tools/scripts/build/
- Test scripts → tools/scripts/test/  
- Development utilities → tools/scripts/dev/
- Database utilities → tools/scripts/db/
Update any references to moved scripts in package.json or documentation. Make all scripts executable. Run typecheck/tests. If issues: fix or open TODOs. Commit with message 'migrate: organize scripts → tools/scripts/'.
```

---

### Phase 7: Tests Migration & Organization
**Target**: Colocate tests or organize in `/tests`

#### Testing Strategy Decision
```yaml
Colocated Tests (Recommended):
  - Unit tests: next to source files (*.test.ts)
  - Component tests: next to components
  - Integration tests: in service directories

Centralized Tests (Alternative):
  - /tests/unit/
  - /tests/integration/  
  - /tests/e2e/
```

#### Current Test Analysis
```bash
# Find existing tests
find . -name "*.test.*" -o -name "*.spec.*" -o -path "*/test/*" | grep -v node_modules
```

#### Migration Steps
1. **Colocate Unit Tests** (Recommended)
   ```bash
   # Move tests to be adjacent to source files
   # server/routes/auth.test.ts → services/api/src/routes/auth.test.ts
   ```

2. **Organize Integration Tests**
   ```bash
   mkdir -p tests/integration
   mkdir -p tests/e2e
   
   # Move cross-service integration tests
   mv tests/integration/* tests/integration/ 2>/dev/null || true
   ```

#### Assisted Move Prompt for Tests
```
Replit Agent, analyze and organize test files:
- Move unit tests to be colocated with source files (*.test.ts next to *.ts)
- Move integration tests to tests/integration/
- Move end-to-end tests to tests/e2e/
- Update test imports and paths
- Update jest/vitest config files for new structure
- Ensure all tests still run with npm test
Run typecheck/tests. If issues: fix or open TODOs. Commit with message 'migrate: reorganize tests for monorepo structure'.
```

---

### Phase 8: Cleanup & Validation
**Target**: Remove obsolete paths after successful migration

#### Cleanup Checklist
- [ ] All CI/CD pipelines are green
- [ ] All tests are passing
- [ ] No broken imports remain
- [ ] Build succeeds for all workspaces
- [ ] Development servers start correctly

#### Cleanup Steps
1. **Validate Migration Success**
   ```bash
   # Run full CI locally
   pnpm install
   pnpm lint
   pnpm type-check
   pnpm test
   pnpm build
   ```

2. **Remove Empty Directories**
   ```bash
   # Only remove if completely empty and CI is green
   rmdir client/ server/ shared/ scripts/ 2>/dev/null || true
   ```

3. **Update Root Configuration**
   ```bash
   # Update package.json workspace scripts
   # Update tsconfig.json references  
   # Update .gitignore patterns
   # Update documentation
   ```

#### Assisted Move Prompt for Cleanup
```
Replit Agent, perform final cleanup after migration:
- Verify all workspaces build successfully (pnpm build)
- Verify all tests pass (pnpm test)  
- Remove empty directories: client/, server/, shared/, scripts/ (only if empty)
- Update root package.json scripts for workspace commands
- Update documentation references to old paths
- Commit with message 'migrate: cleanup obsolete paths after successful migration'
```

---

## Rollback Strategy

### Emergency Rollback
If critical issues arise during migration:

1. **Immediate Rollback**
   ```bash
   # Reset to pre-migration state
   git reset --hard migration-backup-tag
   ```

2. **Partial Rollback**
   ```bash
   # Rollback specific phase
   git revert <commit-hash-of-problematic-phase>
   ```

3. **Workspace Isolation**
   ```bash
   # Temporarily disable workspace in pnpm-workspace.yaml
   # Continue development in current structure
   ```

### Validation Points
Before each phase, ensure:
- [ ] Previous phase is fully working
- [ ] All tests are passing  
- [ ] CI/CD is green
- [ ] No broken imports
- [ ] Development environment works

## Post-Migration Benefits

### Development Benefits
- **Clear Boundaries**: Well-defined service responsibilities  
- **Independent Development**: Teams can work on services independently
- **Shared Code Reuse**: Common utilities and types in shared package
- **Better Testing**: Isolated testing for each service
- **Type Safety**: Maintained across workspace boundaries

### Deployment Benefits  
- **Independent Deployments**: Each service can be deployed separately
- **Scalability**: Services can scale based on demand
- **Technology Flexibility**: Different services can use different tech stacks
- **Fault Isolation**: Issues in one service don't affect others
- **Resource Optimization**: Allocate resources based on service needs

### Healthcare Compliance Benefits
- **Privacy Boundaries**: Clear separation of PII/PHI handling
- **Audit Trails**: Service-specific compliance logging
- **Data Residency**: Fine-grained control over data location
- **Security Isolation**: Minimize blast radius of security issues
- **Regulatory Alignment**: Structure aligns with healthcare standards

## Migration Timeline

### Estimated Duration
- **Phase 1 (Frontend)**: 2-4 hours
- **Phase 2 (API)**: 3-5 hours  
- **Phase 3 (Agents)**: 2-3 hours
- **Phase 4 (Data)**: 2-4 hours
- **Phase 5 (Workers)**: 1-2 hours (if applicable)
- **Phase 6 (Scripts)**: 1 hour
- **Phase 7 (Tests)**: 2-3 hours
- **Phase 8 (Cleanup)**: 1 hour

**Total Estimated Time**: 14-22 hours

### Recommended Schedule
- **Day 1**: Phases 1-2 (Frontend + API migration)
- **Day 2**: Phases 3-4 (Agents + Data migration) 
- **Day 3**: Phases 5-8 (Workers + Scripts + Tests + Cleanup)

## Success Criteria

### Technical Success
- [ ] All services build successfully in monorepo structure
- [ ] All tests pass in new structure
- [ ] CI/CD pipelines work with workspace configuration
- [ ] Development environment starts correctly
- [ ] Production deployment succeeds

### Healthcare Compliance Success  
- [ ] Privacy protection service boundaries maintained
- [ ] Australian data residency preserved
- [ ] TGA Class I SaMD scope unchanged
- [ ] Emergency detection workflows functional
- [ ] Audit logging continues uninterrupted

### Team Success
- [ ] Documentation updated for new structure
- [ ] Development workflows adapted
- [ ] Team training completed
- [ ] Onboarding guides updated
- [ ] Code review processes adapted

---

## Repeatable Assisted Move Prompt Template

For each migration phase, use this standardized prompt:

```
Replit Agent, move folder <OLD_PATH> to <NEW_PATH>. Update imports/paths in all affected files. Specific requirements:

1. **Move Operations**: 
   - Source: <OLD_PATH>  
   - Target: <NEW_PATH>
   - Include: [specify what to include/exclude]

2. **Import Updates**:
   - Update relative imports to use new paths
   - Update shared imports to use @kgc/shared/*
   - Fix any broken import references

3. **Configuration**:
   - Create package.json if needed (for workspace packages)
   - Create/update tsconfig.json extending base config
   - Update any service-specific configuration files

4. **Validation**:
   - Run pnpm type-check to verify TypeScript compilation
   - Run pnpm test to ensure tests still pass
   - If issues found: fix immediately or create TODO comments

5. **Commit**:
   - Commit with message: 'migrate: <OLD_PATH> → <NEW_PATH>'
   - Include summary of changes in commit description

Proceed systematically and ensure each step completes successfully before moving to the next.
```

This template ensures consistency across all migration phases and provides clear guidance for each assisted move operation.