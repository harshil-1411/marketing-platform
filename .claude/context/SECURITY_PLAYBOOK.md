# Security Playbook

## WhatsApp Marketing Campaign Platform — Multi-Tenant SaaS

> **Purpose:** This document defines security patterns, threat models, and hardening requirements for a multi-tenant SaaS platform that handles WhatsApp Business credentials, customer PII, and payment information. Every Lambda handler, DynamoDB query, API endpoint, and React component MUST follow these patterns.
>
> **Compliance targets:** OWASP Serverless Top 10, OWASP API Security Top 10, WhatsApp Business API policies, PCI DSS awareness (for payment data), Indian IT Act 2000 / DPDP Act 2023.

---

## 1. Threat Model

### 1.1 System Overview (Trust Boundaries)

```
┌──────────────────────────────────────────────────────────────────────┐
│                         INTERNET (Untrusted)                         │
│                                                                      │
│   [Tenant Dashboard]  [Tenant API Client]  [WhatsApp Webhooks]      │
│         │                    │                     │                  │
└─────────┼────────────────────┼─────────────────────┼─────────────────┘
          │                    │                     │
    ══════╪════════════════════╪═════════════════════╪══════ TRUST BOUNDARY 1
          │                    │                     │         (API Gateway)
          ▼                    ▼                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     API GATEWAY (Rate Limiting)                       │
│                                                                      │
│   [Cognito Auth]        [API Key Auth]      [Webhook Verify]         │
│         │                    │                     │                  │
└─────────┼────────────────────┼─────────────────────┼─────────────────┘
          │                    │                     │
    ══════╪════════════════════╪═════════════════════╪══════ TRUST BOUNDARY 2
          │                    │                     │         (Lambda)
          ▼                    ▼                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    LAMBDA FUNCTIONS (Tenant Isolation)                │
│                                                                      │
│   [Campaign Handler]   [Webhook Handler]   [Billing Handler]         │
│         │                    │                     │                  │
│         ▼                    ▼                     ▼                  │
│   ┌───────────┐   ┌──────────────┐   ┌───────────────┐              │
│   │ DynamoDB  │   │ SQS (FIFO)   │   │ SSM / Secrets │              │
│   │ (Tenant-  │   │ (Campaign    │   │ (Credentials) │              │
│   │  scoped)  │   │  Queue)      │   │               │              │
│   └───────────┘   └──────────────┘   └───────────────┘              │
└──────────────────────────────────────────────────────────────────────┘
```

### 1.2 Threat Categories

| Category | Threat | Impact | Mitigation Section |
|----------|--------|--------|-------------------|
| **Tenant Isolation** | Tenant A accesses Tenant B's data | Critical — data breach, legal liability | §2 |
| **Authentication Bypass** | Attacker forges JWT or API key | Critical — full account takeover | §3 |
| **Injection** | Malicious input in campaign names, templates | High — stored XSS, DynamoDB injection | §4 |
| **Credential Exposure** | WhatsApp token leaked in logs, errors | Critical — account takeover, Meta ban | §5 |
| **Excessive Data Exposure** | API returns more data than needed | Medium — PII leak | §6 |
| **Broken Rate Limiting** | Attacker exhausts WhatsApp API quota | High — service disruption, Meta ban | §7 |
| **Webhook Spoofing** | Attacker sends fake delivery webhooks | High — incorrect analytics, billing fraud | §8 |
| **Payment Fraud** | Manipulated billing, plan limit bypass | High — revenue loss | §9 |
| **PII Mishandling** | Customer phone numbers leaked or over-retained | High — DPDP Act violation, fines | §10 |
| **Supply Chain** | Malicious npm/pip package | High — code execution in Lambda | §11 |

---

## 2. Tenant Isolation (CRITICAL)

This is the single most important security concern in the platform. A tenant isolation failure means one salon can read another salon's customer data, campaigns, or credentials.

### 2.1 DynamoDB Tenant Scoping — Mandatory on EVERY Query

