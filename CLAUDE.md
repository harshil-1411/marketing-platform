# Marketing Campaign Platform — Claude Code Instructions

## Project Overview
Multi-tenant WhatsApp Marketing Campaign SaaS platform built on AWS serverless.
Phase 1 target: $0/month AWS cost using free tier.

## CRITICAL: Read Documentation First
Before writing ANY code, read the relevant documentation in `.antigravity/context/`:
- Architecture decisions: ARCHITECTURE_PATTERNS.md
- Database patterns: DYNAMODB_COOKBOOK.md
- API design: API_CONVENTIONS.md
- Testing approach: TESTING_PLAYBOOK.md
- Security requirements: SECURITY_PLAYBOOK.md
- Frontend patterns: REACT_PATTERNS.md
- CDK infrastructure: CDK_PATTERNS.md
- Code style: CODING_STANDARDS.md
- UX/UI: UX_DESIGN_SYSTEM.md
- Full requirements: MARKETING_MODULE_PRD.md

## Tech Stack
- Backend: Python 3.12, AWS Lambda (ARM64), DynamoDB (single-table), SQS FIFO
- Frontend: React 18, TypeScript 5.x strict, Tailwind CSS, Zustand, React Query
- Infrastructure: AWS CDK (Python), deploy with `cdk deploy --context env=solo`
- Testing: pytest + moto (backend), Vitest + React Testing Library (frontend)

## Phase 1 Cost Rules (MUST FOLLOW)
- Rate limiting: Use DynamoDB TTL counters (NOT Redis)
- Caching: Use DynamoDB items with TTL (NOT Redis)
- Secrets: Use SSM Parameter Store SecureString (NOT Secrets Manager)
- Networking: Lambda runs OUTSIDE VPC (no NAT Gateway cost)
- Error tracking: Use CloudWatch Logs (NOT Sentry)
- DynamoDB: Provisioned mode 25/25 RCU/WCU (free tier)
- Environment variables: RATE_LIMITER_BACKEND=dynamodb, CACHE_BACKEND=dynamodb

## Development Rules
- Always use Superpowers workflow: brainstorm → plan → TDD → implement → review
- Every function must have type hints (Python) or types (TypeScript)
- Every Lambda handler must use aws-lambda-powertools (Logger, Metrics, Tracer)
- Every DynamoDB operation must be tenant-scoped (PK starts with TENANT#<tenant_id>)
- Every write operation must use conditional expressions
- Never use DynamoDB Scan — add a GSI if you need a new access pattern
- Tests before code — RED-GREEN-REFACTOR always
- Use Context7 for any AWS SDK, CDK, or library API lookups

## Naming Conventions
- Python: snake_case (files, functions, variables)
- TypeScript: camelCase (variables, functions), PascalCase (components, types)
- DynamoDB keys: PascalCase (PK, SK, GSI1PK, GSI1SK)
- API endpoints: /api/v1/{resource} (plural nouns, no verbs)
- IDs: prefixed (camp_xxx, seg_xxx, tmpl_xxx, msg_xxx)
- Git branches: feat/TICKET-123-description, fix/TICKET-456-description
- Git commits: conventional commits (feat, fix, test, refactor, docs, chore)
