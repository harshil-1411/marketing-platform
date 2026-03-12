# Coding Standards & Conventions

**Project:** Salon WhatsApp Marketing Campaign Platform
**Version:** 1.0 | February 2026
**Audience:** Claude + Antigravity, Human Developers

---

## 1. Universal Principles

### 1.1 Core Philosophy

- **Explicit over implicit.** Type every function parameter. Name every variable clearly. No magic numbers.
- **Flat over nested.** Early returns, guard clauses, no 4-level deep nesting.
- **Small over large.** Functions do one thing. Files stay under 300 lines. Classes stay under 200 lines.
- **Boring over clever.** Readable code beats clever code. Future you (and Claude) must understand it instantly.
- **Fail loudly.** Never swallow exceptions. Always log. Always propagate meaningful errors.

### 1.2 Naming Conventions Summary

| Element | Python | TypeScript |
|---------|--------|------------|
| Files | `snake_case.py` | `kebab-case.ts` / `PascalCase.tsx` |
| Classes | `PascalCase` | `PascalCase` |
| Functions/Methods | `snake_case` | `camelCase` |
| Variables | `snake_case` | `camelCase` |
| Constants | `UPPER_SNAKE_CASE` | `UPPER_SNAKE_CASE` |
| Type aliases | `PascalCase` | `PascalCase` |
| Enums | `PascalCase` (members: `UPPER_SNAKE`) | `PascalCase` (members: `PascalCase`) |
| Private | `_leading_underscore` | `#private` or `_leading` |
| DynamoDB keys | `PascalCase` (`PK`, `SK`, `GSI1PK`) | — |
| API fields | `snake_case` (JSON) | `camelCase` (internal) → `snake_case` (API) |
| Environment vars | `UPPER_SNAKE_CASE` | `UPPER_SNAKE_CASE` |
| CSS classes | — | Tailwind utilities (no custom CSS) |

---

## 2. Python Standards (Backend)

### 2.1 Language & Runtime

- **Python 3.12** minimum. Use latest stable features (type unions `X | Y`, `match` statements where appropriate).
- **Formatter:** `ruff format` (Black-compatible). Line length: 100.
- **Linter:** `ruff check` with rules: `E`, `F`, `W`, `I` (isort), `N` (naming), `S` (security), `B` (bugbear), `UP` (pyupgrade), `SIM` (simplify), `RUF`.
- **Type checker:** `mypy --strict` for all new code.

### 2.2 File Structure

Every Python module follows this structure:

```python
"""Module docstring explaining purpose.

This module handles campaign creation and validation
for the Marketing Campaign Platform.
"""

# Standard library imports
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

# Third-party imports
import boto3
from aws_lambda_powertools import Logger, Metrics, Tracer
from pydantic import BaseModel, Field

# Local imports
from src.models.campaign import Campaign, CampaignStatus
from src.utils.errors import NotFoundError, ValidationError

# Module-level constants
MAX_CAMPAIGN_NAME_LENGTH = 200
DEFAULT_COOLDOWN_HOURS = 24

# Module-level logger/tracer (only in handler files)
logger = Logger(service="campaign-service")
tracer = Tracer(service="campaign-service")
metrics = Metrics(namespace="SalonMarketing")
```

### 2.3 Import Rules

- **Never use wildcard imports** (`from x import *`).
- **Never use relative imports** (`from ..models import X`). Always use absolute from `src.`.
- Group imports: stdlib → third-party → local, separated by blank lines.
- `ruff` with `I` rules enforces ordering automatically.

### 2.4 Type Hints

Every function must have complete type hints:

```python
# ✅ CORRECT
def create_campaign(
    tenant_id: str,
    request: CreateCampaignRequest,
    user_id: str,
) -> Campaign:
    """Create a new campaign in DRAFT status."""
    ...

# ✅ CORRECT — complex return types
def evaluate_segment(
    segment: Segment,
    loyalty_data: dict[str, LoyaltyProfile] | None = None,
) -> tuple[list[str], int]:
    """Evaluate segment and return (matching_phones, total_count)."""
    ...

# ❌ WRONG — missing types
def create_campaign(tenant_id, request, user_id):
    ...

# ❌ WRONG — using Any without justification
def process_data(data: Any) -> Any:
    ...
```

### 2.5 Docstrings (Google Style)

```python
def schedule_campaign(
    campaign_id: str,
    tenant_id: str,
    scheduled_at: datetime,
) -> Campaign:
    """Schedule a draft campaign for future execution.

    Validates that the campaign is in DRAFT status, has a valid template
    (approved by Meta), and a non-empty segment. Updates status to SCHEDULED
    and creates an EventBridge schedule.

    Args:
        campaign_id: Unique identifier of the campaign.
        tenant_id: Tenant context for data isolation.
        scheduled_at: UTC datetime when the campaign should execute.

    Returns:
        The updated Campaign object with SCHEDULED status.

    Raises:
        NotFoundError: If campaign doesn't exist for this tenant.
        InvalidStateError: If campaign is not in DRAFT status.
        ValidationError: If template is not approved or segment is empty.
    """
```