```python
# ✅ CORRECT — Every DynamoDB operation starts with tenant_id
def get_campaign(self, tenant_id: str, campaign_id: str) -> Campaign | None:
    response = self._table.get_item(
        Key={
            "PK": f"TENANT#{tenant_id}",
            "SK": f"CAMPAIGN#{campaign_id}",
        }
    )
    item = response.get("Item")
    return self._from_dynamo(item) if item else None


# ❌ NEVER — Query without tenant scoping
def get_campaign_BROKEN(self, campaign_id: str) -> Campaign | None:
    # SECURITY VULNERABILITY: No tenant scoping — could return any tenant's campaign
    response = self._table.get_item(
        Key={"PK": f"CAMPAIGN#{campaign_id}", "SK": "METADATA"}
    )
```

**Rule:** Every DynamoDB `PK` for tenant-owned data MUST start with `TENANT#<tenant_id>`. The ONLY exceptions are cross-tenant operational patterns (`SCHEDULE#<date>`, `CAMPAIGN#<id>` for message tracking).

### 2.2 Tenant Context Extraction — Single Source of Truth

```python
# src/utils/auth.py
from dataclasses import dataclass
from aws_lambda_powertools.event_handler import APIGatewayRestResolver


@dataclass(frozen=True)
class TenantContext:
    """Immutable tenant context extracted from JWT or API key. Created once per request."""
    tenant_id: str
    user_id: str
    email: str
    role: str  # "owner", "admin", "staff"


def get_tenant_context(app: APIGatewayRestResolver) -> TenantContext:
    """Extract tenant context from Cognito JWT claims.

    NEVER trust client-supplied tenant_id from request body, query params, or headers.
    ALWAYS extract from the verified JWT token.
    """
    claims = app.current_event.request_context.authorizer.claims
    return TenantContext(
        tenant_id=claims["custom:tenant_id"],
        user_id=claims["sub"],
        email=claims["email"],
        role=claims["custom:role"],
    )


def require_role(context: TenantContext, allowed_roles: list[str]) -> None:
    """Enforce RBAC. Raises UnauthorizedError if role not in allowed list."""
    if context.role not in allowed_roles:
        raise UnauthorizedError(
            f"Role '{context.role}' is not authorized for this action"
        )
```

### 2.3 Handler-Level Enforcement

```python
@app.post("/v1/campaigns")
@tracer.capture_method
def create_campaign():
    ctx = get_tenant_context(app)  # Extract from JWT — NEVER from request body
    body = app.current_event.json_body

    # CRITICAL: tenant_id comes from JWT, not from the body
    campaign = service.create_campaign(
        tenant_id=ctx.tenant_id,  # ← From JWT
        user_id=ctx.user_id,      # ← From JWT
        name=body["name"],        # ← From request (validated by Pydantic)
        campaign_type=body["type"],
    )

    # Log with tenant context for audit trail
    logger.info("Campaign created", extra={
        "tenant_id": ctx.tenant_id,
        "campaign_id": campaign.id,
        "action": "campaign.create",
    })

    return api_response(data=campaign.to_api_dict(), status_code=201)
```

### 2.4 Tenant Isolation Tests — Mandatory for Every Repository

```python
class TestTenantIsolation:
    """Every repository MUST have tenant isolation tests."""

    def test_cannot_read_other_tenants_campaign(self, campaign_repo, dynamodb_table):
        """Tenant A's campaign must not be visible to Tenant B."""
        # Arrange — create campaign for Tenant A
        campaign = Campaign(tenant_id="tenant_a", campaign_id="camp_123", ...)
        campaign_repo.put(campaign)

        # Act — attempt to read as Tenant B
        result = campaign_repo.get(tenant_id="tenant_b", campaign_id="camp_123")

        # Assert — must return None, NOT Tenant A's campaign
        assert result is None

    def test_list_only_returns_own_tenant_campaigns(self, campaign_repo, dynamodb_table):
        """List endpoint must only return campaigns for the requesting tenant."""
        # Arrange — create campaigns for both tenants
        campaign_repo.put(Campaign(tenant_id="tenant_a", campaign_id="camp_1", ...))
        campaign_repo.put(Campaign(tenant_id="tenant_a", campaign_id="camp_2", ...))
        campaign_repo.put(Campaign(tenant_id="tenant_b", campaign_id="camp_3", ...))

        # Act
        results = campaign_repo.list_by_tenant(tenant_id="tenant_a")

        # Assert — only Tenant A's campaigns
        assert len(results.items) == 2
        assert all(c.tenant_id == "tenant_a" for c in results.items)

    def test_cannot_update_other_tenants_campaign(self, campaign_repo, dynamodb_table):
        """Tenant B cannot update Tenant A's campaign status."""
        campaign = Campaign(tenant_id="tenant_a", campaign_id="camp_1", status="draft", ...)
        campaign_repo.put(campaign)

        # Act — attempt to update as Tenant B
        with pytest.raises(NotFoundError):
            campaign_repo.update_status(
                tenant_id="tenant_b",  # Wrong tenant
                campaign_id="camp_1",
                new_status="scheduled",
                expected_version=1,
            )
```

