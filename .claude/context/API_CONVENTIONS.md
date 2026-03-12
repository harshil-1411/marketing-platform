# API Conventions & Standards

**Project:** Salon WhatsApp Marketing Campaign Platform
**Version:** 1.0 | February 2026
**Audience:** Claude + Antigravity

---

## 1. URL Design

### 1.1 Structure

```
https://{domain}/api/v1/{resource}
https://{domain}/api/v1/{resource}/{id}
https://{domain}/api/v1/{resource}/{id}/{sub-resource}
https://{domain}/api/v1/{resource}/{id}/{action}
```

### 1.2 Rules

- Resources are **plural nouns**: `/campaigns`, `/segments`, `/templates`, `/customers`.
- IDs are **path parameters**: `/campaigns/camp_abc123`.
- Actions use **POST** on a sub-path: `POST /campaigns/{id}/schedule` (not `PUT /campaigns/{id}` with `{action: "schedule"}`).
- Query parameters for **filtering, pagination, sorting**: `?status=draft&limit=25&cursor=abc`.
- No trailing slashes. `/campaigns` not `/campaigns/`.
- No verbs in URLs. Use HTTP methods: `GET` = read, `POST` = create/action, `PUT` = full update, `DELETE` = remove.
- No file extensions. `/campaigns` not `/campaigns.json`.

### 1.3 HTTP Methods

| Method | Purpose | Idempotent | Request Body |
|--------|---------|------------|-------------|
| GET | Read resource(s) | Yes | No |
| POST | Create resource or trigger action | No (use idempotency key) | Yes |
| PUT | Full update of resource | Yes | Yes |
| DELETE | Remove resource | Yes | No |

PATCH is not used. All updates use PUT with the full resource body.

---

## 2. Request Format

### 2.1 Headers

```http
Content-Type: application/json
Authorization: Bearer <jwt_token>
X-Idempotency-Key: <uuid>           # Required on POST (prevents duplicate creates)
X-API-Key: mk_live_a1b2c3d4...      # For API key auth (server-to-server)
```

### 2.2 Request Bodies

```json
// POST /api/v1/campaigns
{
  "name": "Diwali Special Offer",
  "description": "20% off all services",
  "type": "festival",
  "template_id": "tmpl_abc123",
  "segment_id": "seg_def456",
  "personalization_mapping": {
    "1": "customer_name",
    "2": "offer_code"
  }
}
```

Rules:
- All field names use **snake_case** (even though frontend uses camelCase internally).
- Dates are **ISO 8601 UTC**: `"2026-02-27T10:00:00Z"`.
- Phone numbers include **country code without +**: `"919876543210"`.
- IDs are **prefixed strings**: `"camp_abc123"`, `"seg_def456"`.
- Optional fields can be omitted (not sent as null unless explicitly clearing a value).
- Enums are **lowercase strings**: `"draft"`, `"festival"`, `"marketing"`.

---

## 3. Response Format

### 3.1 Success Response Envelope

Every success response uses this envelope:

```json
{
  "data": {
    "campaign_id": "camp_abc123",
    "name": "Diwali Special Offer",
    "status": "draft",
    "created_at": "2026-02-27T10:00:00Z"
  },
  "meta": {
    "request_id": "req_a1b2c3d4e5f6",
    "timestamp": "2026-02-27T10:00:00.123Z"
  }
}
```

### 3.2 List Response with Pagination

```json
{
  "data": [
    { "campaign_id": "camp_1", "name": "Campaign 1", "status": "completed" },
    { "campaign_id": "camp_2", "name": "Campaign 2", "status": "draft" }
  ],
  "meta": {
    "request_id": "req_x1y2z3",
    "timestamp": "2026-02-27T10:00:00Z"
  },
  "pagination": {
    "cursor": "eyJQSyI6IlRFTkFOVCMxMjMiLCJTSyI6IkNBTVBBSUdOIzIwMjYtMDItMjUifQ==",
    "has_more": true,
    "limit": 25
  }
}
```