When to write docstrings:
- **Always:** Public functions, classes, modules.
- **Never:** Private helper functions with obvious purpose (e.g., `_format_phone_number`).
- **Always:** Any function Claude might need to understand in a future session.

### 2.6 Function Design

```python
# ✅ CORRECT — early returns, guard clauses, single responsibility
def get_campaign(self, tenant_id: str, campaign_id: str) -> Campaign:
    """Fetch a campaign by ID, scoped to tenant."""
    if not campaign_id:
        raise ValidationError("campaign_id is required")

    item = self._table.get_item(
        Key={"PK": f"TENANT#{tenant_id}", "SK": f"CAMPAIGN#{campaign_id}"}
    ).get("Item")

    if not item:
        raise NotFoundError(f"Campaign {campaign_id} not found")

    return Campaign.from_dynamo(item)


# ❌ WRONG — deeply nested, multiple responsibilities
def get_campaign(self, tenant_id, campaign_id):
    if campaign_id:
        try:
            item = self._table.get_item(
                Key={"PK": f"TENANT#{tenant_id}", "SK": f"CAMPAIGN#{campaign_id}"}
            ).get("Item")
            if item:
                campaign = Campaign.from_dynamo(item)
                if campaign.status != "deleted":
                    return campaign
                else:
                    return None
            else:
                return None
        except Exception as e:
            print(f"Error: {e}")
            return None
    return None
```

### 2.7 Error Handling

```python
# ✅ CORRECT — specific exceptions, structured errors
from src.utils.errors import (
    AppError,
    NotFoundError,
    ValidationError,
    ConflictError,
    ExternalServiceError,
)

try:
    result = whatsapp_client.send_template_message(phone, template_id, variables)
except WhatsAppRateLimitError as e:
    logger.warning("WhatsApp rate limit hit", extra={"phone": phone, "retry_after": e.retry_after})
    raise ExternalServiceError(
        code="WHATSAPP_RATE_LIMITED",
        message="Message sending rate limited, will retry",
        details={"retry_after_seconds": e.retry_after},
    )
except WhatsAppAPIError as e:
    logger.error("WhatsApp API error", extra={"phone": phone, "error": str(e)})
    raise ExternalServiceError(
        code="WHATSAPP_API_ERROR",
        message="Failed to send message via WhatsApp",
        details={"whatsapp_error_code": e.code},
    )

# ❌ WRONG — bare except, swallowed error, print
try:
    result = whatsapp_client.send_template_message(phone, template_id, variables)
except Exception:
    print("something went wrong")
    return None
```

### 2.8 Logging Standards

```python
from aws_lambda_powertools import Logger

logger = Logger(service="campaign-service")

# ✅ CORRECT — structured, contextual
logger.info("Campaign created", extra={
    "tenant_id": tenant_id,
    "campaign_id": campaign.campaign_id,
    "campaign_type": campaign.type,
    "segment_id": campaign.segment_id,
})

logger.warning("Loyalty API slow response", extra={
    "tenant_id": tenant_id,
    "response_time_ms": elapsed_ms,
    "endpoint": "/api/v1/customers",
})

logger.error("Failed to send message", extra={
    "tenant_id": tenant_id,
    "campaign_id": campaign_id,
    "phone": phone_hash,  # Never log full phone numbers
    "error_code": error.code,
    "attempt": attempt_number,
})

# ❌ WRONG
print(f"Created campaign {campaign_id}")  # Never use print
logger.info(f"Processing {phone_number}")  # Never log PII
logger.error("Error occurred")  # No context
```

### 2.9 Constants and Configuration

```python
# ✅ CORRECT — constants in a dedicated module or at module top
# src/config.py
import os

ENVIRONMENT = os.environ["ENVIRONMENT"]
DYNAMODB_TABLE = os.environ["DYNAMODB_TABLE_NAME"]
SQS_QUEUE_URL = os.environ["SQS_CAMPAIGN_QUEUE_URL"]

# Backend selection (cost optimization: DynamoDB in Phase 1, Redis in Phase 2+)
RATE_LIMITER_BACKEND = os.environ.get("RATE_LIMITER_BACKEND", "dynamodb")
CACHE_BACKEND = os.environ.get("CACHE_BACKEND", "dynamodb")
SECRETS_BACKEND = os.environ.get("SECRETS_BACKEND", "ssm")  # "ssm" (free) or "secretsmanager"
REDIS_ENDPOINT = os.environ.get("REDIS_ENDPOINT", "")  # Empty in Phase 1

# Business constants
MAX_BATCH_SIZE = 50
MAX_RETRIES = 3
RATE_LIMIT_MESSAGES_PER_HOUR = 1000
COOLDOWN_HOURS_DEFAULT = 24
MESSAGE_TTL_DAYS = 90
CACHE_TTL_SECONDS = 3600  # 1 hour for Loyalty data cache

# ❌ WRONG — magic numbers scattered in code
messages = phone_numbers[:50]  # What is 50?
time.sleep(3)  # Why 3?
if points > 1000:  # What does 1000 mean?
```