**Coverage requirement:** 100% of repository methods MUST have a tenant isolation test. No exceptions.

---

## 3. Authentication & Authorization

### 3.1 JWT Authentication (Dashboard Users)

```
Request Flow:
Browser → API Gateway → Cognito User Pool Authorizer → Lambda

JWT Claims (set during registration):
{
  "sub": "user_abc123",               // Cognito user ID
  "email": "owner@salon.com",
  "custom:tenant_id": "tenant_xyz",   // Set by admin — immutable
  "custom:role": "owner",             // owner | admin | staff
  "exp": 1709136000,                  // Token expiry
  "iss": "https://cognito-idp.ap-south-1.amazonaws.com/us-east-1_xxx"
}
```

**Rules:**
- `custom:tenant_id` is set during user registration by admin and CANNOT be changed by the user
- Token expiry: 1 hour for access tokens, 30 days for refresh tokens
- Cognito handles token validation — Lambda never validates JWTs manually
- NEVER extract tenant_id from request body, query params, or custom headers

### 3.2 API Key Authentication (Server-to-Server)

```python
# API key format: mk_live_<random_32_chars> (live) or mk_test_<random_32_chars> (test)
# Storage: DynamoDB item with hashed key

# Key lookup pattern:
# PK: APIKEY#<sha256_hash_of_key>
# SK: METADATA
# Attributes: tenant_id, permissions[], environment, created_at, last_used_at

def validate_api_key(api_key: str) -> TenantContext:
    """Validate API key and return tenant context.

    SECURITY: Store SHA-256 hash only. Never store raw API key.
    """
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()

    response = table.get_item(
        Key={"PK": f"APIKEY#{key_hash}", "SK": "METADATA"}
    )
    item = response.get("Item")
    if not item:
        raise UnauthorizedError("Invalid API key")

    # Check environment (test keys can't hit production)
    if item["environment"] != ENVIRONMENT:
        raise UnauthorizedError("API key environment mismatch")

    # Update last_used_at (async, non-blocking)
    table.update_item(
        Key={"PK": f"APIKEY#{key_hash}", "SK": "METADATA"},
        UpdateExpression="SET last_used_at = :now",
        ExpressionAttributeValues={":now": datetime.now(timezone.utc).isoformat()},
    )

    return TenantContext(
        tenant_id=item["tenant_id"],
        user_id=f"apikey:{item['key_id']}",
        email="",
        role="api",
    )
```

### 3.3 RBAC (Role-Based Access Control)

| Action | Owner | Admin | Staff | API Key |
|--------|-------|-------|-------|---------|
| Create campaign | ✅ | ✅ | ✅ | ✅ |
| Schedule campaign | ✅ | ✅ | ❌ | ✅ (with permission) |
| Delete campaign | ✅ | ✅ | ❌ | ❌ |
| Manage templates | ✅ | ✅ | ❌ | ✅ (with permission) |
| View analytics | ✅ | ✅ | ✅ | ✅ |
| Manage team members | ✅ | ❌ | ❌ | ❌ |
| Manage billing | ✅ | ❌ | ❌ | ❌ |
| Manage API keys | ✅ | ✅ | ❌ | ❌ |
| Configure webhooks | ✅ | ✅ | ❌ | ❌ |

---

## 4. Input Validation & Injection Prevention

### 4.1 Pydantic Models — Validate at the Edge

