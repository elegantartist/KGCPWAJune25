# Knowledge Card 01 (PART 2): C4 Architecture — Map + Diagrams

## Canonical Summary (pin these as facts)
- **Frontend:** React + TypeScript with **Vite** (patient/doctor/admin dashboards).
- **Backend:** **Node.js + Express** REST API.
- **Database:** **PostgreSQL** (Neon/RDS) accessed via **Drizzle ORM**.
- **AI Layer:** Supervisor Agent orchestrating MCP tools → OpenAI / Anthropic (via privacy/redaction).
- **Auth:** Session cookies; patients can use SMS; doctors/admin use email/password.
- **Deploy Targets:** Web on **Vercel** (or static host compatible with Vite), API + Privacy Proxy on **AWS** (Lambda/API Gateway or App Runner—choose ONE and keep it consistent in prompts).
- **Privacy:** AU-first processing where possible; PII minimised; redaction before LLM calls.
- **RBAC:** Admin, Doctor, Patient with scoped endpoints.

> Tip for GPT: *Prefer this card + the `03_Public_API_Contracts` card as the source of truth. If unsure about deployment (Lambda vs App Runner), ask the user which target to use; do not assume both.*

---

## A. High-Level Structure (summarised map)
- **client/** – Vite app (routes, components, feature modules: Self-Scores, Chat, Milestones, Journaling, Food DB, Inspiration).
- **server/** – Express API (auth, users, CPDs, scores, chat, MCP tools, reports, alerts).
- **server/ai/** – Supervisor Agent, Enhanced MCP service, memory tools.
- **shared/** – Types, zod schemas, OpenAPI assets.
- **docs/cards/** – Knowledge Cards (this file + others) for Custom GPT context.

---

## B. C4 — Level 1 (Context)

```mermaid
graph TD
  Patient((Patient)) -->|uses| Web[Web App (Vite + React)]
  Doctor((Doctor)) -->|uses| Web
  Admin((Admin)) -->|uses| Web

  Web -->|HTTPS/JSON| API[API Server (Express)]
  API -->|SQL| DB[(PostgreSQL)]
  API -->|Email| SendGrid[SendGrid]
  API -->|Files| S3[(Object Storage)]
  API -->|MCP tools via privacy| Proxy[Privacy/Redaction Proxy]

  subgraph AI Providers
    OpenAI[OpenAI]
    Anthropic[Anthropic]
  end

  Proxy --> OpenAI
  Proxy --> Anthropic