### 2.10 Pydantic Models

```python
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class CampaignStatus(str, Enum):
    """Valid campaign lifecycle states."""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    EXECUTING = "executing"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"


class CreateCampaignRequest(BaseModel):
    """Request body for POST /api/v1/campaigns."""
    name: str = Field(..., min_length=1, max_length=200, description="Campaign display name")
    description: str = Field("", max_length=1000)
    type: str = Field(..., pattern="^(birthday|anniversary|festival|offer|new_service|reminder|reengagement|custom)$")
    template_id: str = Field(..., min_length=1)
    segment_id: str = Field(..., min_length=1)
    personalization_mapping: dict[str, str] = Field(default_factory=dict)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Campaign name cannot be blank")
        return v.strip()


class CampaignResponse(BaseModel):
    """Response body for campaign endpoints."""
    campaign_id: str
    tenant_id: str
    name: str
    status: CampaignStatus
    type: str
    template_id: str
    segment_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
```

---

## 3. TypeScript Standards (Frontend)

### 3.1 Language & Tooling

- **TypeScript 5.x** with `strict: true` in tsconfig.
- **Formatter:** Prettier (printWidth: 100, singleQuote: true, trailingComma: "all").
- **Linter:** ESLint with `@typescript-eslint/recommended`, `react-hooks`, `jsx-a11y`.
- **No `any` type.** Use `unknown` if type is truly unknown, then narrow with type guards.
- **No `@ts-ignore`.** Fix the type error or use `@ts-expect-error` with an explanation.

### 3.2 File Naming

```
src/
  components/
    campaign-card.tsx          # Component files: kebab-case
    campaign-card.test.tsx     # Test files: same name + .test
    campaign-wizard/           # Multi-file components: folder
      campaign-wizard.tsx
      step-select-template.tsx
      step-configure.tsx
      index.ts                 # Re-exports
  hooks/
    use-campaigns.ts           # Hooks: kebab-case with use- prefix
    use-debounce.ts
  services/
    campaign-api.ts            # API clients: kebab-case
    whatsapp-api.ts
  types/
    campaign.ts                # Type files: kebab-case
    api-responses.ts
  utils/
    format-date.ts             # Utility files: kebab-case
    phone-utils.ts
  pages/
    campaigns/
      campaign-list-page.tsx   # Page files: kebab-case with -page suffix
      campaign-detail-page.tsx
```

### 3.3 TypeScript Types

```typescript
// ✅ CORRECT — explicit types, no any
interface Campaign {
  campaignId: string;
  tenantId: string;
  name: string;
  status: CampaignStatus;
  type: CampaignType;
  templateId: string;
  segmentId: string;
  createdAt: string;  // ISO 8601
  updatedAt: string;
}

type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'executing'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'failed';

type CampaignType =
  | 'birthday'
  | 'anniversary'
  | 'festival'
  | 'offer'
  | 'new_service'
  | 'reminder'
  | 'reengagement'
  | 'custom';

// ✅ CORRECT — API response types match backend snake_case
interface ApiCampaignResponse {
  campaign_id: string;
  tenant_id: string;
  name: string;
  status: CampaignStatus;
  // ... maps to backend response
}

// Transform API → internal (do this in the API service layer)
function toCampaign(api: ApiCampaignResponse): Campaign {
  return {
    campaignId: api.campaign_id,
    tenantId: api.tenant_id,
    name: api.name,
    status: api.status,
    // ...
  };
}

// ❌ WRONG
const data: any = await response.json();
let campaign = data as Campaign;  // Unsafe cast without validation
```

### 3.4 Component Structure