```python
from pydantic import BaseModel, Field, field_validator
import re


class CreateCampaignRequest(BaseModel):
    """Validate campaign creation input. Rejects injection attempts."""
    name: str = Field(min_length=1, max_length=200)
    campaign_type: str = Field(alias="type")
    segment_id: str = Field(pattern=r"^seg_[a-zA-Z0-9]{12,}$")
    template_id: str = Field(pattern=r"^tmpl_[a-zA-Z0-9]{12,}$")
    scheduled_at: str | None = None

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        """Strip dangerous characters. Campaign names appear in logs and UI."""
        v = v.strip()
        # Remove control characters, null bytes
        v = re.sub(r"[\x00-\x1f\x7f-\x9f]", "", v)
        # Limit to safe characters (alphanumeric, spaces, basic punctuation)
        if not re.match(r"^[\w\s\-.,!?()&'\"]+$", v, re.UNICODE):
            raise ValueError("Campaign name contains invalid characters")
        return v

    @field_validator("campaign_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        allowed = {"one_time", "recurring", "triggered", "festival"}
        if v not in allowed:
            raise ValueError(f"Invalid campaign type. Allowed: {allowed}")
        return v
```

### 4.2 DynamoDB Injection Prevention

DynamoDB uses attribute names and values in expressions. While not SQL-injectable, expression injection is possible:

```python
# ❌ NEVER — String concatenation in expressions
filter_expr = f"#status = {user_input}"  # INJECTION RISK

# ✅ CORRECT — Always use ExpressionAttributeValues
response = table.query(
    KeyConditionExpression=Key("PK").eq(f"TENANT#{tenant_id}"),
    FilterExpression=Attr("status").eq(status),  # boto3 handles escaping
    ExpressionAttributeValues={":status": status},  # Parameterized
)
```

### 4.3 XSS Prevention in React

```tsx
// ❌ NEVER — Render raw HTML from backend
<div dangerouslySetInnerHTML={{ __html: campaign.name }} />

// ✅ CORRECT — React auto-escapes by default
<div>{campaign.name}</div>

// ✅ CORRECT — Sanitize when rendering template previews (if HTML is necessary)
import DOMPurify from "dompurify";
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(templatePreview) }} />
```

### 4.4 WhatsApp Template Variable Injection

```python
# Template variables come from customer data. Sanitize before sending to Meta.
def sanitize_template_variable(value: str) -> str:
    """Sanitize variable values before injection into WhatsApp templates.

    WhatsApp templates use {{1}}, {{2}} placeholders. Values must not contain
    formatting that could break the message or inject content.
    """
    # Remove newlines (could break message formatting)
    value = value.replace("\n", " ").replace("\r", "")
    # Truncate to 1024 chars (Meta limit per variable)
    value = value[:1024]
    # Strip leading/trailing whitespace
    value = value.strip()
    return value
```

---

## 5. Credential & Secret Management

### 5.1 Never Log Secrets

```python
# ❌ NEVER — Secrets in logs
logger.info(f"Calling WhatsApp API with token: {access_token}")
logger.info(f"Stripe key: {stripe_key}")

# ❌ NEVER — Secrets in error messages
raise ExternalServiceError(f"WhatsApp API failed with token {access_token}")

# ✅ CORRECT — Log the operation, not the credential
logger.info("Calling WhatsApp API", extra={
    "phone_number_id": phone_number_id,
    "template_name": template_name,
    "recipient_count": len(recipients),
})

# ✅ CORRECT — Mask in errors
raise ExternalServiceError("WhatsApp API returned 401 — check WHATSAPP_ACCESS_TOKEN parameter")
```

### 5.2 Secret Retrieval Pattern

```python
# src/utils/secrets.py
import os
from functools import lru_cache
import boto3


@lru_cache(maxsize=32)
def get_secret(name: str) -> str:
    """Retrieve secret from SSM (Phase 1) or Secrets Manager (Phase 2+).

    Cached for Lambda lifetime (cold start resets cache).
    NEVER log the returned value.
    """
    backend = os.environ.get("SECRETS_BACKEND", "ssm")

    if backend == "secretsmanager":
        client = boto3.client("secretsmanager")
        return client.get_secret_value(SecretId=name)["SecretString"]
    else:
        client = boto3.client("ssm")
        return client.get_parameter(Name=name, WithDecryption=True)["Parameter"]["Value"]
```

### 5.3 WhatsApp Token Security

| Concern | Mitigation |
|---------|-----------|
| Token in environment variable | Retrieve from SSM at runtime, NOT in CDK environment variables |
| Token in Lambda logs | PowerTools Logger with `PII_FIELDS` filter strips tokens |
| Token in error responses | Never include in API error responses — use generic messages |
| Token rotation | Phase 1: Manual rotation, update SSM parameter. Phase 2+: Secrets Manager auto-rotation |
| Token in source code | `.gitignore` all `.env` files. Pre-commit hook blocks secrets |