Pagination rules:
- **Cursor-based only.** No offset/page number (DynamoDB doesn't support offset).
- `cursor` is an opaque base64 string (DynamoDB LastEvaluatedKey encoded).
- `has_more: true` means there are more results (cursor is not null).
- `limit` reflects the actual limit used (may differ from requested if capped).
- Default limit: 25. Maximum limit: 100.

### 3.3 Empty List Response

```json
{
  "data": [],
  "meta": { "request_id": "req_abc", "timestamp": "..." },
  "pagination": { "cursor": null, "has_more": false, "limit": 25 }
}
```

---

## 4. Error Response Format

### 4.1 Standard Error Envelope

```json
{
  "error": {
    "code": "CAMPAIGN_NOT_FOUND",
    "message": "Campaign with ID camp_xyz does not exist.",
    "details": {
      "campaign_id": "camp_xyz"
    },
    "request_id": "req_a1b2c3d4e5f6"
  }
}
```

### 4.2 Validation Error (Multiple Fields)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": {
      "fields": [
        { "field": "name", "message": "Campaign name is required" },
        { "field": "type", "message": "Invalid campaign type 'xyz'" }
      ]
    },
    "request_id": "req_abc123"
  }
}
```

### 4.3 Error Code Catalog

| HTTP Status | Error Code | Description |
|------------|-----------|-------------|
| 400 | `VALIDATION_ERROR` | Request body failed validation |
| 400 | `INVALID_PARAMETER` | Query parameter is invalid |
| 401 | `UNAUTHORIZED` | Missing or invalid authentication |
| 401 | `TOKEN_EXPIRED` | JWT has expired |
| 403 | `FORBIDDEN` | Authenticated but insufficient permissions |
| 403 | `PLAN_LIMIT_EXCEEDED` | Tenant exceeded their plan limits |
| 404 | `NOT_FOUND` | Generic not found |
| 404 | `CAMPAIGN_NOT_FOUND` | Specific campaign not found |
| 404 | `SEGMENT_NOT_FOUND` | Specific segment not found |
| 404 | `TEMPLATE_NOT_FOUND` | Specific template not found |
| 409 | `CONFLICT` | Concurrent modification detected |
| 409 | `INVALID_STATE` | Operation not allowed in current state |
| 409 | `DUPLICATE` | Resource already exists |
| 422 | `TEMPLATE_NOT_APPROVED` | Template not yet approved by Meta |
| 422 | `SEGMENT_EMPTY` | Segment has no matching customers |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 502 | `WHATSAPP_API_ERROR` | WhatsApp Cloud API failure |
| 502 | `LOYALTY_API_ERROR` | Loyalty platform API failure |
| 502 | `PAYMENT_GATEWAY_ERROR` | Stripe/Razorpay failure |
| 503 | `SERVICE_UNAVAILABLE` | Temporary service outage |

### 4.4 Error Mapping in Handler

```python
from aws_lambda_powertools.event_handler.exceptions import (
    BadRequestError,
    NotFoundError as PowertoolsNotFound,
    ServiceError,
    UnauthorizedError,
)
from src.utils.errors import (
    AppError,
    ConflictError,
    ExternalServiceError,
    InvalidStateError,
    NotFoundError,
    PlanLimitError,
    ValidationError,
)

ERROR_MAP = {
    ValidationError: (400, None),
    NotFoundError: (404, PowertoolsNotFound),
    InvalidStateError: (409, None),
    ConflictError: (409, None),
    PlanLimitError: (403, None),
    ExternalServiceError: (502, None),
}

# In handler: catch domain errors and map to HTTP
try:
    result = service.create_campaign(...)
except NotFoundError as e:
    raise PowertoolsNotFound(e.message)
except ValidationError as e:
    raise BadRequestError(e.message)
except InvalidStateError as e:
    raise ServiceError(409, e.message)
except PlanLimitError as e:
    raise ServiceError(403, e.message)
```

---

## 5. Authentication

### 5.1 JWT Auth (Dashboard Users)

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

JWT Claims:
{
  "sub": "user_abc123",             # Cognito user ID
  "email": "admin@salon.com",
  "custom:tenant_id": "tenant_xyz", # Tenant scope
  "custom:role": "admin",           # admin | manager | staff
  "exp": 1709042400,                # Expiry timestamp
  "iss": "https://cognito-idp..."   # Cognito issuer
}
```

### 5.2 API Key Auth (Server-to-Server)

```
X-API-Key: mk_live_a1b2c3d4e5f6g7h8

# API key resolves to:
{
  "key_id": "apikey_abc123",
  "tenant_id": "tenant_xyz",
  "permissions": ["campaigns:read", "customers:read"],
  "environment": "live"
}
```

### 5.3 Auth Middleware Flow

