# Marketing Campaign Platform — Claude Code Instructions

## Project Overview
Multi-tenant WhatsApp Marketing Campaign SaaS platform built on AWS serverless.
Phase 1 target: $0/month AWS cost using free tier.

---

## STEP 1: Read These Files at the Start of EVERY Session

Read ALL context files before writing any code. Read them in this order:

1. `.claude/context/MARKETING_MODULE_PRD_v3.md`     ← Source of truth for the entire platform
2. `.claude/context/ARCHITECTURE_PATTERNS.md`
3. `.claude/context/CODING_STANDARDS.md`
4. `.claude/context/DYNAMODB_COOKBOOK.md`
5. `.claude/context/API_CONVENTIONS.md`
6. `.claude/context/SECURITY_PLAYBOOK.md`
7. `.claude/context/CDK_PATTERNS.md`
8. `.claude/context/REACT_PATTERNS.md`
9. `.claude/context/TESTING_PLAYBOOK.md`
10. `.claude/context/UX_DESIGN_SYSTEM.md`

When working on frontend tasks, also read the skills files:

- `.claude/skills/INDEX.md`               ← Read this to know which skill to use
- `.claude/skills/no-ai-defaults.md`      ← ALWAYS read before any UI work
- `.claude/skills/build-react-component.md`
- `.claude/skills/build-react-page.md`
- `.claude/skills/react-query-hooks.md`
- `.claude/skills/react-forms.md`

---

## STEP 2: Critical Architecture Rules

### Meta WhatsApp API — Token Model (READ CAREFULLY)

**This is the most common mistake. Do not deviate from this.**

- There is ONE platform-level Meta System User permanent token for all tenants
- This token is stored ONCE in SSM Parameter Store (`META_SYSTEM_USER_TOKEN_PARAM`)
- Tenants are differentiated ONLY by `phone_number_id` and `waba_id`
- `phone_number_id` and `waba_id` are stored on the tenant's DynamoDB record
- There is NO `access_token_secret_arn` per tenant
- There is NO per-tenant token of any kind

Every Meta API call pattern:
```
POST /v21.0/{tenant.phone_number_id}/messages
Authorization: Bearer {platform_system_user_token_from_ssm}
```

Full explanation: `.claude/context/MARKETING_MODULE_PRD_v3.md` Section 3.5

---

### Multi-Tenancy — Non-Negotiable Rules

- Every DynamoDB item's PK must start with `TENANT#<tenant_id>`
- `tenant_id` always comes from the JWT token — NEVER from the request body or path
- API middleware validates JWT `tenant_id` matches the path `tenant_id`
- Never use DynamoDB Scan — add a GSI for any new access pattern
- Every write must use a `ConditionExpression`

---

### Backend Architecture — Layer Pattern

Every feature follows this exact layer order. No skipping, no merging layers:

```
Request → Lambda Handler → Service → Repository → DynamoDB
```

- **Handler** (`handlers/`): Parse request, call service, return response. No business logic.
- **Service** (`services/`): Business logic, orchestration, calls repositories. No DynamoDB calls.
- **Repository** (`repositories/`): All DynamoDB operations. No business logic.
- **Models** (`models/`): Pydantic models for request/response validation.

---

### Frontend Architecture — State Rules

| State Type | Tool | Never use |
|-----------|------|-----------|
| Server data | React Query | useState, useEffect+fetch |
| URL filters/pagination | useSearchParams | useState |
| Form data | React Hook Form | useState |
| Global UI (sidebar, modals) | Zustand | Context API |
| Component-local UI | useState | Zustand |

---

## STEP 3: Tech Stack

### Backend
- Python 3.12 on AWS Lambda ARM64
- DynamoDB single-table design
- SQS FIFO for campaign execution queue
- EventBridge Scheduler for scheduled campaigns
- Amazon Cognito for tenant-aware auth
- aws-lambda-powertools for ALL handlers (Logger, Metrics, Tracer — no exceptions)
- Pydantic for ALL request/response validation

### Frontend
- React 18 + TypeScript 5.x (strict mode)
- Tailwind CSS — utility classes only, no custom CSS files
- React Query (TanStack) for all server state
- Zustand for global UI state
- React Hook Form + Zod for all forms
- React Router v6
- Heroicons (outline variant, never mix icon libraries)
- Inter font (loaded from Google Fonts)

### Infrastructure
- AWS CDK (Python)
- Deploy Phase 1: `cdk deploy --context env=solo`

### Testing
- Backend: pytest + moto
- Frontend: Vitest + React Testing Library
- E2E: Playwright

---

## STEP 4: Phase 1 Cost Rules — MUST FOLLOW

Do NOT introduce any of these until Phase 2:

| Component | Phase 1 (Use This) | Phase 2+ (Do Not Use Yet) |
|-----------|-------------------|--------------------------|
| Rate limiting | DynamoDB TTL counters | Redis |
| Caching | DynamoDB TTL items | Redis |
| Secrets | SSM Parameter Store SecureString | Secrets Manager |
| Networking | Lambda outside VPC | VPC + NAT Gateway |
| Error tracking | CloudWatch Logs | Sentry |
| DynamoDB capacity | Provisioned 25/25 RCU/WCU (free tier) | On-demand |

Environment variables for Phase 1:
```
RATE_LIMITER_BACKEND=dynamodb
CACHE_BACKEND=dynamodb
SECRETS_BACKEND=ssm
```

---

## STEP 5: Development Workflow

Always follow this order — no exceptions:

```
brainstorm → plan → TDD (write tests first) → implement → review
```

1. **Brainstorm**: Understand the requirement fully before writing anything
2. **Plan**: Write out what files will be created/modified before touching code
3. **TDD**: Write the failing test first (RED), then implement (GREEN), then clean up (REFACTOR)
4. **Implement**: Follow the layer pattern, use powertools, scope to tenant
5. **Review**: Check against security playbook, test coverage, naming conventions

---

## STEP 6: Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| Python files, functions, variables | snake_case | `campaign_service.py`, `get_campaign()` |
| TypeScript variables, functions | camelCase | `campaignId`, `fetchCampaigns()` |
| React components, TS types | PascalCase | `CampaignTable`, `CampaignStatus` |
| DynamoDB keys | UPPER_CASE | `PK`, `SK`, `GSI1PK`, `GSI1SK` |
| API endpoints | plural nouns, no verbs | `/api/v1/campaigns`, `/api/v1/templates` |
| Entity ID prefixes | lowercase prefix | `camp_xxx`, `seg_xxx`, `tmpl_xxx`, `msg_xxx` |
| Git branches | `feat/TICKET-description` | `feat/MKTG-42-template-approval` |
| Git commits | Conventional commits | `feat: add template submission to Meta` |

---

## STEP 7: Code Quality Rules

- Every Python function must have type hints
- Every TypeScript variable and function must be explicitly typed — no `any`
- Every Lambda handler uses aws-lambda-powertools Logger, Metrics, Tracer
- Every API endpoint has a unit test before the implementation exists
- Test coverage target: 80% minimum
- Use Context7 MCP for AWS SDK, CDK, or library API lookups — do not guess APIs

---

## Quick Reference: New Feature Checklist

When implementing any new feature, generate in this order:
1. Pydantic models (`backend/src/models/`)
2. DynamoDB repository (`backend/src/repositories/`)
3. Service layer (`backend/src/services/`)
4. Lambda handler (`backend/src/handlers/`)
5. Unit tests with moto (`backend/tests/unit/`)
6. React component/page (`frontend/src/`)
7. CDK additions if new AWS resources needed (`infra/`)