### 5.4 Pre-Commit Secret Scanning

```bash
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.21.0
    hooks:
      - id: gitleaks

# Patterns to detect:
# - WhatsApp access tokens (EAAx...)
# - Stripe keys (sk_live_..., sk_test_..., whsec_...)
# - Razorpay keys (rzp_live_..., rzp_test_...)
# - AWS access keys (AKIA...)
# - Generic high-entropy strings
```

---

## 6. API Response Security

### 6.1 Never Over-Expose Data

```python
# ❌ NEVER — Return raw DynamoDB item (leaks internal fields)
def get_campaign(campaign_id):
    item = table.get_item(Key=...)["Item"]
    return api_response(data=item)  # EXPOSES: PK, SK, GSI keys, version, ttl, etc.

# ✅ CORRECT — Return only API-safe fields via domain model
class Campaign:
    def to_api_dict(self) -> dict:
        """Only fields the API consumer needs. No internal DynamoDB structure."""
        return {
            "id": self.campaign_id,
            "name": self.name,
            "type": self.campaign_type,
            "status": self.status,
            "segment_id": self.segment_id,
            "template_id": self.template_id,
            "scheduled_at": self.scheduled_at,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            # EXCLUDED: tenant_id, PK, SK, GSI keys, version, ttl, entity_type
        }
```

### 6.2 Mask PII in API Responses

```python
# Customer phone numbers in message logs should be masked
def mask_phone(phone: str) -> str:
    """Mask phone number to last 4 digits. Use in API responses and logs."""
    if len(phone) < 4:
        return "****"
    return "*" * (len(phone) - 4) + phone[-4:]

# Example: "919876543210" → "********3210"
```

### 6.3 Security Response Headers

Set via API Gateway or CloudFront:

```python
SECURITY_HEADERS = {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "0",  # Disabled — use CSP instead
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
}
```

---

## 7. Rate Limiting & Abuse Prevention

### 7.1 Multi-Layer Rate Limiting

```
Layer 1: API Gateway         — 100 req/sec (solo), 500 req/sec (prod)
Layer 2: Application          — DynamoDB TTL counter per tenant per endpoint
Layer 3: WhatsApp API         — 80 calls/sec (Meta limit), tenant-scoped
Layer 4: Customer Cooldown    — 24h between marketing messages to same number
```

### 7.2 Tenant-Level Rate Limit (Application Layer)

```python
def check_tenant_rate_limit(tenant_id: str, plan: str) -> bool:
    """Enforce plan-specific rate limits.

    Starter: 1 req/sec, 60 req/min, 1K messages/month
    Growth: 5 req/sec, 300 req/min, 10K messages/month
    Enterprise: 15 req/sec, 1K req/min, unlimited messages

    Uses DynamoDB TTL counter (Phase 1) or Redis (Phase 2+).
    """
    limits = PLAN_LIMITS[plan]
    rate_limiter = create_rate_limiter()

    # Check per-second limit
    if not rate_limiter.check_and_increment(
        tenant_id=tenant_id,
        key="api_requests_per_second",
        limit=limits["requests_per_second"],
        window_seconds=1,
    ):
        return False

    # Check per-minute limit
    if not rate_limiter.check_and_increment(
        tenant_id=tenant_id,
        key="api_requests_per_minute",
        limit=limits["requests_per_minute"],
        window_seconds=60,
    ):
        return False

    return True
```

### 7.3 Monthly Message Quota Enforcement

```python
def check_monthly_message_quota(tenant_id: str, plan: str) -> tuple[bool, int]:
    """Check if tenant has remaining monthly message quota.

    DynamoDB atomic counter pattern — concurrent-safe.
    """
    now = datetime.now(timezone.utc)
    month_key = f"{now.year}-{now.month:02d}"
    limit = PLAN_LIMITS[plan]["messages_per_month"]

    if limit == -1:  # Enterprise: unlimited
        return True, -1

    response = table.get_item(
        Key={"PK": f"TENANT#{tenant_id}", "SK": f"USAGE#{month_key}"},
        ProjectionExpression="message_count",
    )
    current = response.get("Item", {}).get("message_count", 0)
    remaining = max(0, limit - current)

    if remaining <= 0:
        raise PlanLimitError(
            f"Monthly message limit of {limit} reached",
            details={"limit": limit, "used": current, "plan": plan},
        )

    return True, remaining
```