```typescript
// ✅ CORRECT — standard component structure
import { useState } from 'react';
import { useCampaigns } from '@/hooks/use-campaigns';
import { CampaignCard } from '@/components/campaign-card';
import { EmptyState } from '@/components/empty-state';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import { ErrorState } from '@/components/error-state';
import type { CampaignStatus } from '@/types/campaign';

interface CampaignListProps {
  /** Filter campaigns by status */
  statusFilter?: CampaignStatus;
  /** Number of campaigns per page */
  pageSize?: number;
}

export function CampaignList({ statusFilter, pageSize = 25 }: CampaignListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { data, isLoading, isError, error } = useCampaigns({
    status: statusFilter,
    search: searchQuery,
    limit: pageSize,
  });

  if (isLoading) return <LoadingSkeleton variant="list" count={5} />;
  if (isError) return <ErrorState error={error} onRetry={() => {}} />;
  if (!data?.campaigns.length) return <EmptyState entity="campaign" />;

  return (
    <div className="space-y-4">
      {data.campaigns.map((campaign) => (
        <CampaignCard key={campaign.campaignId} campaign={campaign} />
      ))}
    </div>
  );
}
```

### 3.5 Never Do This

```typescript
// ❌ NEVER — inline styles
<div style={{ marginTop: 20, color: 'red' }}>

// ❌ NEVER — string concatenation for classes
<div className={'card ' + (isActive ? 'active' : '')}>

// ❌ NEVER — useEffect for derived state
useEffect(() => {
  setFilteredCampaigns(campaigns.filter(c => c.status === filter));
}, [campaigns, filter]);

// ✅ INSTEAD — compute during render
const filteredCampaigns = useMemo(
  () => campaigns.filter(c => c.status === filter),
  [campaigns, filter],
);

// ❌ NEVER — suppress eslint in components
// eslint-disable-next-line react-hooks/exhaustive-deps

// ❌ NEVER — index as key when list can reorder
{items.map((item, index) => <Item key={index} />)}

// ✅ CORRECT
{items.map((item) => <Item key={item.id} />)}
```

---

## 4. Git Commit Standards

### 4.1 Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`, `style`

**Scopes:** `campaign`, `segment`, `template`, `analytics`, `billing`, `auth`, `loyalty`, `notification`, `dashboard`, `cdk`, `ci`

**Examples:**
```
feat(campaign): add campaign scheduling with EventBridge
fix(segment): handle empty loyalty data gracefully during evaluation
test(template): add unit tests for Meta template submission
refactor(billing): extract payment gateway abstraction layer
docs(api): update OpenAPI spec for campaign endpoints
chore(ci): add security scan step to GitHub Actions pipeline
```

### 4.2 Branch Naming

```
feature/MKT-123-campaign-scheduling
bugfix/MKT-456-segment-cache-invalidation
hotfix/MKT-789-optout-race-condition
chore/MKT-101-update-dependencies
```

### 4.3 PR Requirements

Every pull request must include:
- Title matching commit convention: `feat(campaign): add scheduling`
- Description with: what changed, why, how to test, screenshots (for UI)
- Link to Linear ticket
- All CI checks passing
- At least one approval (or self-review with Antigravity for solopreneurs)
- No unresolved conversations
- Squash merge to develop

---

## 5. Dependency Management

### 5.1 Python Dependencies

```
# requirements.txt — pinned versions only
aws-lambda-powertools==2.35.0
boto3==1.34.50
pydantic==2.6.1
httpx==0.27.0

# requirements-dev.txt
pytest==8.0.0
pytest-cov==4.1.0
moto[dynamodb,sqs,s3]==5.0.0
ruff==0.3.0
mypy==1.8.0
```

- **Pin exact versions** in requirements.txt (no `>=`, no `~=`).
- **Update monthly** with `pip-audit` for security vulnerabilities.
- **Minimize Lambda dependencies.** Use Lambda layers for shared dependencies.

### 5.2 TypeScript Dependencies

- `package-lock.json` is committed and used (`npm ci` in CI, never `npm install`).
- `devDependencies` are separate from `dependencies`.
- Run `npm audit` in CI pipeline. Fail on high/critical vulnerabilities.
- No packages over 500KB unless justified (check with `bundlephobia.com`).

---

## 6. Code Review Checklist

When reviewing code (human or Claude-generated), verify:

- [ ] Type hints on every function (Python) / TypeScript types on every function
- [ ] No `any` type (TypeScript) or untyped parameters (Python)
- [ ] Error handling: specific exceptions, structured error responses
- [ ] Logging: structured, contextual, no PII
- [ ] Tenant isolation: all DynamoDB queries scoped by tenant_id
- [ ] Tests: unit tests for new logic, edge cases covered
- [ ] No magic numbers: constants are named and documented
- [ ] No hardcoded config: environment variables or CDK config
- [ ] Security: no secrets in code, input validation on all endpoints
- [ ] Performance: no N+1 queries, batch operations where possible
- [ ] Accessibility: ARIA labels, keyboard navigation (frontend)
- [ ] Responsive: works on tablet minimum (frontend)
