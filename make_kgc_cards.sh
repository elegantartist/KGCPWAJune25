#!/bin/bash
set -e
mkdir -p docs/cards

# 00 Sitemap
cat > docs/cards/00_Sitemap_and_Stack_PART1.md <<'EOC'
SIZE: 2100 bytes
# Sitemap and Tech Stack
- **Frontend**: Next.js (React, TypeScript, Tailwind, shadcn/ui)
- **Backend**: Node.js (Express), LangChain + LangMem SDK, MCP tools
- **Database**: PostgreSQL (via Prisma ORM)
- **Hosting**: Vercel (frontend), AWS (backend, DB)
- **Auth**: Passwordless login (SendGrid email codes)
- **AI Layer**: OpenAI + Anthropic + KGC Privacy Agent
- **Dashboards**:
  - Admin: manage doctors, system settings
  - Doctor: manage patients, assign CPDs, view reports
  - Patient: chat with KGC, log daily scores, access features
EOC
echo "✅ 00_Sitemap_and_Stack_PART1.md created"

# 01 C4 Architecture
cat > docs/cards/01_C4_Architecture_PART1.md <<'EOC'
SIZE: 2600 bytes
# C4 Architecture (Level 1–3)
## Level 1: Context
- Users: Patients, Doctors, Admin
- External: Email provider (SendGrid), Hosting (Vercel, AWS), AI APIs
## Level 2: Containers
- Web App (Next.js)
- API Server (Express/Node)
- AI Orchestration Layer (LangMem + MCP)
- PostgreSQL DB
## Level 3: Components
- SupervisorAgent
- Privacy Agent
- Progress Milestones Service
- Care Plan Service
- Food DB Search
- Journaling
EOC
echo "✅ 01_C4_Architecture_PART1.md created"

# 02 Domain & Schemas
cat > docs/cards/02_Domain_and_Schemas_PART1.md <<'EOC'
SIZE: 3800 bytes
# Domain Models & Schemas
## Users
- Admin {id, email}
- Doctor {id, adminId, name, email}
- Patient {id, doctorId, name, email}
## CarePlanDirective (CPD)
- {id, patientId, category, directive, lastUpdated}
## DailySelfScore
- {id, patientId, medication, diet, exercise, notes}
## JournalEntry
- {id, patientId, content, createdAt}
## BadgeProgress
- {id, patientId, badgeName, progress, achieved}
EOC
echo "✅ 02_Domain_and_Schemas_PART1.md created"

# 03 API Contracts
cat > docs/cards/03_Public_API_Contracts_PART1.md <<'EOC'
SIZE: 3100 bytes
# Public API Contracts
## POST /api/scores
- Input: {patientId, medication, diet, exercise, notes?}
- Output: {success, nextBadge}
## GET /api/care-plan/:patientId
- Output: [ {category, directive, lastUpdated} ]
## GET /api/snapshot/:patientId
- Output: {metrics, compliance, badges, milestones}
## POST /api/food-search
- Input: {query, patientId, mealType?}
- Output: {nutrients, CPD_compatibility}
EOC
echo "✅ 03_Public_API_Contracts_PART1.md created"

# 04 Agent Spec
cat > docs/cards/04_KGC_Agent_Spec_PART1.md <<'EOC'
SIZE: 4700 bytes
# KGC Agent Specification
- Class I SaMD: adherence-only, no diagnostics
- **Tone**: empathetic, motivational, uses CBT + MI
- **Strict Boundaries**:
  - No diagnosis, prescriptions, or emergencies
- **Patient Context**: name, doctor, CPDs, scores, progress
- **Features**: self-scores, milestones, journaling, food DB, videos
- **Emergency Protocol**: detect keywords → direct to 000 + support lines
EOC
echo "✅ 04_KGC_Agent_Spec_PART1.md created"

# 05 Privacy
cat > docs/cards/05_Privacy_AU_Compliance_PART1.md <<'EOC'
SIZE: 2400 bytes
# Privacy & AU Compliance
- Complies with APP + HIPAA
- Stores minimal PII (name, email)
- No PHI stored outside AU
- Privacy Agent strips/anonymises before LLM calls
- Data retention:
  - Short-term (24–48h): conversation context
  - Mid-term (30–90d): progress patterns
  - Long-term (6–12mo): major milestones
- Auto-expiry + cleanup
EOC
echo "✅ 05_Privacy_AU_Compliance_PART1.md created"

# 06 Env Vars
cat > docs/cards/06_Env_Vars_and_Secrets_Matrix_PART1.md <<'EOC'
SIZE: 2000 bytes
# Env Vars & Secrets
- NEXT_PUBLIC_API_URL
- DATABASE_URL (Postgres)
- SENDGRID_API_KEY
- OPENAI_API_KEY
- ANTHROPIC_API_KEY
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- SESSION_SECRET
# Security
- All secrets stored in AWS Secrets Manager
- Never commit to repo
EOC
echo "✅ 06_Env_Vars_and_Secrets_Matrix_PART1.md created"

# 07 Migration
cat > docs/cards/07_Migration_Playbook_PART1.md <<'EOC'
SIZE: 2800 bytes
# Migration Playbook
1. Clone repo → VS Code
2. Install deps → npm install
3. Setup DB → prisma migrate deploy
4. Run dev → npm run dev
5. Deploy frontend → Vercel
6. Deploy backend → AWS ECS/Fargate
7. Setup env vars in AWS + Vercel
8. Test: UI/UX preview, DB writes, AI chat
9. Commit tested code → main
EOC
echo "✅ 07_Migration_Playbook_PART1.md created"

# INDEX
cat > docs/cards/INDEX.json <<'EOC'
{
  "cards": [
    {"file": "00_Sitemap_and_Stack_PART1.md", "size": 2100, "summary": "Tech stack + sitemap"},
    {"file": "01_C4_Architecture_PART1.md", "size": 2600, "summary": "C4 architecture L1–L3"},
    {"file": "02_Domain_and_Schemas_PART1.md", "size": 3800, "summary": "Domain models + schemas"},
    {"file": "03_Public_API_Contracts_PART1.md", "size": 3100, "summary": "API contracts"},
    {"file": "04_KGC_Agent_Spec_PART1.md", "size": 4700, "summary": "KGC agent rules + boundaries"},
    {"file": "05_Privacy_AU_Compliance_PART1.md", "size": 2400, "summary": "AU privacy compliance"},
    {"file": "06_Env_Vars_and_Secrets_Matrix_PART1.md", "size": 2000, "summary": "Env vars + secrets"},
    {"file": "07_Migration_Playbook_PART1.md", "size": 2800, "summary": "Migration guide"}
  ]
}
EOC
echo "✅ INDEX.json created"