---

## 8. Webhook Security

### 8.1 WhatsApp Webhook Verification (Inbound)

```python
import hmac
import hashlib

def verify_whatsapp_webhook_signature(
    payload: bytes,
    signature_header: str,
    app_secret: str,
) -> bool:
    """Verify Meta webhook signature.

    Meta signs webhooks with HMAC-SHA256 using the App Secret.
    signature_header format: "sha256=<hex_digest>"

    NEVER process webhook payload before verifying signature.
    """
    if not signature_header or not signature_header.startswith("sha256="):
        return False

    expected_sig = signature_header[7:]  # Remove "sha256=" prefix
    computed_sig = hmac.new(
        app_secret.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()

    # Constant-time comparison to prevent timing attacks
    return hmac.compare_digest(computed_sig, expected_sig)
```

### 8.2 Outbound Webhook Signing (To Tenants)

```python
def sign_webhook_payload(payload: bytes, webhook_secret: str) -> str:
    """Sign outbound webhook payload for tenant verification.

    Tenants verify: sha256=HMAC-SHA256(webhook_secret, raw_body)
    """
    signature = hmac.new(
        webhook_secret.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()
    return f"sha256={signature}"
```

### 8.3 Webhook Idempotency

```python
def is_webhook_already_processed(webhook_id: str) -> bool:
    """Check if webhook was already processed (deduplicate).

    DynamoDB item with TTL auto-expiry after 48 hours.
    Prevents replay attacks and duplicate processing.
    """
    try:
        table.put_item(
            Item={
                "PK": "WEBHOOK_DEDUP",
                "SK": f"WH#{webhook_id}",
                "processed_at": datetime.now(timezone.utc).isoformat(),
                "ttl": int(datetime.now(timezone.utc).timestamp()) + 172800,  # 48h
            },
            ConditionExpression=Attr("PK").not_exists(),
        )
        return False  # First time — not a duplicate
    except table.meta.client.exceptions.ConditionalCheckFailedException:
        return True  # Already processed — skip
```

---

## 9. Payment Security

### 9.1 Stripe Webhook Verification

```python
import stripe

def verify_stripe_webhook(payload: bytes, sig_header: str) -> stripe.Event:
    """Verify Stripe webhook signature.

    NEVER trust the event data without verification.
    ALWAYS use Stripe's official verification.
    """
    webhook_secret = get_secret("/salon-marketing/solo/STRIPE_WEBHOOK_SECRET")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
        return event
    except stripe.error.SignatureVerificationError:
        raise ValidationError("Invalid Stripe webhook signature")
```

### 9.2 Plan Limit Enforcement

```python
# CRITICAL: Plan limits checked at BOTH service layer AND API layer.
# Service layer is the authority — API layer is defense-in-depth.

def enforce_plan_limits(tenant_id: str, action: str) -> None:
    """Check tenant's plan allows the requested action.

    Examples:
    - Starter plan: 3 active campaigns max
    - Growth plan: 20 active campaigns max
    - Starter plan: No A/B testing
    - Starter plan: No API key access
    """
    plan = get_tenant_plan(tenant_id)
    limits = PLAN_LIMITS[plan]

    if action == "create_campaign":
        active = count_active_campaigns(tenant_id)
        if active >= limits["max_active_campaigns"]:
            raise PlanLimitError(
                f"{plan} plan allows {limits['max_active_campaigns']} active campaigns",
                details={"current": active, "limit": limits["max_active_campaigns"]},
            )

    if action == "create_api_key" and plan == "starter":
        raise PlanLimitError("API key access requires Growth plan or higher")

    if action == "create_ab_test" and plan == "starter":
        raise PlanLimitError("A/B testing requires Growth plan or higher")
```

---

## 10. PII Handling & Data Retention

### 10.1 PII Classification