```
Request → API Gateway
  ├── Has Authorization header?
  │     └── Yes → Cognito Authorizer validates JWT → Extract tenant_id from claims
  ├── Has X-API-Key header?
  │     └── Yes → Lambda middleware looks up key hash in DynamoDB → Extract tenant_id + permissions
  └── Neither?
        └── Return 401 UNAUTHORIZED
```

### 5.4 Tenant Scoping Middleware

```python
# CRITICAL: This middleware runs on EVERY request after auth.
# It ensures a tenant can never access another tenant's data.

def enforce_tenant_scope(event, tenant_context: TenantContext):
    """Verify the authenticated tenant matches the requested resource scope.
    
    For path parameters like /tenants/{tenant_id}/campaigns,
    ensure the JWT tenant_id matches the path tenant_id.
    
    For API key auth, ensure the key's tenant_id is used for all queries.
    """
    path_tenant = event.path_parameters.get("tenant_id")
    if path_tenant and path_tenant != tenant_context.tenant_id:
        raise UnauthorizedError("Cannot access resources of another tenant")
```

---

## 6. Rate Limiting

### 6.1 Limits by Plan

| Plan | API Gateway (req/sec) | Custom Lambda Rate | Message Sending |
|------|----------------------|-------------------|-----------------|
| Starter | 1 req/sec | 60 req/min | 1,000/month |
| Growth | 5 req/sec | 300 req/min | 10,000/month |
| Enterprise | 15 req/sec | 1,000 req/min | Unlimited |

### 6.2 Rate Limit Headers

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 287
X-RateLimit-Reset: 1709042460

HTTP/1.1 429 Too Many Requests
Retry-After: 30
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Retry after 30 seconds.",
    "details": { "limit": 300, "window": "1m", "retry_after": 30 }
  }
}
```

---

## 7. Webhook Conventions

### 7.1 Outbound Webhook Payload

```json
{
  "id": "evt_a1b2c3d4",
  "type": "campaign.completed",
  "created_at": "2026-02-27T10:00:00Z",
  "data": {
    "campaign_id": "camp_abc123",
    "tenant_id": "tenant_xyz",
    "name": "Diwali Special Offer",
    "messages_sent": 2450,
    "messages_delivered": 2310,
    "messages_failed": 68
  }
}
```

### 7.2 Webhook Signature Verification

```
X-Webhook-Signature: sha256=a1b2c3d4e5f6...

# Computed as:
HMAC-SHA256(webhook_secret, raw_request_body)
```

### 7.3 Webhook Delivery

- Timeout: 10 seconds.
- Retries: 3 attempts with exponential backoff (10s, 60s, 300s).
- Expect HTTP 2xx from receiver. Anything else is treated as failure.
- After 3 failures, webhook is marked as unhealthy. No further deliveries until manually re-enabled.

---

## 8. OpenAPI Documentation

Every endpoint must be documented in OpenAPI 3.0. Use aws-lambda-powertools' built-in OpenAPI generation:

```python
@app.post("/campaigns")
def create_campaign() -> dict:
    """Create a new marketing campaign.
    
    Creates a campaign in DRAFT status. The campaign must have a valid
    (approved) template and a non-empty segment before it can be scheduled.
    
    ---
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/CreateCampaignRequest'
    responses:
      201:
        description: Campaign created successfully
      400:
        description: Validation error
      404:
        description: Template or segment not found
    tags:
      - Campaigns
    """
```

The auto-generated OpenAPI spec is served at `GET /api/v1/docs` (dev/demo only, disabled in production).

---

## 9. API Versioning Rules

| Change Type | Version Impact | Example |
|------------|---------------|---------|
| Add optional field to response | No version change | Add `click_through_rate` to analytics |
| Add new endpoint | No version change | Add `POST /campaigns/{id}/duplicate` |
| Add optional query parameter | No version change | Add `?sort_by=created_at` |
| Remove field from response | **New version (v2)** | Remove `legacy_field` |
| Change field type | **New version (v2)** | Change `count` from string to int |
| Change error code format | **New version (v2)** | Restructure error envelope |
| Rename endpoint | **New version (v2)** | `/campaigns` → `/marketing-campaigns` |

When introducing v2:
- v1 continues to work for 6 months (deprecation period).
- v1 responses include `Sunset: Sat, 28 Feb 2027 00:00:00 GMT` header.
- Documentation clearly marks v1 as deprecated.
- v1 and v2 can coexist in the same Lambda (route both versions to same handler with version-aware logic).
