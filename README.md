# Miharina – Madagascar Business Hub

Miharina is a GCP‑native platform connecting Madagascar’s young entrepreneurs (18–35) to cross‑border business opportunities across Africa. This monorepo contains the backend API, frontend, and shared packages.

## Status

- Phase 1 (infrastructure) complete
- Core development in progress (profiles, opportunities, AI matching, messaging)

## Monorepo Structure

- `apps/`
  - `api` – Node.js 20+ Express TypeScript backend (Cloud Run)
  - `web` – Frontend app (hosted via Cloud Storage + CDN)
- `packages/`
  - `database` – SQL schema and DB utilities
  - `gcp-configs` – GCP/Firebase/Storage config helpers
  - `shared` – Shared types, constants, utilities
- `infrastructure/` – Docker, scripts, Terraform (some legacy scripts removed)
- `config/` – Environment configuration templates

## Tech Stack

- Backend: Node.js 20+, TypeScript, Express.js on Cloud Run
- Database: Cloud SQL PostgreSQL (Redis via Memorystore planned)
- Auth: Firebase Auth (server uses Admin SDK)
- Storage: Google Cloud Storage (uploads + static assets)
- Email: Gmail API (Google native)
- AI: Vertex AI for translation/NLP (DeepSeek R1 currently commented out)
- Languages: French (fr), Malagasy (mg), English (en)

## Key Features

- Business Profiles – CRUD with ownership checks
- Opportunities – Multilingual fields (`title_fr/mg/en`, `description_fr/mg/en`), JSONB filters (`target_countries`), lifecycle via `status`, schema‑aligned columns (`business_type`, `industry`, `estimated_value`, `expiration_date`)
- AI Matching – Criteria‑based matching service (DeepSeek integration disabled; ready for Vertex/others)
- Messaging – Conversations, read/unread, notifications
- Success Stories – CRUD with file uploads
- Analytics – Dashboard and engagement metrics

## Important Implementation Notes

- Firebase Auth dev fallback: In development, if Firebase verification fails (e.g., missing IAM role), middleware injects a mock user to keep the API running. Production requires real verification.
- UID ↔ UUID mapping: We map Firebase `uid` to database `user_id` (UUID) internally. Controllers query `users.firebase_uid` to fetch `user_id` before DB operations.
- Email on registration: Welcome email sending is mandatory; on failure, the system cleans up both Firebase user and DB record.
- Strict TypeScript: Exact optional property types enabled; route handlers/middleware are typed as `RequestHandler`, with centralized Express request/user types under `apps/api/src/types/express.ts`.

## Getting Started (API)

1) Install dependencies (root and workspaces):
```bash
npm install
```

2) Configure environment:
- Copy and fill environment templates (examples may reside under `config/` or app folders)
- Ensure Firebase Admin key path and Cloud SQL connection are set for your environment

3) Run API locally:
```bash
npm run --workspace apps/api dev
```

4) Build:
```bash
npm run --workspace apps/api build
```

## Configuration

- Google Cloud Project (production): `miharina-hub-production`
- Buckets: `miharina-hub-production-uploads`, `miharina-hub-production-static`
- Database: Connect via local proxy or direct Cloud SQL connection string
- Auth: Firebase project must match production settings in configs

## Deployment (Cloud Run)

High‑level steps:
- Build container for `apps/api`
- Configure secrets (Firebase Admin key, DB connection) via Cloud Run/Secret Manager
- Set env vars for production project/resources
- Deploy service to Cloud Run (region as configured)

## Security

- Never commit service account keys or `.env*` files (see `.gitignore`)
- Production enforces Firebase token verification
- Role/IAM: Ensure service accounts have required roles (Gmail API, Storage, Cloud SQL, etc.)

## Roadmap

- Finalize business profile and opportunity flows
- Enable/replace AI matching with Vertex AI where appropriate
- Complete messaging notifications and analytics dashboards

---

If you encounter issues running the API or need new features, please open an issue or contact the maintainers.