| Data Field | PII Level | Storage | Retention | Log Policy |
|-----------|-----------|---------|-----------|-----------|
| Customer phone number | **High** | DynamoDB (encrypted at rest) | While tenant active + 30 days | Mask to last 4 digits |
| Customer name | **Medium** | DynamoDB (encrypted at rest) | While tenant active + 30 days | Never log |
| Email address | **Medium** | Cognito + DynamoDB | While account active | Mask in logs (a***@domain.com) |
| Message content | **Medium** | DynamoDB with TTL | 90 days | Never log full content |
| WhatsApp tokens | **Critical** | SSM Parameter Store (encrypted) | Until rotated | NEVER log |
| Payment card info | **Critical** | Never stored (Stripe/Razorpay handles) | N/A | NEVER log |
| IP addresses | **Low** | CloudWatch API Gateway logs | 7-90 days (by env) | Allowed in access logs |

### 10.2 Data Retention Automation

```python
# DynamoDB TTL auto-deletes expired data — no cron job needed
TTL_POLICIES = {
    "messages": 90 * 24 * 3600,        # 90 days — delivery records
    "analytics": 90 * 24 * 3600,       # 90 days — campaign metrics
    "cooldown": 48 * 3600,             # 48 hours — customer cooldown
    "rate_limit": 3600 + 60,           # 1 hour + buffer — rate limit windows
    "cache": 3600,                     # 1 hour — loyalty/template cache
    "webhook_dedup": 48 * 3600,        # 48 hours — webhook idempotency
}
```

### 10.3 Opt-Out Compliance

```python
def process_opt_out(tenant_id: str, phone: str) -> None:
    """Process customer opt-out request.

    WhatsApp Business Policy: Must honor opt-out within 24 hours.
    DPDP Act: Must delete PII on request.
    """
    # 1. Record opt-out (prevents future messages)
    table.put_item(Item={
        "PK": f"TENANT#{tenant_id}",
        "SK": f"OPTOUT#{phone}",
        "opted_out_at": datetime.now(timezone.utc).isoformat(),
        "entity_type": "OptOut",
    })

    # 2. Remove customer from all active segments
    segments = list_segments_containing_customer(tenant_id, phone)
    for segment in segments:
        remove_customer_from_segment(tenant_id, segment.segment_id, phone)

    # 3. Cancel any scheduled campaigns targeting this customer
    cancel_pending_messages_for_customer(tenant_id, phone)

    # 4. Log for compliance audit (no PII in log — use masked phone)
    logger.info("Customer opt-out processed", extra={
        "tenant_id": tenant_id,
        "phone_masked": mask_phone(phone),
        "segments_removed": len(segments),
    })
```

---

## 11. Supply Chain Security

### 11.1 Dependency Pinning

```bash
# Python: Pin exact versions
# requirements.txt
boto3==1.35.47
aws-lambda-powertools==3.3.0
pydantic==2.10.2
stripe==11.3.0
# ... all pinned, no ranges

# Node.js: Lock file committed
# package-lock.json MUST be committed to git
```

### 11.2 Automated Vulnerability Scanning

```yaml
# .github/workflows/security.yml
name: Security Scan
on:
  push:
    branches: [main]
  schedule:
    - cron: "0 8 * * 1"  # Weekly Monday 8am

jobs:
  python-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install pip-audit
      - run: pip-audit -r requirements.txt

  npm-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd frontend && npm audit --audit-level=high

  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## 12. Logging & Audit Trail

### 12.1 Structured Security Logging

```python
# Every security-relevant action gets a structured log entry
# These logs feed into CloudWatch and can trigger alarms

SECURITY_EVENTS = {
    "auth.login_success": "INFO",
    "auth.login_failure": "WARN",
    "auth.token_expired": "INFO",
    "auth.invalid_api_key": "WARN",
    "auth.role_violation": "WARN",
    "tenant.isolation_attempt": "ERROR",   # Should NEVER appear
    "campaign.created": "INFO",
    "campaign.scheduled": "INFO",
    "campaign.sent": "INFO",
    "customer.opt_out": "INFO",
    "customer.data_deleted": "INFO",
    "webhook.signature_invalid": "WARN",
    "webhook.replay_detected": "WARN",
    "rate_limit.exceeded": "WARN",
    "plan_limit.exceeded": "WARN",
    "payment.webhook_received": "INFO",
    "payment.subscription_changed": "INFO",
    "secret.rotation_triggered": "INFO",
}

