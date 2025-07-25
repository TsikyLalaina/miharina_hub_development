# Miharina Platform

A monorepo for the Miharina platform following Google Cloud best practices.

## Structure
- `apps/`: Contains frontend (web), backend API, and AI services.
- `packages/`: Shared utilities, database schemas, and GCP configurations.
- `infrastructure/`: Terraform, Docker, and deployment scripts.
- `docs/`: API, deployment, and user documentation.
- `.github/`: CI/CD workflows.

## Setup
1. Install dependencies: `yarn install`
2. Set up environment variables using `.env.example` files.
3. Run services: `yarn start`

## Development
- Use VSCode with included settings.
- Follow TypeScript configurations in `tsconfig.json`.