def log_security_event(
    event_type: str,
    tenant_id: str,
    details: dict | None = None,
) -> None:
    """Log security event with structured metadata."""
    level = SECURITY_EVENTS.get(event_type, "INFO")
    log_fn = getattr(logger, level.lower(), logger.info)

    log_fn(event_type, extra={
        "security_event": event_type,
        "tenant_id": tenant_id,
        **(details or {}),
    })
```

### 12.2 CloudWatch Alarms (Security)

```python
# CDK alarm definitions (in monitoring_stack.py)
SECURITY_ALARMS = [
    {
        "name": "TenantIsolationAttempt",
        "metric_filter": '{ $.security_event = "tenant.isolation_attempt" }',
        "threshold": 1,      # Alert on ANY occurrence
        "period_seconds": 60,
        "description": "CRITICAL: Tenant isolation violation detected",
    },
    {
        "name": "HighAuthFailureRate",
        "metric_filter": '{ $.security_event = "auth.login_failure" }',
        "threshold": 10,
        "period_seconds": 300,  # 10 failures in 5 minutes
        "description": "Possible brute-force or credential stuffing attack",
    },
    {
        "name": "WebhookSignatureFailures",
        "metric_filter": '{ $.security_event = "webhook.signature_invalid" }',
        "threshold": 5,
        "period_seconds": 300,
        "description": "Possible webhook spoofing attack",
    },
    {
        "name": "InvalidAPIKeySpike",
        "metric_filter": '{ $.security_event = "auth.invalid_api_key" }',
        "threshold": 20,
        "period_seconds": 300,
        "description": "Possible API key brute-force attempt",
    },
]
```

---

## 13. Security Review Checklist for Claude / Antigravity

When Claude generates code, apply this checklist before approving:

### 13.1 Every Lambda Handler

- [ ] Extracts tenant_id from JWT/API key — NEVER from request body
- [ ] Calls `require_role()` for write operations
- [ ] Input validated with Pydantic model
- [ ] Error responses don't leak internal details
- [ ] Structured logging with tenant context (no PII)
- [ ] Metrics emitted for business operations

### 13.2 Every DynamoDB Operation

- [ ] PK starts with `TENANT#<tenant_id>` for tenant-owned data
- [ ] Uses `ConditionExpression` on writes (prevents duplicates/race conditions)
- [ ] Returns domain model — NEVER raw DynamoDB item
- [ ] Uses `ProjectionExpression` (returns only needed attributes)
- [ ] TTL set on ephemeral data (messages, cache, rate limits)

### 13.3 Every API Endpoint

- [ ] Authentication required (Cognito or API key)
- [ ] Rate limiting applied
- [ ] Response uses `to_api_dict()` — no internal fields exposed
- [ ] Phone numbers masked in responses
- [ ] Security headers set
- [ ] Pagination with cursor (no offset)

### 13.4 Every React Component

- [ ] No `dangerouslySetInnerHTML` without DOMPurify
- [ ] API tokens stored in httpOnly cookies or memory — NEVER localStorage
- [ ] Form inputs have maxLength constraints
- [ ] Error messages don't display stack traces
- [ ] ARIA attributes for accessibility

### 13.5 Every External Integration

- [ ] Webhook signatures verified before processing
- [ ] API calls have explicit timeout (10s)
- [ ] Credentials fetched from SSM/Secrets Manager at runtime
- [ ] External errors mapped to domain errors (no raw exceptions)
- [ ] Phone numbers masked in logs (last 4 digits only)

---

## 14. Incident Response

### 14.1 If a Tenant Isolation Violation is Detected

1. **IMMEDIATE:** Disable the affected API endpoint (API Gateway stage variable toggle)
2. **INVESTIGATE:** Check CloudWatch Logs for the `tenant.isolation_attempt` event
3. **ASSESS:** Determine if data was actually exposed or just an access attempt
4. **FIX:** Deploy hotfix with corrected tenant scoping
5. **NOTIFY:** If data was exposed, notify affected tenants within 72 hours (DPDP Act)
6. **POST-MORTEM:** Document root cause, add regression test, update this playbook

### 14.2 If WhatsApp Token is Compromised

1. **IMMEDIATE:** Rotate token in Meta Business Manager
2. **UPDATE:** Update SSM parameter with new token
3. **RESTART:** Force Lambda cold starts (`aws lambda update-function-configuration`)
4. **AUDIT:** Check CloudWatch for unauthorized API calls during exposure window
5. **NOTIFY:** Meta if suspicious activity detected
