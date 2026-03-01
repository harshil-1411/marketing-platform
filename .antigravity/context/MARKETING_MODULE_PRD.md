# WhatsApp Marketing Campaign Management Platform — Product Requirements Document

**Version:** 2.0
**Date:** February 26, 2026
**Prepared For:** Antigravity + Claude Development Pipeline
**Prepared By:** Ajna Capital — Tech Development Team
**Status:** Final — Ready for Development

---

## Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [2. Platform Vision and Positioning](#2-platform-vision-and-positioning)
- [3. Multi-Tenant Architecture](#3-multi-tenant-architecture)
- [4. API-First Design Philosophy](#4-api-first-design-philosophy)
- [5. Core Features — Marketing Campaign Engine](#5-core-features--marketing-campaign-engine)
- [6. Loyalty Management Platform Integration](#6-loyalty-management-platform-integration)
- [7. Notification System](#7-notification-system)
- [8. Pricing Plans and Billing](#8-pricing-plans-and-billing)
- [9. Payment Gateway Integration](#9-payment-gateway-integration)
- [10. Tenant Onboarding and Administration](#10-tenant-onboarding-and-administration)
- [11. Analytics and Reporting](#11-analytics-and-reporting)
- [12. Security, Compliance, and Data Isolation](#12-security-compliance-and-data-isolation)
- [13. API Specifications](#13-api-specifications)
- [14. Frontend — Admin Dashboard](#14-frontend--admin-dashboard)
- [15. Non-Functional Requirements](#15-non-functional-requirements)
- [16. Database Design — DynamoDB Single-Table](#16-database-design--dynamodb-single-table)
- [17. Infrastructure and Deployment](#17-infrastructure-and-deployment)
- [18. Testing Strategy](#18-testing-strategy)
- [19. Development Phases and Timeline](#19-development-phases-and-timeline)
- [20. Risks and Mitigations](#20-risks-and-mitigations)
- [21. Success Metrics](#21-success-metrics)
- [22. Appendices](#22-appendices)

---

## 1. Executive Summary

This document defines the complete product requirements for a **multi-tenant, API-first WhatsApp Marketing Campaign Management Platform** built as a standalone SaaS product. The platform enables salons and other businesses to run targeted WhatsApp marketing campaigns with customer segmentation, template management, campaign scheduling, real-time analytics, and full compliance with WhatsApp Business policies.

The platform integrates bidirectionally with the **existing Loyalty Management SaaS platform** (already in production) so that tenants who are onboarded on both platforms can share customer data, loyalty tiers, transaction history, and engagement metrics seamlessly.

### Key Differentiators

- **API-First:** Every feature is exposed as a versioned REST API before any UI is built. Third-party systems, the Loyalty platform, and the admin dashboard all consume the same APIs.
- **Multi-Tenant:** Single deployment serves multiple salon tenants with strict data isolation, per-tenant configuration, and independent WhatsApp Business accounts.
- **Cross-Platform Intelligence:** Tenants on both Marketing and Loyalty platforms get enriched customer profiles, smarter segmentation (based on loyalty data), and unified engagement tracking.
- **Pay-As-You-Grow:** Usage-based pricing aligned with WhatsApp API costs so salons of any size can adopt the platform without large upfront commitments.

### Technology Stack

| Layer | Phase 1 (0-50 Tenants) | Phase 2+ (50+ Tenants) |
|-------|------------------------|------------------------|
| Runtime | Python 3.12 on AWS Lambda (ARM64) | Same |
| API Gateway | Amazon API Gateway (REST) | Same |
| Database | Amazon DynamoDB (single-table, multi-tenant) | Same |
| Queue | Amazon SQS (FIFO) + EventBridge Scheduler | Same |
| Rate Limiting | DynamoDB TTL-based counters (free) | Amazon ElastiCache Redis (sliding window) |
| Caching | DynamoDB direct reads (single-digit ms) | Amazon ElastiCache Redis (sub-ms) |
| Auth | Amazon Cognito (tenant-aware) | Same |
| Secrets | SSM Parameter Store SecureString (free) | AWS Secrets Manager (auto-rotation) |
| Frontend | React 18 + TypeScript + Tailwind CSS | Same |
| Hosting | CloudFront + S3 (free tier) | Same |
| IaC | AWS CDK (Python) | Same |
| Payments | Stripe (international) + Razorpay (India) | Same |
| Monitoring | CloudWatch + X-Ray (free tier) | CloudWatch + X-Ray + Sentry |
| Networking | No VPC (Lambda public) | VPC + NAT Gateway (for Redis) |
| WAF | API Gateway throttling (built-in) | AWS WAF |
| WhatsApp | Meta Cloud API (direct integration) | Same |

> **Cost Impact:** Phase 1 runs at **$0-$1/month** on AWS Free Tier. Phase 2 adds ~$50-80/month when Redis, VPC, and Sentry are introduced. See [Deployment Phases & Cost Optimization](#deployment-phases--cost-optimization) for migration triggers.

---

## 2. Platform Vision and Positioning

### 2.1 Target Market

Primary: Salon chains and independent salons in India and Southeast Asia that already use or plan to use WhatsApp Business for customer communication.

Secondary: Any service-based business (spas, gyms, clinics, restaurants) that needs WhatsApp marketing automation.

### 2.2 Value Proposition

For salon owners: "Run targeted WhatsApp campaigns to the right customers at the right time — birthday wishes, festival offers, re-engagement nudges — without manual effort, with full analytics on what works."

For technical integrators: "API-first platform that plugs into your existing CRM, POS, or loyalty system in hours, not weeks."

### 2.3 Competitive Landscape Positioning

| Capability | Our Platform | Generic WhatsApp BSPs | Email Marketing Tools |
|-----------|-------------|----------------------|----------------------|
| WhatsApp-native | ✅ | ✅ | ❌ |
| Salon-specific segmentation | ✅ | ❌ | ❌ |
| Loyalty data integration | ✅ | ❌ | ❌ |
| Multi-tenant SaaS | ✅ | Varies | ✅ |
| API-first | ✅ | Varies | ✅ |
| Pay-per-message pricing | ✅ | ❌ (monthly plans) | N/A |

---

## 3. Multi-Tenant Architecture

### 3.1 Tenant Model

Each tenant represents one salon business (which may have multiple locations). Tenants are fully isolated at the data layer.

#### 3.1.1 Tenant Entity

```
Tenant:
  tenant_id: string (UUID)
  business_name: string
  business_type: "salon" | "spa" | "gym" | "clinic" | "restaurant" | "other"
  owner_name: string
  owner_email: string
  owner_phone: string
  country: string
  timezone: string
  currency: "INR" | "USD" | "SGD" | "MYR" | "THB"
  plan_id: string (references pricing plan)
  plan_status: "trialing" | "active" | "past_due" | "cancelled" | "suspended"
  whatsapp_config:
    phone_number_id: string
    waba_id: string
    access_token_secret_arn: string
    business_profile_verified: boolean
  loyalty_integration:
    enabled: boolean
    loyalty_platform_tenant_id: string (ID in the Loyalty platform)
    api_key: string (encrypted)
    sync_status: "active" | "paused" | "error"
    last_sync_at: datetime
  billing:
    stripe_customer_id: string
    razorpay_customer_id: string
    payment_method_on_file: boolean
  settings:
    default_language: "en" | "hi"
    message_cooldown_hours: int (default: 24)
    auto_optout_keyword: string (default: "STOP")
    campaign_approval_required: boolean
  created_at: datetime
  updated_at: datetime
```

### 3.2 Data Isolation Strategy

- **DynamoDB:** Every item's partition key is prefixed with `TENANT#<tenant_id>`. All queries and scans are scoped to the tenant's partition. No cross-tenant data leakage is possible at the query level.
- **API Layer:** Every authenticated request includes the tenant_id from the JWT token. A middleware validates that the tenant_id in the request path matches the JWT tenant_id.
- **Cache (Phase 2+ — Redis):** When ElastiCache is introduced, all Redis keys are prefixed with `tenant:<tenant_id>:`. TTL is enforced.
- **Cache (Phase 1 — DynamoDB):** Rate limiting and caching use DynamoDB items with tenant-scoped keys (`TENANT#<tenant_id>`) and TTL auto-expiry. Same isolation guarantees as all other DynamoDB data.
- **S3:** Media assets are stored under `s3://bucket/tenants/<tenant_id>/`.
- **Logs:** Structured logs include tenant_id for filtering.

### 3.3 Tenant Provisioning Flow

1. Tenant signs up via the platform website or is provisioned via the admin API.
2. System creates Cognito user pool group for the tenant.
3. DynamoDB tenant record is created with default settings.
4. Stripe/Razorpay customer is created.
5. Welcome email is sent with setup instructions.
6. Tenant completes WhatsApp Business API setup (guided flow).
7. (Optional) Tenant connects their Loyalty Management platform account.

### 3.4 Tenant Limits by Plan

| Resource | Starter | Growth | Enterprise |
|----------|---------|--------|------------|
| Monthly messages | 1,000 | 10,000 | Unlimited |
| Campaigns per month | 10 | 50 | Unlimited |
| Segments | 5 | 25 | Unlimited |
| Templates | 10 | 50 | Unlimited |
| Team members | 2 | 10 | Unlimited |
| Locations | 1 | 5 | Unlimited |
| API rate limit (req/min) | 60 | 300 | 1,000 |
| Data retention (days) | 90 | 365 | Custom |
| Loyalty integration | ❌ | ✅ | ✅ |
| Custom branding | ❌ | ❌ | ✅ |
| Dedicated support | ❌ | ❌ | ✅ |

---

## 4. API-First Design Philosophy

### 4.1 Principles

1. **API before UI:** Every feature is designed as an API endpoint first. The React dashboard is simply one consumer of the API.
2. **Versioned APIs:** All endpoints are versioned under `/api/v1/`. Breaking changes result in a new version.
3. **Consistent contracts:** All APIs use JSON, follow RESTful conventions, and return consistent error structures.
4. **Self-documenting:** OpenAPI 3.0 spec is auto-generated from code annotations and serves as the source of truth.
5. **Rate-limited by plan:** API rate limits are enforced per-tenant based on their pricing plan.
6. **Idempotent operations:** All write operations support idempotency keys to prevent duplicate processing.
7. **Webhook-driven events:** The platform emits webhooks to external systems (including the Loyalty platform) for key events.

### 4.2 Authentication

- **Tenant API Keys:** For server-to-server integrations (Loyalty platform, POS, CRM). Scoped to specific permissions.
- **JWT Tokens (Cognito):** For dashboard users. Tokens include tenant_id, user_id, and role.
- **Webhook Signatures:** HMAC-SHA256 signatures on all outbound webhooks for verification.

### 4.3 API Key Management

```
API Key Entity:
  key_id: string
  tenant_id: string
  name: string (e.g., "Loyalty Platform Integration")
  key_hash: string (SHA-256 of the actual key)
  key_prefix: string (first 8 chars for identification, e.g., "mk_live_a1b2...")
  permissions: list[string] (e.g., ["campaigns:read", "customers:read", "customers:write"])
  environment: "live" | "test"
  rate_limit_override: int | null
  last_used_at: datetime
  expires_at: datetime | null
  created_at: datetime
  is_active: boolean
```

Tenants can create multiple API keys with different permission scopes. Keys are displayed once at creation and never shown again (only the prefix is stored for identification).

### 4.4 Outbound Webhooks

The platform sends webhooks to registered endpoints for key events:

| Event | Payload | Use Case |
|-------|---------|----------|
| `campaign.scheduled` | Campaign details | Notify external systems |
| `campaign.completed` | Campaign ID + summary metrics | Trigger post-campaign workflows |
| `campaign.failed` | Campaign ID + error details | Alert on failures |
| `message.delivered` | Message ID + customer phone | Real-time delivery tracking |
| `message.read` | Message ID + customer phone | Engagement tracking |
| `message.failed` | Message ID + error | Failure monitoring |
| `customer.opted_out` | Customer phone + tenant_id | Sync opt-out to Loyalty platform |
| `customer.opted_in` | Customer phone + tenant_id | Sync opt-in to Loyalty platform |
| `segment.evaluated` | Segment ID + customer count | Post-evaluation hook |
| `billing.payment_failed` | Tenant ID + invoice details | Payment follow-up |
| `billing.plan_changed` | Tenant ID + old/new plan | Provision/deprovision features |

Webhook registration:
```
POST /api/v1/webhooks
{
  "url": "https://loyalty-platform.example.com/webhooks/marketing",
  "events": ["campaign.completed", "customer.opted_out"],
  "secret": "whsec_..."  // Used for HMAC signature verification
}
```

### 4.5 Standard API Response Envelope

```json
// Success
{
  "data": { ... },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-02-26T10:00:00Z"
  },
  "pagination": {
    "cursor": "eyJsYXN0X2tl...",
    "has_more": true,
    "limit": 25
  }
}

// Error
{
  "error": {
    "code": "CAMPAIGN_NOT_FOUND",
    "message": "Campaign with the specified ID does not exist.",
    "details": { "campaign_id": "camp_xyz" },
    "request_id": "req_abc123"
  }
}
```

### 4.6 Pagination Strategy

All list endpoints use **cursor-based pagination** (not offset-based) for DynamoDB compatibility:

```
GET /api/v1/campaigns?limit=25&cursor=eyJsYXN0X2tl...
```

---

## 5. Core Features — Marketing Campaign Engine

### 5.1 Campaign Creation and Management

#### 5.1.1 Campaign Entity

```
Campaign:
  campaign_id: string (UUID)
  tenant_id: string
  name: string
  description: string
  type: "birthday" | "anniversary" | "festival" | "offer" | "new_service" | "reminder" | "reengagement" | "custom"
  status: "draft" | "scheduled" | "executing" | "paused" | "completed" | "cancelled" | "failed"
  template_id: string
  segment_id: string
  personalization_mapping: dict  # Maps template variables to customer fields
  schedule:
    type: "immediate" | "scheduled" | "recurring"
    scheduled_at: datetime | null
    recurring_rule: string | null  # RRULE format (e.g., "FREQ=MONTHLY;BYMONTHDAY=1")
    timezone: string
  execution:
    total_recipients: int
    messages_sent: int
    messages_delivered: int
    messages_read: int
    messages_failed: int
    started_at: datetime | null
    completed_at: datetime | null
  approval:
    required: boolean
    approved_by: string | null
    approved_at: datetime | null
  created_by: string (user_id)
  created_at: datetime
  updated_at: datetime
  version: int  # Optimistic locking
```

#### 5.1.2 Campaign Lifecycle State Machine

```
                    ┌──────────┐
                    │  DRAFT   │
                    └────┬─────┘
                         │ schedule()
                    ┌────▼─────┐
          cancel()  │SCHEDULED │  cancel()
          ┌─────────┤          ├──────────┐
          │         └────┬─────┘          │
          │              │ trigger()      │
          │         ┌────▼─────┐          │
          │  pause()│EXECUTING │cancel()  │
          │    ┌────┤          ├─────┐    │
          │    │    └────┬─────┘     │    │
          │    │         │ complete()│    │
          │  ┌─▼───┐ ┌──▼──────┐ ┌─▼────▼──┐
          │  │PAUSED│ │COMPLETED│ │CANCELLED│
          │  └──┬───┘ └─────────┘ └─────────┘
          │     │ resume()
          │     └──────► EXECUTING
          └──────────────► CANCELLED
```

State transitions are enforced at the service layer using DynamoDB conditional writes (`ConditionExpression`) to prevent race conditions.

**Transition Rules:**
- DRAFT → SCHEDULED: Requires valid template (approved), valid segment (non-empty), schedule configuration, and approval (if required by tenant settings).
- SCHEDULED → EXECUTING: Triggered automatically by EventBridge at scheduled_at time.
- EXECUTING → COMPLETED: When all messages have a terminal status (delivered, read, or failed).
- EXECUTING → PAUSED: Manual action by admin. Stops SQS message processing.
- PAUSED → EXECUTING: Manual action by admin. Resumes SQS processing.
- Any non-terminal → CANCELLED: Manual action by admin. All queued messages are purged.

#### 5.1.3 Campaign Types Detail

| Type | Trigger Mechanism | Typical Frequency | Template Category |
|------|------------------|-------------------|-------------------|
| Birthday Wishes | Automated daily cron (EventBridge) | Daily batch | UTILITY |
| Anniversary Wishes | Automated daily cron | Daily batch | UTILITY |
| Festival Greetings | Scheduled by admin | Per festival | MARKETING |
| Special Offers | Scheduled by admin | Weekly/Monthly | MARKETING |
| New Service Announcements | Scheduled by admin | As needed | MARKETING |
| Appointment Reminders | Event-triggered (from Loyalty/POS) | Per appointment | UTILITY |
| Re-engagement | Automated (inactivity threshold) | Weekly batch | MARKETING |
| Custom | Scheduled by admin | As needed | MARKETING |

> **Note:** UTILITY templates have higher delivery rates and lower cost than MARKETING templates in WhatsApp's pricing model. Use UTILITY where Meta's policies allow.

### 5.2 Customer Segmentation Engine

#### 5.2.1 Segment Entity

```
Segment:
  segment_id: string (UUID)
  tenant_id: string
  name: string
  description: string
  type: "dynamic" | "static"
  criteria: list[SegmentCriterion]  # Only for dynamic segments
  customer_count: int  # Cached count, updated on evaluation
  last_evaluated_at: datetime
  created_by: string
  created_at: datetime
  updated_at: datetime

SegmentCriterion:
  field: string  # e.g., "last_visit_date", "loyalty_tier", "total_spend"
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "between" | "in" | "not_in" | "contains" | "days_ago_gt" | "days_ago_lt"
  value: any  # Single value, list, or range object
  source: "local" | "loyalty"  # Whether the field comes from local data or Loyalty platform
```

#### 5.2.2 Segmentation Criteria

**Local Data Fields (from Marketing Platform):**

| Field | Type | Operators | Description |
|-------|------|-----------|-------------|
| `opted_in` | boolean | eq | Marketing opt-in status |
| `opted_in_at` | datetime | gt, lt, between | When they opted in |
| `last_campaign_received` | datetime | gt, lt, days_ago_gt | Last marketing message date |
| `campaigns_received_count` | int | gt, lt, between | Total campaigns received |
| `last_response_date` | datetime | gt, lt, days_ago_gt | Last time customer responded |
| `engagement_score` | float | gt, lt, between | Calculated from open/read/response rates |
| `tags` | list[string] | contains, not_in | Custom tags assigned by staff |

**Loyalty Platform Fields (fetched via integration):**

| Field | Type | Operators | Description |
|-------|------|-----------|-------------|
| `loyalty_tier` | string | eq, in | Gold, Silver, Platinum, etc. |
| `total_points` | int | gt, lt, between | Current loyalty points balance |
| `lifetime_spend` | float | gt, lt, between | Total amount spent |
| `last_visit_date` | datetime | gt, lt, days_ago_gt | Last salon visit |
| `visit_count` | int | gt, lt, between | Total number of visits |
| `preferred_services` | list[string] | contains | Most-used service categories |
| `birthday_month` | int | eq | Birth month (1-12) |
| `anniversary_month` | int | eq | Membership anniversary month |
| `customer_since` | datetime | gt, lt | First registration date |

#### 5.2.3 Segment Evaluation

- **Dynamic segments** are evaluated at campaign execution time by querying local customer data and (if criteria include loyalty fields) fetching enrichment data from the Loyalty platform API.
- **Static segments** capture a snapshot of customer IDs at creation time.
- Segment evaluation is async — a Lambda function evaluates the criteria, stores the matching customer list, and emits a `segment.evaluated` webhook.
- For large segments (>5,000 customers), evaluation is batched to avoid Lambda timeout.

### 5.3 WhatsApp Template Management

#### 5.3.1 Template Entity

```
Template:
  template_id: string (UUID)
  tenant_id: string
  name: string (Meta template name — lowercase, underscores, max 512 chars)
  language: string (e.g., "en", "hi")
  category: "MARKETING" | "UTILITY"
  status: "draft" | "pending_approval" | "approved" | "rejected" | "disabled"
  meta_template_id: string | null  # Assigned after Meta approval
  components:
    header:
      type: "none" | "text" | "image" | "video" | "document"
      text: string | null
      media_url: string | null
    body:
      text: string  # With {{1}}, {{2}} placeholders
      examples: list[string]  # Required for Meta approval
    footer:
      text: string | null
    buttons: list[TemplateButton]
  variables:
    - name: string (e.g., "customer_name")
      position: int (1, 2, 3...)
      source: "customer_field" | "campaign_field" | "loyalty_field" | "static"
      field_path: string (e.g., "name", "loyalty_tier", "offer_code")
  rejection_reason: string | null
  version: int
  created_by: string
  created_at: datetime
  updated_at: datetime

TemplateButton:
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER"
  text: string
  url: string | null  # For URL buttons
  phone_number: string | null  # For phone buttons
```

#### 5.3.2 Template Lifecycle

1. Admin creates template in dashboard (DRAFT).
2. System validates template against Meta's formatting rules.
3. Admin submits for Meta approval → API call to Meta → Status becomes PENDING_APPROVAL.
4. Background poller checks Meta API every 5 minutes for status updates.
5. On approval: Status → APPROVED, template is available for campaigns.
6. On rejection: Status → REJECTED, rejection reason is stored, admin can edit and resubmit.

### 5.4 Campaign Execution Engine

#### 5.4.1 Execution Flow

```
EventBridge (scheduled time)
  │
  ▼
Campaign Executor Lambda
  ├── Read campaign from DynamoDB
  ├── Verify campaign is still SCHEDULED (conditional check)
  ├── Update status to EXECUTING
  ├── Evaluate segment (or read cached evaluation)
  ├── Batch customers into groups of 50
  └── Enqueue batches to SQS FIFO queue
        │
        ▼
  Message Worker Lambda (SQS consumer, concurrency: 5)
    ├── For each customer in batch:
    │   ├── Check opt-out status
    │   ├── Check 24-hour cooldown
    │   ├── Resolve template variables (local + loyalty data)
    │   ├── Call WhatsApp Cloud API (send template message)
    │   ├── Record message status in DynamoDB
    │   └── Update campaign execution counters (atomic increment)
    └── On failure:
        ├── Individual message failures: Retry 3x with backoff
        ├── Batch failures: Return to SQS for reprocessing
        └── Permanent failures: Move to DLQ, increment failed counter

WhatsApp Webhook (delivery status callbacks)
  │
  ▼
Webhook Receiver Lambda
  ├── Verify webhook signature
  ├── Parse delivery status (sent/delivered/read/failed)
  ├── Update message record in DynamoDB
  ├── Update campaign analytics counters
  └── Emit outbound webhook to registered endpoints
```

#### 5.4.2 Rate Limiting Strategy

**Phase 1 (DynamoDB-based, $0/month):**

| Limit | Value | Mechanism |
|-------|-------|-----------|
| WhatsApp API calls | 80 calls/second (Meta limit) | DynamoDB atomic counter + conditional write |
| Messages per campaign per hour | 1,000 (configurable) | SQS delivery delay + DynamoDB TTL counter |
| Campaigns executing concurrently per tenant | 3 | DynamoDB conditional write |
| Customer cooldown | 24 hours between marketing messages | DynamoDB item with TTL (auto-expires) |
| SQS Lambda concurrency | 5 per tenant | Lambda reserved concurrency |

> **Phase 1 Rate Limiter Pattern:** Write a DynamoDB item `PK=RATELIMIT#<tenant_id>`, `SK=WINDOW#<timestamp_bucket>` with an atomic counter (`ADD counter :1`). Check counter before sending. The item auto-deletes via TTL after the window expires. Throughput: handles up to ~100K messages/hour before needing Redis.

**Phase 2+ (Redis-based, when >100K messages/hour):**

| Limit | Value | Mechanism |
|-------|-------|-----------|
| WhatsApp API calls | 80 calls/second (Meta limit) | Redis sliding window counter |
| Messages per campaign per hour | 1,000 (configurable) | SQS delivery delay + Redis counter |
| All other limits | Same as Phase 1 | Same as Phase 1 |

> **Migration trigger:** Switch to Redis when sustained message throughput exceeds 100K/hour or when rate-limit check latency (DynamoDB ~5ms) needs to drop to sub-millisecond. Migration requires adding CacheStack + NetworkingStack in CDK.

#### 5.4.3 Failure Handling

- **Transient failures** (429, 500 from WhatsApp): Exponential backoff (1s, 2s, 4s), max 3 retries.
- **Permanent failures** (invalid phone, blocked, unregistered): No retry, mark as FAILED.
- **Batch failures** (Lambda timeout, memory): SQS visibility timeout handles redelivery (max 3 times).
- **Dead Letter Queue (DLQ):** After all retries exhausted, message moves to DLQ. CloudWatch Alarm triggers on DLQ depth > 0. DLQ messages are available for inspection and manual retry from the dashboard.

### 5.5 Opt-in / Opt-out Compliance

#### 5.5.1 Opt-in Flow

```
Customer scans QR code → Opens WhatsApp → Sends welcome message
  │
  ▼
Chatbot responds with service menu + marketing consent message:
  "Would you like to receive special offers, birthday wishes,
   and exclusive deals from [Salon Name] on WhatsApp?
   Reply YES to subscribe, or NO to skip."
  │
  ├── Customer replies YES → Record opt-in (timestamp, method: "qr_scan")
  └── Customer replies NO → Record opt-out, no marketing messages sent
```

#### 5.5.2 Opt-out Processing

- Every marketing message includes footer: "Reply STOP to unsubscribe"
- Webhook handler detects STOP/UNSUBSCRIBE keywords (case-insensitive)
- Immediate update to opt-out record in DynamoDB
- Confirmation message sent: "You've been unsubscribed from marketing messages from [Salon Name]. You'll still receive bills and service updates."
- `customer.opted_out` webhook emitted to Loyalty platform
- Customer is excluded from all future segment evaluations

#### 5.5.3 Compliance Rules

| Rule | Implementation |
|------|---------------|
| Marketing messages only to opted-in customers | Double-check at message send time (not just segment time) |
| 24-hour customer service window | Only send UTILITY templates outside 24-hour window |
| One marketing campaign per customer per 24 hours | Cooldown record with TTL in DynamoDB |
| Clear opt-out instructions in every marketing message | Enforced in template validation |
| Respect Meta's messaging limits | Rate limiter based on tenant's WhatsApp tier |
| Data retention compliance | TTL-based auto-deletion, data export API |

---

## 6. Loyalty Management Platform Integration

### 6.1 Integration Overview

The Marketing platform and the existing Loyalty Management platform share customers. When a tenant is onboarded on both platforms, they should be able to:

1. **Marketing → Loyalty:** Fetch customer loyalty data (tier, points, visit history, spend, preferences) to build richer segments and personalize campaign messages.
2. **Loyalty → Marketing:** Trigger campaigns from loyalty events (milestone reached, points expiring, tier upgrade) and fetch campaign engagement data for the customer profile.

### 6.2 Integration Architecture

```
┌─────────────────────┐                  ┌─────────────────────┐
│                     │   REST API        │                     │
│  Marketing Platform │◄────────────────►│  Loyalty Platform   │
│                     │                  │                     │
│  - Campaign Engine  │  Webhooks        │  - Points Engine    │
│  - Segment Builder  │◄────────────────►│  - Customer DB      │
│  - Template Manager │                  │  - Transaction Hist │
│  - Analytics        │  Shared Customer │  - Tier Management  │
│                     │  Identity (phone)│                     │
└─────────────────────┘                  └─────────────────────┘
```

### 6.3 Shared Customer Identity

The **customer phone number** serves as the universal identifier across both platforms. When resolving a customer:

1. Marketing platform stores `customer_phone` as the primary key.
2. Loyalty platform stores `customer_phone` as the primary key.
3. Cross-platform queries use phone number for matching.
4. Each platform maintains its own customer record with platform-specific data.

### 6.4 Marketing Platform → Loyalty Platform APIs

The Marketing platform calls the Loyalty platform's API to enrich customer data:

| API Call | Purpose | When Called |
|----------|---------|------------|
| `GET /api/v1/customers/{phone}` | Fetch customer profile with loyalty data | Segment evaluation, template variable resolution |
| `GET /api/v1/customers/{phone}/points` | Get current points balance | Template personalization |
| `GET /api/v1/customers/{phone}/tier` | Get loyalty tier | Segment filtering |
| `GET /api/v1/customers/{phone}/transactions` | Get recent transactions | Segment filtering by spend/services |
| `GET /api/v1/customers?filter=...` | Bulk customer query by criteria | Segment evaluation for loyalty-based criteria |
| `POST /api/v1/customers/{phone}/tags` | Add marketing engagement tags | Post-campaign tagging |

**Authentication:** API key provided by the Loyalty platform, stored encrypted in SSM Parameter Store (Phase 1) or AWS Secrets Manager (Phase 2+ with auto-rotation).

**Caching:** In Phase 1, Loyalty data is cached in DynamoDB with a 1-hour TTL (`PK=CACHE#<tenant_id>`, `SK=LOYALTY#<phone>`) to minimize cross-platform API calls during segment evaluation. In Phase 2+, this moves to Redis with a 1-hour TTL for sub-millisecond reads. Cache is invalidated when a `customer.updated` webhook is received from the Loyalty platform.

**Fallback:** If the Loyalty platform API is unavailable, segments that use loyalty criteria will fail gracefully — the segment evaluation records a warning and skips loyalty-dependent criteria rather than blocking the entire campaign.

### 6.5 Loyalty Platform → Marketing Platform APIs

The Loyalty platform calls the Marketing platform's API:

| API Call | Purpose | When Called |
|----------|---------|------------|
| `GET /api/v1/customers/{phone}/engagement` | Get marketing engagement summary | Customer profile enrichment in Loyalty dashboard |
| `GET /api/v1/customers/{phone}/campaigns` | List campaigns sent to customer | Customer timeline in Loyalty dashboard |
| `POST /api/v1/campaigns/trigger` | Trigger a campaign from loyalty event | Loyalty milestone, points expiry, tier change |
| `GET /api/v1/customers/{phone}/opt-status` | Check marketing opt-in/out status | Before showing marketing options in Loyalty UI |
| `POST /api/v1/customers/{phone}/opt-in` | Record opt-in from Loyalty platform | Customer opts in from Loyalty platform UI |

### 6.6 Webhook-Based Sync

#### Marketing Platform → Loyalty Platform (outbound webhooks)

| Event | Data | Loyalty Platform Action |
|-------|------|----------------------|
| `customer.opted_out` | phone, tenant_id | Update marketing consent flag |
| `customer.opted_in` | phone, tenant_id, method | Update marketing consent flag |
| `campaign.completed` | campaign_id, summary | Log in customer activity |
| `message.delivered` | phone, campaign_id | Update last marketing contact date |

#### Loyalty Platform → Marketing Platform (inbound webhooks)

| Event | Data | Marketing Platform Action |
|-------|------|-------------------------|
| `customer.tier_changed` | phone, old_tier, new_tier | Invalidate segment cache, trigger tier-change campaign |
| `customer.points_milestone` | phone, milestone | Trigger congratulations campaign |
| `customer.points_expiring` | phone, points, expiry_date | Trigger points expiry reminder campaign |
| `customer.birthday_upcoming` | phone, birthday_date | Trigger birthday campaign (if configured) |
| `customer.visited` | phone, services, amount | Update engagement score, invalidate segment cache |
| `customer.updated` | phone, changed_fields | Invalidate cached loyalty data for this customer |

### 6.7 Integration Setup Flow

1. Tenant navigates to Settings → Integrations → Loyalty Platform.
2. Enters their Loyalty Platform tenant ID and API key.
3. Marketing platform calls Loyalty platform's verification endpoint to validate credentials.
4. On success, Marketing platform registers its webhook URL with the Loyalty platform.
5. Initial sync: Marketing platform fetches all customers from Loyalty platform (paginated) and creates local customer records for any that don't exist.
6. Ongoing sync: Webhooks keep data in sync in real-time.

### 6.8 Data Mapping

| Marketing Platform Field | Loyalty Platform Field | Sync Direction |
|-------------------------|----------------------|----------------|
| customer_phone | customer_phone | Shared identity |
| customer_name | customer_name | Loyalty → Marketing |
| opted_in | marketing_consent | Bidirectional |
| engagement_score | (not mapped) | Marketing only |
| (not mapped) | loyalty_points | Loyalty only (fetched on demand) |
| (not mapped) | loyalty_tier | Loyalty only (fetched on demand) |
| (not mapped) | total_spend | Loyalty only (fetched on demand) |
| tags | tags | Bidirectional merge |

---

## 7. Notification System

### 7.1 Internal Notifications (for Tenant Staff)

Notifications keep salon staff informed about platform events without requiring them to actively check the dashboard.

#### 7.1.1 Notification Channels

| Channel | Use Case | Implementation |
|---------|----------|----------------|
| In-app (dashboard) | All notifications | WebSocket via API Gateway |
| Email | Critical alerts, daily digests | Amazon SES |
| Browser Push | Real-time alerts when dashboard is open | Web Push API (VAPID) |
| Slack/Teams (optional) | Team collaboration | Webhook integration |

#### 7.1.2 Notification Types

| Notification | Priority | Channels | Trigger |
|-------------|----------|----------|---------|
| Campaign completed | Medium | In-app, Email | All messages sent |
| Campaign failed | High | In-app, Email, Push | >10% failure rate |
| Template approved by Meta | Medium | In-app, Email | Meta webhook |
| Template rejected by Meta | High | In-app, Email, Push | Meta webhook |
| DLQ messages detected | High | In-app, Email, Push | CloudWatch Alarm |
| Daily campaign digest | Low | Email | Daily cron (9 AM tenant timezone) |
| Weekly analytics summary | Low | Email | Weekly cron (Monday 9 AM) |
| Plan limit approaching (80%) | Medium | In-app, Email | Usage counter check |
| Plan limit reached | High | In-app, Email, Push | Usage counter check |
| Payment failed | Critical | In-app, Email, Push | Stripe/Razorpay webhook |
| New customer opt-in | Low | In-app | Webhook handler |
| Customer opt-out | Medium | In-app | Webhook handler |
| Loyalty integration sync error | High | In-app, Email | Sync job failure |

#### 7.1.3 Notification Preferences

Each user can configure their notification preferences per channel:

```
NotificationPreference:
  user_id: string
  tenant_id: string
  channel: "in_app" | "email" | "push" | "slack"
  enabled_events: list[string]  # List of event types to receive
  quiet_hours:
    enabled: boolean
    start: "22:00"
    end: "08:00"
    timezone: string
```

### 7.2 Customer-Facing Notifications

All customer-facing notifications go through WhatsApp (the core product). These include campaign messages (covered in Section 5), opt-in confirmation, opt-out confirmation, and transactional messages (bill delivery, appointment reminders — handled by other modules but routed through the same WhatsApp API layer).

---

## 8. Pricing Plans and Billing

### 8.1 Pricing Philosophy

- **Usage-based core:** Charge primarily per WhatsApp message sent (pass-through Meta cost + platform margin).
- **Tiered plans:** Base platform fee unlocks features and higher limits.
- **No lock-in:** Monthly billing, cancel anytime.
- **Free trial:** 14-day trial on Growth plan with 200 free messages.
- **India-first pricing:** Competitive with Indian market rates (sub-₹1 per message markup).

### 8.2 Plan Structure

#### Starter Plan — ₹999/month ($12/month)

- Up to 1,000 messages/month
- 10 campaigns/month
- 5 customer segments
- 10 templates
- 2 team members
- 1 location
- Basic analytics (7-day history)
- Email support (48-hour SLA)
- No Loyalty platform integration
- No API access

#### Growth Plan — ₹3,999/month ($49/month) ⭐ Most Popular

- Up to 10,000 messages/month
- 50 campaigns/month
- 25 customer segments
- 50 templates
- 10 team members
- 5 locations
- Full analytics (365-day history)
- Priority email support (24-hour SLA)
- Loyalty platform integration ✅
- Full API access ✅
- Webhook support ✅
- Campaign scheduling and automation ✅

#### Enterprise Plan — Custom Pricing

- Unlimited messages (volume discounts on per-message cost)
- Unlimited campaigns, segments, templates
- Unlimited team members and locations
- Custom data retention
- Dedicated support (Slack channel, 4-hour SLA)
- Custom branding (white-label dashboard)
- Full API access with higher rate limits
- SLA guarantee (99.9% uptime)
- Onboarding assistance
- Loyalty platform integration ✅

### 8.3 Per-Message Pricing (on top of plan fee)

WhatsApp charges per-conversation (24-hour window). The platform passes through Meta's cost plus a margin:

| Message Category | Meta Cost (India) | Platform Markup | Total to Tenant |
|-----------------|-------------------|-----------------|-----------------|
| Marketing | ~₹0.80 | ₹0.30 | ~₹1.10 per conversation |
| Utility | ~₹0.35 | ₹0.15 | ~₹0.50 per conversation |
| Service | Free (first 1000/month) | ₹0.00 | Free |

> **Note:** Meta's pricing varies by country. The platform maintains a pricing table per country and updates it when Meta changes rates.

### 8.4 Billing Entities

```
Subscription:
  subscription_id: string
  tenant_id: string
  plan_id: string
  status: "trialing" | "active" | "past_due" | "cancelled" | "suspended"
  trial_end_date: datetime | null
  current_period_start: datetime
  current_period_end: datetime
  payment_gateway: "stripe" | "razorpay"
  gateway_subscription_id: string
  created_at: datetime

Invoice:
  invoice_id: string
  tenant_id: string
  subscription_id: string
  period_start: datetime
  period_end: datetime
  line_items:
    - description: "Growth Plan - Monthly"
      amount: 3999
      currency: "INR"
    - description: "WhatsApp Marketing Messages (2,450 conversations)"
      amount: 2695  # 2450 × ₹1.10
      currency: "INR"
    - description: "WhatsApp Utility Messages (320 conversations)"
      amount: 160  # 320 × ₹0.50
      currency: "INR"
  subtotal: 6854
  tax: 1234  # 18% GST
  total: 8088
  status: "draft" | "open" | "paid" | "void" | "uncollectible"
  payment_gateway_invoice_id: string
  pdf_url: string
  created_at: datetime

UsageRecord:
  tenant_id: string
  period: string  # "2026-02"
  messages_sent_marketing: int
  messages_sent_utility: int
  messages_sent_service: int
  campaigns_created: int
  api_calls_count: int
  storage_bytes: int
```

### 8.5 Billing Workflow

1. Tenant subscribes to a plan → Stripe/Razorpay subscription created.
2. At the start of each billing period, base plan fee is charged automatically.
3. Throughout the month, usage (message counts) is tracked in DynamoDB.
4. At the end of the billing period, usage-based charges are calculated and added to the next invoice.
5. Invoice is generated with base plan + usage charges + applicable taxes.
6. Payment is attempted via stored payment method.
7. On failure: Retry in 3 days, 7 days, 14 days. After 14 days, account is suspended.
8. Tenant receives invoice via email (and in-dashboard notification).

### 8.6 Plan Enforcement

| Limit | Enforcement Point | Behavior When Exceeded |
|-------|-------------------|----------------------|
| Monthly messages | Message Worker Lambda | Campaign paused, admin notified, prompt to upgrade |
| Campaigns per month | Campaign create API | 403 error with upgrade prompt |
| Segments | Segment create API | 403 error with upgrade prompt |
| Templates | Template create API | 403 error with upgrade prompt |
| Team members | User invite API | 403 error with upgrade prompt |
| API rate limit | API Gateway | 429 Too Many Requests |
| Loyalty integration | Integration setup API | Feature locked, upgrade prompt |

---

## 9. Payment Gateway Integration

### 9.1 Dual Gateway Strategy

| Gateway | Markets | Use Case |
|---------|---------|----------|
| **Razorpay** | India | Primary for INR transactions. Supports UPI, cards, net banking, wallets |
| **Stripe** | International | Primary for USD, SGD, MYR, THB. Supports cards, SEPA, ACH |

### 9.2 Payment Gateway Abstraction

A `PaymentGatewayService` abstraction layer ensures the rest of the application is gateway-agnostic:

```python
class PaymentGatewayService(Protocol):
    def create_customer(self, tenant: Tenant) -> str: ...
    def create_subscription(self, customer_id: str, plan: Plan) -> Subscription: ...
    def cancel_subscription(self, subscription_id: str) -> None: ...
    def create_usage_invoice(self, customer_id: str, line_items: list) -> Invoice: ...
    def get_payment_methods(self, customer_id: str) -> list[PaymentMethod]: ...
    def process_webhook(self, payload: dict, signature: str) -> WebhookEvent: ...
```

The correct implementation (StripeGateway or RazorpayGateway) is selected based on the tenant's country/currency at onboarding.

### 9.3 Payment Webhook Handling

| Event | Action |
|-------|--------|
| `payment_intent.succeeded` | Mark invoice as paid, send receipt email |
| `payment_intent.payment_failed` | Mark invoice as failed, notify tenant, schedule retry |
| `customer.subscription.updated` | Update subscription status in DynamoDB |
| `customer.subscription.deleted` | Set subscription to cancelled, begin grace period |
| `invoice.payment_action_required` | Notify tenant to complete 3DS authentication |

### 9.4 Tax Compliance

- Indian tenants: 18% GST applied to platform fee and markup (not on Meta's WhatsApp pass-through costs). GST number displayed on invoices.
- International tenants: Tax handled by Stripe Tax (automatic calculation based on tenant location).
- All invoices include tax breakdown and are compliant with local regulations.

---

## 10. Tenant Onboarding and Administration

### 10.1 Self-Service Onboarding Flow

```
Step 1: Sign Up
  - Business name, owner name, email, phone, country
  - Email verification (OTP)

Step 2: Choose Plan
  - Display plan comparison
  - Select plan (or start free trial)
  - Enter payment method (Stripe/Razorpay)

Step 3: WhatsApp Setup
  - Guided flow to set up Meta Business Manager
  - Embedded Signup for WhatsApp Business API (Meta's official flow)
  - Phone number verification
  - Business profile setup (display name, profile photo, about)

Step 4: Configure Settings
  - Default language
  - Timezone
  - Message cooldown hours
  - Campaign approval workflow (on/off)

Step 5: (Optional) Connect Loyalty Platform
  - Enter Loyalty platform tenant ID and API key
  - Verify connection
  - Initial customer sync

Step 6: Create First Campaign
  - Guided walkthrough to create a test campaign
  - Send test message to owner's phone
  - Dashboard tour
```

### 10.2 User Roles and Permissions

| Permission | Admin | Manager | Staff |
|-----------|-------|---------|-------|
| View campaigns | ✅ | ✅ | ✅ |
| Create/edit campaigns | ✅ | ✅ | ❌ |
| Approve/schedule campaigns | ✅ | ✅ | ❌ |
| Cancel/pause campaigns | ✅ | ❌ | ❌ |
| View analytics | ✅ | ✅ | ✅ (limited) |
| Export data | ✅ | ✅ | ❌ |
| Manage templates | ✅ | ✅ | ❌ |
| Manage segments | ✅ | ✅ | ❌ |
| Manage team members | ✅ | ❌ | ❌ |
| Manage billing | ✅ | ❌ | ❌ |
| Manage integrations | ✅ | ❌ | ❌ |
| Manage API keys | ✅ | ❌ | ❌ |
| View opt-out list | ✅ | ✅ | ✅ |
| Manage settings | ✅ | ❌ | ❌ |

### 10.3 Super Admin (Platform Level)

A platform-level super admin dashboard (separate from tenant dashboards) provides:

- Tenant list with plan status, usage, and health
- Manual tenant provisioning and suspension
- Platform-wide analytics (total tenants, total messages, revenue)
- WhatsApp API health monitoring
- System configuration (pricing updates, feature flags)
- Impersonate tenant (for support debugging)

---

## 11. Analytics and Reporting

### 11.1 Campaign Analytics

| Metric | Definition | Granularity |
|--------|-----------|-------------|
| Total Recipients | Segment size at execution time | Per campaign |
| Messages Sent | Successfully submitted to WhatsApp API | Per campaign |
| Delivered | Delivery receipt received | Per campaign + daily |
| Read | Read receipt received | Per campaign + daily |
| Responded | Customer replied within 24 hours | Per campaign |
| Failed | Terminal failure after retries | Per campaign |
| Delivery Rate | Delivered / Sent × 100 | Per campaign |
| Read Rate | Read / Delivered × 100 | Per campaign |
| Response Rate | Responded / Delivered × 100 | Per campaign |
| Opt-out Rate | Opt-outs / Delivered × 100 | Per campaign |
| Cost | Total WhatsApp API cost | Per campaign |

### 11.2 Tenant-Level Analytics

| Metric | Period | Purpose |
|--------|--------|---------|
| Monthly Active Customers (MAC) | Monthly | Customer engagement health |
| Campaign Frequency | Monthly | Usage pattern |
| Average Delivery Rate | Monthly | Quality indicator |
| Average Read Rate | Monthly | Content quality |
| Best Performing Campaign Type | Monthly | Content strategy insight |
| Best Day/Time to Send | Monthly | Scheduling optimization |
| Customer Growth (new opt-ins) | Monthly | Acquisition tracking |
| Churn (new opt-outs) | Monthly | Retention tracking |
| Message Cost Trend | Monthly | Budget tracking |
| Loyalty Integration Coverage | Monthly | % of customers with loyalty data |

### 11.3 Platform-Level Analytics (Super Admin)

- Total tenants by plan
- Monthly recurring revenue (MRR)
- Total messages sent across platform
- Platform-wide delivery rate
- Tenant health score (usage, payment status, error rate)
- WhatsApp API cost vs. revenue margin

### 11.4 Reporting and Export

| Report | Format | Available To |
|--------|--------|-------------|
| Campaign Detail Report | CSV, PDF | Admin, Manager |
| Monthly Usage Report | PDF | Admin (auto-emailed) |
| Customer Engagement Report | CSV | Admin, Manager |
| Billing Statement | PDF | Admin |
| Opt-out Report | CSV | Admin |
| Platform Revenue Report | CSV | Super Admin |

---

## 12. Security, Compliance, and Data Isolation

> **Implementation details:** See `SECURITY_PLAYBOOK.md` for code-level patterns including tenant isolation test templates, webhook verification, PII masking, credential management, injection prevention, and incident response procedures.

### 12.1 Multi-Tenant Security

| Layer | Control | Implementation |
|-------|---------|---------------|
| Data | Tenant isolation | PK prefix `TENANT#<id>` on all DynamoDB items |
| API | Tenant context enforcement | Middleware validates JWT tenant_id matches path |
| Cache | Tenant key prefix | Phase 1: DynamoDB `CACHE#<tid>`, Phase 2+: Redis `tenant:<id>:*` |
| Storage | Tenant folder isolation | S3 path: `tenants/<id>/` |
| Auth | Tenant-scoped Cognito groups | Separate user groups per tenant |
| Logs | Tenant ID in structured logs | Filter by tenant in CloudWatch |
| Webhooks | Tenant-scoped secrets | Unique HMAC secret per tenant per webhook |

### 12.2 Data Encryption

- At rest: DynamoDB SSE (AWS-managed keys), S3 SSE-S3. ElastiCache encryption at rest (Phase 2+ when Redis is added).
- In transit: TLS 1.2+ enforced on all endpoints (API Gateway, CloudFront).
- Secrets: **Phase 1:** SSM Parameter Store SecureString (free, encrypted with AWS-managed KMS key) for WhatsApp tokens, API keys, payment gateway keys. Manual rotation. **Phase 2+:** AWS Secrets Manager with auto-rotation enabled. Migration is a config change — update environment variables to read from Secrets Manager ARN instead of SSM parameter name.

### 12.3 Compliance

| Regulation | Scope | Implementation |
|-----------|-------|---------------|
| GDPR | EU customers/tenants | Data export API, right to erasure, consent tracking |
| DPDP Act (India) | Indian customers/tenants | Purpose limitation, data minimization, consent |
| WhatsApp Business Policy | All | Template approval, opt-in/out, 24-hour window |
| GST Compliance | Indian tenants | Tax calculation, GSTIN on invoices |
| PCI DSS | Payment processing | No card data stored — handled by Stripe/Razorpay |

### 12.4 Audit Trail

All state-changing operations are logged in an audit trail:

```
AuditLog:
  audit_id: string
  tenant_id: string
  user_id: string
  action: string (e.g., "campaign.created", "template.submitted", "user.invited")
  resource_type: string
  resource_id: string
  changes: dict  # Before/after values
  ip_address: string
  user_agent: string
  timestamp: datetime
```

Audit logs are retained for 2 years and are immutable (append-only, no delete API).

---

## 13. API Specifications

### 13.1 Complete API Endpoint Reference

#### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Login with email + password → JWT |
| POST | `/api/v1/auth/refresh` | Refresh expired JWT |
| POST | `/api/v1/auth/forgot-password` | Initiate password reset |
| POST | `/api/v1/auth/reset-password` | Complete password reset |

#### Tenant Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/tenants` | Create tenant (sign-up) |
| GET | `/api/v1/tenants/me` | Get current tenant profile |
| PUT | `/api/v1/tenants/me` | Update tenant settings |
| GET | `/api/v1/tenants/me/usage` | Get current period usage |

#### Users (Team Members)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users` | List tenant team members |
| POST | `/api/v1/users/invite` | Invite new team member |
| PUT | `/api/v1/users/{id}/role` | Update user role |
| DELETE | `/api/v1/users/{id}` | Remove team member |

#### Campaigns

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/campaigns` | Create campaign |
| GET | `/api/v1/campaigns` | List campaigns (paginated, filterable) |
| GET | `/api/v1/campaigns/{id}` | Get campaign details |
| PUT | `/api/v1/campaigns/{id}` | Update campaign (draft only) |
| POST | `/api/v1/campaigns/{id}/schedule` | Schedule campaign |
| POST | `/api/v1/campaigns/{id}/pause` | Pause executing campaign |
| POST | `/api/v1/campaigns/{id}/resume` | Resume paused campaign |
| POST | `/api/v1/campaigns/{id}/cancel` | Cancel campaign |
| GET | `/api/v1/campaigns/{id}/analytics` | Get campaign analytics |
| GET | `/api/v1/campaigns/{id}/messages` | List message statuses (paginated) |
| POST | `/api/v1/campaigns/{id}/test` | Send test message to specified phone |
| POST | `/api/v1/campaigns/trigger` | Trigger campaign from external event (Loyalty) |

#### Segments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/segments` | Create segment |
| GET | `/api/v1/segments` | List segments |
| GET | `/api/v1/segments/{id}` | Get segment details |
| PUT | `/api/v1/segments/{id}` | Update segment |
| DELETE | `/api/v1/segments/{id}` | Delete segment |
| POST | `/api/v1/segments/{id}/evaluate` | Trigger segment evaluation |
| GET | `/api/v1/segments/{id}/preview` | Preview matching customers (sample) |

#### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/templates` | Create template |
| GET | `/api/v1/templates` | List templates |
| GET | `/api/v1/templates/{id}` | Get template details |
| PUT | `/api/v1/templates/{id}` | Update template (draft/rejected only) |
| DELETE | `/api/v1/templates/{id}` | Delete template |
| POST | `/api/v1/templates/{id}/submit` | Submit to Meta for approval |
| POST | `/api/v1/templates/{id}/sync` | Sync approval status with Meta |

#### Customers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/customers` | List customers (paginated, filterable) |
| GET | `/api/v1/customers/{phone}` | Get customer profile |
| GET | `/api/v1/customers/{phone}/engagement` | Get engagement summary |
| GET | `/api/v1/customers/{phone}/campaigns` | List campaigns sent to customer |
| GET | `/api/v1/customers/{phone}/opt-status` | Get opt-in/out status |
| POST | `/api/v1/customers/{phone}/opt-in` | Record opt-in |
| POST | `/api/v1/customers/{phone}/opt-out` | Record opt-out |
| POST | `/api/v1/customers/{phone}/tags` | Add/remove tags |

#### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/analytics/overview` | Dashboard summary (last 30 days) |
| GET | `/api/v1/analytics/campaigns` | Cross-campaign comparison |
| GET | `/api/v1/analytics/customers` | Customer engagement trends |
| GET | `/api/v1/analytics/usage` | Usage metrics for billing |
| POST | `/api/v1/analytics/export` | Generate export (async, returns download URL) |

#### Webhooks (Outbound)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/webhooks` | Register webhook endpoint |
| GET | `/api/v1/webhooks` | List registered webhooks |
| PUT | `/api/v1/webhooks/{id}` | Update webhook |
| DELETE | `/api/v1/webhooks/{id}` | Delete webhook |
| POST | `/api/v1/webhooks/{id}/test` | Send test event |

#### Webhooks (Inbound — WhatsApp)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/hooks/whatsapp` | Meta webhook verification |
| POST | `/api/v1/hooks/whatsapp` | Receive WhatsApp status callbacks |

#### Webhooks (Inbound — Payment)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/hooks/stripe` | Stripe webhook handler |
| POST | `/api/v1/hooks/razorpay` | Razorpay webhook handler |

#### Webhooks (Inbound — Loyalty Platform)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/hooks/loyalty` | Receive events from Loyalty platform |

#### API Keys

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/api-keys` | Create API key |
| GET | `/api/v1/api-keys` | List API keys (prefix only) |
| DELETE | `/api/v1/api-keys/{id}` | Revoke API key |

#### Billing

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/billing/subscription` | Get current subscription |
| POST | `/api/v1/billing/subscribe` | Subscribe to plan |
| PUT | `/api/v1/billing/subscribe` | Change plan (upgrade/downgrade) |
| POST | `/api/v1/billing/cancel` | Cancel subscription |
| GET | `/api/v1/billing/invoices` | List invoices |
| GET | `/api/v1/billing/invoices/{id}` | Get invoice details |
| GET | `/api/v1/billing/invoices/{id}/pdf` | Download invoice PDF |
| GET | `/api/v1/billing/payment-methods` | List payment methods |
| POST | `/api/v1/billing/payment-methods` | Add payment method |
| DELETE | `/api/v1/billing/payment-methods/{id}` | Remove payment method |

#### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/notifications` | List notifications (paginated) |
| PUT | `/api/v1/notifications/{id}/read` | Mark notification as read |
| PUT | `/api/v1/notifications/read-all` | Mark all as read |
| GET | `/api/v1/notifications/preferences` | Get notification preferences |
| PUT | `/api/v1/notifications/preferences` | Update notification preferences |

#### Integrations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/integrations/loyalty/connect` | Connect Loyalty platform |
| GET | `/api/v1/integrations/loyalty/status` | Get integration status |
| POST | `/api/v1/integrations/loyalty/sync` | Trigger manual sync |
| DELETE | `/api/v1/integrations/loyalty/disconnect` | Disconnect integration |

### 13.2 API Versioning Strategy

- Current version: `v1`
- Version in URL path: `/api/v1/...`
- Breaking changes → new version (`/api/v2/...`)
- Non-breaking additions (new fields, new endpoints) are added to current version
- Deprecated endpoints return `Sunset` header with deprecation date
- Minimum 6-month deprecation notice before removal

---

## 14. Frontend — Admin Dashboard

### 14.1 Page Structure

```
/                           → Redirect to /dashboard
/login                      → Login page
/signup                     → Self-service signup wizard
/dashboard                  → Overview with KPI cards and recent campaigns
/campaigns                  → Campaign list (table + filters)
/campaigns/new              → Campaign creation wizard (multi-step)
/campaigns/:id              → Campaign detail + analytics
/campaigns/:id/messages     → Message delivery log
/segments                   → Segment list
/segments/new               → Segment builder
/segments/:id               → Segment detail + customer preview
/templates                  → Template list with approval status
/templates/new              → Template creator with preview
/templates/:id              → Template detail
/customers                  → Customer list with search/filter
/customers/:phone           → Customer profile (engagement + loyalty data)
/analytics                  → Cross-campaign analytics dashboard
/settings                   → Tenant settings
/settings/team              → Team member management
/settings/billing           → Subscription + invoices + payment methods
/settings/integrations      → Loyalty platform connection
/settings/api-keys          → API key management
/settings/webhooks          → Webhook management
/settings/notifications     → Notification preferences
/settings/whatsapp          → WhatsApp Business configuration
```

### 14.2 UI/UX Requirements

#### Design Principles
- **Clarity over cleverness:** Every action should be obvious. No hidden menus for primary actions.
- **Progressive disclosure:** Campaign wizard shows steps one at a time. Advanced options are collapsed by default.
- **Real-time feedback:** Show live preview of WhatsApp messages as the user edits templates. Show estimated audience size as segment criteria change.
- **Empty states:** Every list page has a helpful empty state with a CTA to create the first item.
- **Error recovery:** All forms preserve input on error. Unsaved changes prompt confirmation on navigation.

#### Responsive Breakpoints
| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Mobile | < 640px | Single column, bottom navigation, read-only |
| Tablet | 640px - 1024px | Sidebar collapsed, full-width content |
| Desktop | 1024px - 1280px | Sidebar + content |
| Wide | > 1280px | Sidebar + content + detail panel |

#### Accessibility (WCAG 2.1 AA)
- All interactive elements have visible focus indicators.
- Color is never the sole indicator of state.
- All images have alt text.
- Form inputs have associated labels.
- Keyboard navigation for all workflows.
- Screen reader announcements for dynamic content changes.
- Minimum contrast ratio: 4.5:1 for text, 3:1 for large text.

### 14.3 Frontend Technology

| Library | Purpose |
|---------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Tailwind CSS | Utility-first styling |
| React Query (TanStack) | Server state management, caching |
| Zustand | Client-side UI state |
| React Hook Form + Zod | Form management + validation |
| Recharts | Charts and graphs |
| React Router v6 | Routing |
| Playwright | E2E testing |
| React Testing Library | Component testing |
| Storybook | Component documentation |

---

## 15. Non-Functional Requirements

### 15.1 Performance

| Metric | Target |
|--------|--------|
| API response time (p50) | < 200ms |
| API response time (p99) | < 1,000ms |
| Dashboard page load (LCP) | < 2 seconds |
| Campaign message delivery start | < 30 seconds after scheduled time |
| Individual message send | < 3 seconds from queue to WhatsApp API |
| Segment evaluation (5,000 customers) | < 30 seconds |
| Dashboard real-time update delay | < 5 seconds |

### 15.2 Scalability

| Dimension | Target |
|-----------|--------|
| Concurrent tenants | 1,000+ |
| Customers per tenant | 100,000+ |
| Messages per hour (platform-wide) | 100,000+ |
| Concurrent campaigns executing | 50+ (platform-wide) |
| DynamoDB table size | 100M+ items |

### 15.3 Availability

| Component | Target | Implementation |
|-----------|--------|---------------|
| API | 99.9% uptime | Multi-AZ Lambda, API Gateway regional |
| Dashboard | 99.9% uptime | CloudFront + S3 (11 nines durability) |
| Campaign execution | 99.5% uptime | SQS retry + DLQ for resilience |
| Data | 99.999999999% durability | DynamoDB with PITR + cross-region backup |

### 15.4 Observability

- Structured JSON logging on all Lambda functions (aws-lambda-powertools).
- Distributed tracing with X-Ray across Lambda, DynamoDB, SQS, HTTP calls.
- Custom CloudWatch metrics for business KPIs (10 free metrics always free).
- **Phase 1:** CloudWatch Logs for error tracking (free 5GB/month).
- **Phase 2+:** Sentry for error tracking and alerting (when error volume exceeds CloudWatch usability).
- CloudWatch dashboards per environment.

---

## 16. Database Design — DynamoDB Single-Table

### 16.1 Table Configuration

| Setting | Value |
|---------|-------|
| Table name | `salon-marketing-{env}` |
| Partition key | `PK` (String) |
| Sort key | `SK` (String) |
| Billing mode | On-demand (PAY_PER_REQUEST) |
| Encryption | AWS-managed key (SSE) |
| Point-in-time recovery | Enabled (production) |
| DynamoDB Streams | Enabled (NEW_AND_OLD_IMAGES) |
| TTL attribute | `ttl` (Number, epoch seconds) |

### 16.2 Global Secondary Indexes

| Index | Partition Key | Sort Key | Purpose |
|-------|-------------|----------|---------|
| GSI1 | `GSI1PK` | `GSI1SK` | List queries (campaigns by tenant, templates by status) |
| GSI2 | `GSI2PK` | `GSI2SK` | Scheduled campaigns, billing period queries |
| GSI3 | `GSI3PK` | `GSI3SK` | Customer lookup by phone across entities |

### 16.3 Entity Key Patterns

| Entity | PK | SK | GSI1PK | GSI1SK |
|--------|----|----|--------|--------|
| Tenant | `TENANT#<tid>` | `META` | — | — |
| User | `TENANT#<tid>` | `USER#<uid>` | `USER#<email>` | `TENANT#<tid>` |
| Campaign | `TENANT#<tid>` | `CAMPAIGN#<cid>` | `TENANT#<tid>#CAMPAIGN` | `<status>#<created_at>` |
| Template | `TENANT#<tid>` | `TEMPLATE#<tmid>` | `TENANT#<tid>#TEMPLATE` | `<status>#<name>` |
| Segment | `TENANT#<tid>` | `SEGMENT#<sid>` | `TENANT#<tid>#SEGMENT` | `<created_at>` |
| Customer | `TENANT#<tid>` | `CUSTOMER#<phone>` | `TENANT#<tid>#CUSTOMER` | `<opted_in>#<name>` |
| Message | `CAMPAIGN#<cid>` | `MSG#<phone>` | `TENANT#<tid>#MSG` | `<status>#<sent_at>` |
| Analytics | `CAMPAIGN#<cid>` | `ANALYTICS#<date>` | — | — |
| OptOut | `TENANT#<tid>` | `OPTOUT#<phone>` | — | — |
| Subscription | `TENANT#<tid>` | `SUBSCRIPTION` | — | — |
| Invoice | `TENANT#<tid>` | `INVOICE#<iid>` | `TENANT#<tid>#INVOICE` | `<status>#<date>` |
| APIKey | `TENANT#<tid>` | `APIKEY#<kid>` | `APIKEY#<prefix>` | `META` |
| Webhook | `TENANT#<tid>` | `WEBHOOK#<wid>` | — | — |
| Notification | `TENANT#<tid>` | `NOTIF#<nid>` | `USER#<uid>#NOTIF` | `<read>#<created_at>` |
| AuditLog | `TENANT#<tid>` | `AUDIT#<timestamp>#<aid>` | — | — |
| Schedule | `SCHEDULE#<date>` | `<time>#<cid>` | — | — |
| UsageRecord | `TENANT#<tid>` | `USAGE#<period>` | — | — |

---

## 17. Infrastructure and Deployment

### 17.1 AWS CDK Stack Organization

```
salon-marketing-infra/
├── app.py                      # CDK app entry point
├── stacks/
│   ├── auth_stack.py           # Cognito User Pool, groups, app client
│   ├── data_stack.py           # DynamoDB table, GSIs, streams
│   ├── cache_stack.py          # ElastiCache Redis (PHASE 2+ ONLY — skip in solo/dev)
│   ├── api_stack.py            # API Gateway, Lambda functions, layers
│   ├── messaging_stack.py      # SQS queues (FIFO + DLQ), EventBridge
│   ├── frontend_stack.py       # S3 bucket, CloudFront distribution
│   ├── monitoring_stack.py     # CloudWatch dashboards, alarms, SNS topics
│   ├── billing_stack.py        # Billing-related Lambda, webhook endpoints
│   └── networking_stack.py     # VPC, security groups (PHASE 2+ ONLY — skip in solo/dev)
├── config/
│   ├── base.py                 # Shared configuration
│   ├── solo.py                 # Solopreneur / Phase 1 (zero-cost, no Redis/VPC)
│   ├── dev.py                  # Development overrides
│   ├── demo.py                 # Demo overrides
│   └── prod.py                 # Production overrides
└── constructs/
    ├── lambda_function.py      # Custom L3 construct for Lambda with defaults
    ├── api_endpoint.py         # Custom L3 construct for API + Lambda + auth
    └── monitored_queue.py      # SQS + DLQ + alarms construct
```

> **Phase 1 (solo profile):** Deploy with `cdk deploy --context env=solo`. Skips `cache_stack` and `networking_stack`. Lambda runs outside VPC. Rate limiting and caching use DynamoDB. Total AWS cost: **$0-$1/month**.

### 17.2 Environment Configuration

| Setting | Solo (Phase 1) | Dev | Demo | Prod (Phase 2+) |
|---------|---------------|-----|------|-----------------|
| DynamoDB capacity | Provisioned (25/25 free tier) | On-demand | On-demand | On-demand |
| DynamoDB PITR | Disabled | Disabled | Enabled | Enabled |
| Lambda memory | 256 MB | 256 MB | 512 MB | 512 MB |
| Lambda timeout | 30s | 30s | 30s | 30s |
| Lambda VPC | **No VPC** | **No VPC** | VPC | VPC |
| Redis instance | **None (DynamoDB)** | **None (DynamoDB)** | t3.small | t3.medium (multi-AZ) |
| VPC / NAT Gateway | **None** | **None** | Single NAT | Multi-AZ NAT |
| Secrets storage | **SSM Parameter Store** | **SSM Parameter Store** | Secrets Manager | Secrets Manager |
| CloudWatch log retention | 7 days | 7 days | 30 days | 90 days |
| X-Ray tracing | Enabled | Enabled | Enabled | Enabled |
| CloudFront | Enabled (free tier) | Disabled (S3 direct) | Enabled | Enabled |
| Custom domain | app.marketing.example.com | dev.marketing.example.com | demo.marketing.example.com | app.marketing.example.com |
| WAF | **Disabled (API GW throttle)** | Disabled | Enabled | Enabled |
| Error tracking | **CloudWatch only** | **CloudWatch only** | Sentry | Sentry |
| Monthly AWS cost | **$0-$1** | **$0-$1** | ~$50 | ~$80-235 |

### 17.3 CI/CD Pipeline (GitHub Actions)

```yaml
# Simplified pipeline stages
on:
  push: [develop, main]
  pull_request: [develop]

jobs:
  lint-and-format:        # ruff (Python), ESLint + Prettier (TypeScript)
  unit-tests:             # pytest --cov, vitest --coverage
  integration-tests:      # pytest with LocalStack (develop/main only)
  security-scan:          # bandit (Python), npm audit, trivy (Docker)
  cdk-synth:              # Validate CDK produces valid CloudFormation
  deploy-dev:             # CDK deploy to dev (on develop push)
  deploy-demo:            # CDK deploy to demo (manual approval)
  deploy-prod:            # CDK deploy to prod (manual approval, main only)
  smoke-tests:            # Post-deploy API health checks
  e2e-tests:              # Playwright against deployed environment
```

---

### 17.4 Deployment Phases & Cost Optimization

This platform is designed to launch at **$0-$1/month** and scale costs proportionally with revenue. The architecture supports this through a **backend abstraction layer** that swaps between DynamoDB-based and Redis-based implementations without code changes.

#### 17.4.1 Phase 1: Solopreneur Launch ($0-$1/month, 0-50 tenants)

**Stacks deployed:** auth, data, api, messaging, frontend, monitoring (6 of 8 stacks).

**Stacks NOT deployed:** `cache_stack` (Redis), `networking_stack` (VPC/NAT Gateway).

**Key substitutions:**

| Component | Full Design | Phase 1 Substitute | Savings |
|-----------|------------|-------------------|---------|
| Rate limiter | Redis sliding window | DynamoDB TTL atomic counter | $48+/month |
| Template/Loyalty cache | Redis with 1h TTL | DynamoDB items with 1h TTL | (included above) |
| Secrets storage | AWS Secrets Manager | SSM Parameter Store SecureString | $2-5/month |
| Error tracking | Sentry ($26/mo) | CloudWatch Logs + error metrics | $26/month |
| WAF | AWS WAF ($5+/mo) | API Gateway built-in throttling | $5+/month |
| DynamoDB capacity | On-Demand | Provisioned 25/25 (free tier) | $5-15/month |
| Lambda networking | VPC with NAT Gateway | Public Lambda (no VPC) | $35+/month |

**Free Tier services used (always free or 12-month free):**
- Lambda: 1M requests + 400K GB-seconds/month
- API Gateway: 1M REST calls/month
- DynamoDB: 25 RCU + 25 WCU + 25 GB storage
- SQS: 1M requests/month
- Cognito: 50,000 MAUs
- CloudWatch: 5 GB logs + 10 alarms + 10 metrics
- X-Ray: 100,000 traces/month
- S3: 5 GB + 20,000 GET requests
- CloudFront: 1 TB transfer/month
- SES: 62,000 emails/month (from Lambda)
- EventBridge: Free tier included

#### 17.4.2 Backend Abstraction for Swappable Implementations

The service layer uses a **strategy pattern** so the same business code works with DynamoDB (Phase 1) or Redis (Phase 2+):

```python
# src/utils/rate_limiter.py
class RateLimiter(Protocol):
    def check_and_increment(self, key: str, limit: int, window_seconds: int) -> bool: ...
    def get_remaining(self, key: str, limit: int, window_seconds: int) -> int: ...

class DynamoDBRateLimiter:
    """Phase 1: Uses DynamoDB TTL items for rate limiting. Free."""
    def check_and_increment(self, key, limit, window_seconds):
        # Atomic counter with conditional write + TTL auto-expiry
        ...

class RedisRateLimiter:
    """Phase 2+: Uses Redis sliding window. Sub-ms latency."""
    def check_and_increment(self, key, limit, window_seconds):
        # Redis INCR + EXPIRE
        ...

# src/utils/cache.py
class CacheBackend(Protocol):
    def get(self, key: str) -> dict | None: ...
    def set(self, key: str, value: dict, ttl_seconds: int) -> None: ...

class DynamoDBCache:
    """Phase 1: Uses DynamoDB items with TTL. ~5ms latency."""
    ...

class RedisCache:
    """Phase 2+: Uses Redis. <1ms latency."""
    ...

# Factory selects implementation based on environment variable
def create_rate_limiter() -> RateLimiter:
    if os.environ.get("RATE_LIMITER_BACKEND") == "redis":
        return RedisRateLimiter(os.environ["REDIS_ENDPOINT"])
    return DynamoDBRateLimiter()

def create_cache() -> CacheBackend:
    if os.environ.get("CACHE_BACKEND") == "redis":
        return RedisCache(os.environ["REDIS_ENDPOINT"])
    return DynamoDBCache()
```

Similarly, a `SecretsProvider` abstraction reads from SSM Parameter Store or Secrets Manager based on config:

```python
# src/utils/secrets.py
def get_secret(name: str) -> str:
    if os.environ.get("SECRETS_BACKEND") == "secretsmanager":
        client = boto3.client("secretsmanager")
        return client.get_secret_value(SecretId=name)["SecretString"]
    else:
        client = boto3.client("ssm")
        return client.get_parameter(Name=name, WithDecryption=True)["Parameter"]["Value"]
```

#### 17.4.3 Migration Triggers (When to Scale Up)

| Trigger | Metric | Current Solution | Action | New Cost |
|---------|--------|-----------------|--------|----------|
| Message throughput >100K/hour | CloudWatch metric | DynamoDB rate limiter | Deploy CacheStack + NetworkingStack | +$48/month |
| Error volume >5K events/month | CloudWatch alarm | CloudWatch Logs | Add Sentry SDK + DSN | +$26/month |
| Secrets need auto-rotation | Security policy | SSM Parameter Store | Migrate to Secrets Manager | +$2-5/month |
| DDoS or IP blocking needed | Security incident | API Gateway throttling | Deploy WAF | +$5+/month |
| DynamoDB exceeds 25 RCU/WCU | CloudWatch throttle alarm | Provisioned (free tier) | Switch to On-Demand in CDK | Variable |
| S3/CloudFront free tier expires | 12 months after signup | Free tier | No action needed | +$1-3/month |

#### 17.4.4 Migration Procedure (Phase 1 → Phase 2)

```bash
# Step 1: Update CDK config
# config/prod.py: set enable_redis=True, enable_vpc=True, secrets_backend="secretsmanager"

# Step 2: Deploy new stacks (networking first, then cache)
cdk deploy marketing-networking-prod --context env=prod
cdk deploy marketing-cache-prod --context env=prod

# Step 3: Update Lambda environment variables
# RATE_LIMITER_BACKEND=redis, CACHE_BACKEND=redis, REDIS_ENDPOINT=<new endpoint>
cdk deploy marketing-api-prod --context env=prod

# Step 4: Migrate secrets from SSM to Secrets Manager
python scripts/migrate_secrets.py --from ssm --to secretsmanager

# Step 5: Verify
# Run smoke tests, check rate limiter is using Redis, verify cache hits
```

**Total migration time:** ~30 minutes. **Zero downtime.** Lambda picks up new environment variables on next cold start (force restart with `aws lambda update-function-configuration`).

---

## 18. Testing Strategy

### 18.1 Testing Pyramid

| Level | Tool | Target | Run In |
|-------|------|--------|--------|
| Unit (Backend) | pytest + moto | 80% line coverage | Every PR |
| Unit (Frontend) | Vitest + RTL | 80% component coverage | Every PR |
| Integration | pytest + LocalStack | Key API flows | develop/main |
| Contract | pytest | All API schemas | Every PR |
| E2E | Playwright | Critical user journeys | Post-deploy |
| Performance | Artillery | API latency + throughput | Weekly / pre-release |
| Security | Bandit + Trivy + npm audit | No critical/high vulns | Every PR |

### 18.2 Critical E2E Test Scenarios

1. **Tenant signup → first campaign:** Full onboarding flow, create template, create segment, create campaign, schedule, verify execution.
2. **Campaign lifecycle:** Draft → Schedule → Execute → Complete (with mock WhatsApp API).
3. **Billing flow:** Subscribe → Usage tracking → Invoice generation → Payment.
4. **Loyalty integration:** Connect → Sync → Segment with loyalty criteria → Campaign execution.
5. **Opt-out flow:** Customer opt-in → Receive campaign → Reply STOP → Verify exclusion from next campaign.
6. **RBAC:** Verify staff cannot access admin features, manager cannot cancel campaigns.

---

## 19. Development Phases and Timeline

### Phase 1: Foundation (Weeks 1-3)

- [ ] AWS CDK stacks (auth, data, networking, API skeleton)
- [ ] DynamoDB table with all entity patterns
- [ ] Cognito setup with tenant-aware groups
- [ ] API Gateway with JWT authorizer
- [ ] CI/CD pipeline (lint, test, deploy to dev)
- [ ] Base Lambda handler pattern with powertools
- [ ] Tenant CRUD API
- [ ] User management API
- [ ] API key management

### Phase 2: Campaign Engine (Weeks 4-6)

- [ ] Campaign CRUD APIs
- [ ] Template CRUD APIs + Meta submission
- [ ] Segment CRUD APIs + evaluation engine
- [ ] Campaign scheduling (EventBridge)
- [ ] Campaign execution engine (SQS + worker Lambda)
- [ ] WhatsApp Cloud API integration (send template messages)
- [ ] Webhook receiver for delivery status
- [ ] Rate limiting (DynamoDB TTL-based for Phase 1; Redis adapter ready for Phase 2+)
- [ ] DLQ and failure handling

### Phase 3: Dashboard — Core (Weeks 7-9)

- [ ] React project setup (TypeScript, Tailwind, React Query)
- [ ] Authentication flow (login, signup, password reset)
- [ ] Campaign list + detail pages
- [ ] Campaign creation wizard
- [ ] Segment builder UI
- [ ] Template creator with WhatsApp preview
- [ ] Customer list + profile pages
- [ ] Dashboard overview page

### Phase 4: Billing and Payments (Weeks 10-11)

- [ ] Stripe integration (customer, subscription, invoices)
- [ ] Razorpay integration
- [ ] Usage tracking and metering
- [ ] Plan enforcement (limit checks)
- [ ] Billing UI (subscription, invoices, payment methods)
- [ ] Invoice PDF generation

### Phase 5: Integration and Notifications (Weeks 12-13)

- [ ] Loyalty platform integration APIs
- [ ] Webhook system (outbound registration + delivery)
- [ ] Inbound webhook handlers (Loyalty, Stripe, Razorpay)
- [ ] Notification system (in-app, email, push)
- [ ] Notification preferences UI
- [ ] Integration settings UI

### Phase 6: Analytics and Advanced Features (Weeks 14-15)

- [ ] Campaign analytics (DynamoDB Streams processor)
- [ ] Analytics dashboard UI (charts, KPIs, comparison)
- [ ] Export functionality (CSV, PDF)
- [ ] Opt-in/opt-out management UI
- [ ] Automated campaigns (birthday, re-engagement)
- [ ] Super admin dashboard

### Phase 7: Polish and Launch (Weeks 16-18)

- [ ] E2E test suite (Playwright)
- [ ] Performance testing and optimization
- [ ] Security audit and penetration testing
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Documentation (API docs, user guide, training materials)
- [ ] Demo environment setup
- [ ] UAT with pilot tenants
- [ ] Production deployment
- [ ] Post-launch monitoring and support

---

## 20. Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| WhatsApp API approval delays | Medium | High | Apply early, prepare all Meta documentation in advance |
| Meta template rejection rate | Medium | Medium | Follow Meta guidelines strictly, prepare multiple variations, test with sandbox |
| Loyalty platform API instability | Medium | Medium | Cache aggressively, fail gracefully (skip loyalty criteria, don't block campaigns) |
| Multi-tenant data leakage | Low | Critical | Enforce PK prefix at repository layer, automated security tests, penetration testing |
| WhatsApp rate limit changes | Low | High | Abstract rate limits into config, monitor Meta announcements, build in headroom |
| Payment gateway downtime | Low | Medium | Dual gateway (Stripe + Razorpay), queue billing operations for retry |
| High message volume cost spikes | Medium | Medium | Real-time usage alerts, plan limit enforcement, spending caps per tenant |
| Tenant onboarding friction | Medium | Medium | Guided wizard, embedded Meta signup, test message on first setup |
| GDPR/DPDP compliance gaps | Low | High | Data audit, privacy-by-design, legal review, automated data deletion |
| Campaign sending to opted-out users | Low | Critical | Double-check at send time (not just segment time), audit log, immediate opt-out processing |

---

## 21. Success Metrics

### 21.1 Platform KPIs

| Metric | Month 1 Target | Month 6 Target |
|--------|---------------|----------------|
| Active tenants | 10 | 100 |
| Monthly messages sent (platform) | 10,000 | 500,000 |
| MRR (Monthly Recurring Revenue) | ₹50,000 | ₹5,00,000 |
| Tenant churn rate | < 10% | < 5% |
| Average revenue per tenant | ₹5,000 | ₹5,000 |
| Platform uptime | 99.5% | 99.9% |

### 21.2 Product KPIs

| Metric | Target |
|--------|--------|
| Tenant onboarding completion rate | > 80% |
| Campaign delivery rate | > 95% |
| Average message read rate | > 50% |
| Dashboard daily active usage | > 60% of tenants |
| API integration adoption (Growth+ plans) | > 30% |
| Loyalty integration adoption (Growth+ plans) | > 40% |
| Support ticket volume per tenant | < 2/month |
| Time to first campaign (new tenant) | < 30 minutes |

---

## 22. Appendices

### Appendix A: WhatsApp Cloud API Reference

| Operation | Endpoint |
|-----------|----------|
| Send Template Message | `POST /v21.0/{phone_id}/messages` |
| Upload Media | `POST /v21.0/{phone_id}/media` |
| Get Templates | `GET /v21.0/{waba_id}/message_templates` |
| Create Template | `POST /v21.0/{waba_id}/message_templates` |
| Delete Template | `DELETE /v21.0/{waba_id}/message_templates?name={name}` |
| Get Business Profile | `GET /v21.0/{phone_id}/whatsapp_business_profile` |
| Webhook Verify | `GET /webhook` (hub.mode, hub.verify_token, hub.challenge) |
| Webhook Events | `POST /webhook` (messages, statuses) |

### Appendix B: Environment Variables

| Variable | Description | Source |
|----------|-------------|--------|
| `ENVIRONMENT` | dev / demo / prod | CDK config |
| `DYNAMODB_TABLE_NAME` | Main table name | CDK output |
| `SQS_CAMPAIGN_QUEUE_URL` | FIFO queue URL | CDK output |
| `SQS_DLQ_URL` | Dead letter queue URL | CDK output |
| `REDIS_ENDPOINT` | ElastiCache endpoint (empty in Phase 1) | CDK output |
| `COGNITO_USER_POOL_ID` | Cognito pool ID | CDK output |
| `COGNITO_CLIENT_ID` | Cognito app client ID | CDK output |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification | SSM (Phase 1) / Secrets Manager (Phase 2+) |
| `STRIPE_SECRET_KEY` | Stripe API key | SSM (Phase 1) / Secrets Manager (Phase 2+) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing | SSM (Phase 1) / Secrets Manager (Phase 2+) |
| `RAZORPAY_KEY_ID` | Razorpay key | SSM (Phase 1) / Secrets Manager (Phase 2+) |
| `RAZORPAY_KEY_SECRET` | Razorpay secret | SSM (Phase 1) / Secrets Manager (Phase 2+) |
| `SENTRY_DSN` | Error tracking (empty in Phase 1) | SSM (Phase 1) / Secrets Manager (Phase 2+) |
| `CACHE_BACKEND` | "dynamodb" or "redis" | CDK config |
| `RATE_LIMITER_BACKEND` | "dynamodb" or "redis" | CDK config |
| `LOYALTY_API_BASE_URL` | Loyalty platform URL | CDK config |
| `LOG_LEVEL` | Logging level | CDK config |

### Appendix C: Glossary

| Term | Definition |
|------|-----------|
| Tenant | A salon business using the platform (may have multiple locations) |
| Campaign | A batch of WhatsApp marketing messages sent to a customer segment |
| Segment | A defined group of customers based on criteria |
| Template | A Meta-approved WhatsApp message format with variable placeholders |
| WABA | WhatsApp Business Account (Meta-level account) |
| BSP | Business Solution Provider (third-party WhatsApp API providers) |
| Cloud API | Meta's official direct API for WhatsApp Business |
| UTILITY | WhatsApp template category for service/transactional messages |
| MARKETING | WhatsApp template category for promotional messages |
| DLQ | Dead Letter Queue — holds permanently failed messages for inspection |
| PITR | Point-In-Time Recovery — DynamoDB continuous backup feature |
| MRR | Monthly Recurring Revenue |

### Appendix D: Claude + Antigravity Prompt Templates

**New Feature Implementation:**
```
Implement [feature name] for the Marketing Campaign Platform.

Context:
- Multi-tenant SaaS on AWS Serverless (Lambda + DynamoDB + SQS)
- Tenant ID is always in the JWT token and must scope all data access
- Follow the repository → service → handler pattern
- Use aws-lambda-powertools for logging/tracing/metrics
- Use Pydantic for request/response validation
- All DynamoDB operations use PK prefix TENANT#<tenant_id>

Requirements:
[paste specific requirements from this PRD]

Generate:
1. Pydantic models (backend/src/models/)
2. DynamoDB repository (backend/src/repositories/)
3. Service layer (backend/src/services/)
4. Lambda handler (backend/src/handlers/)
5. Unit tests with moto (backend/tests/unit/)
6. React page/component (frontend/src/)
7. CDK additions if new AWS resources needed
```

**Bug Fix:**
```
Fix: [describe the bug]

Current behavior: [what happens]
Expected behavior: [what should happen]

Relevant files:
- [list files]

Constraints:
- Must not break existing tests
- Must maintain multi-tenant data isolation
- Add a regression test for this fix
```

### Appendix E: Companion Documentation Suite

This PRD is supported by 10 companion documents that provide implementation-level guidance for Claude Code (Antigravity). All 11 documents (this PRD + 10 companions) live in `.antigravity/context/` and are read by Claude at session start.

| # | Document | Lines | Purpose |
|---|----------|-------|---------|
| 1 | `MARKETING_MODULE_PRD.md` | 1,925 | This document — product requirements |
| 2 | `CODING_STANDARDS.md` | 620 | Python/TypeScript conventions, git workflow |
| 3 | `UX_DESIGN_SYSTEM.md` | 719 | Design tokens, component catalog, accessibility |
| 4 | `ARCHITECTURE_PATTERNS.md` | 1,267 | Layer architecture, abstractions, error handling |
| 5 | `TESTING_PLAYBOOK.md` | 892 | Test patterns, fixtures, coverage targets |
| 6 | `DYNAMODB_COOKBOOK.md` | 479 | Access patterns, TTL, rate limiting, caching |
| 7 | `REACT_PATTERNS.md` | 625 | State management, hooks, forms, API client |
| 8 | `CDK_PATTERNS.md` | 598 | IaC templates, environment configs, deployment |
| 9 | `API_CONVENTIONS.md` | 430 | REST design, auth, pagination, error codes |
| 10 | `SECURITY_PLAYBOOK.md` | 750+ | Tenant isolation, OWASP, PII, incident response |
| 11 | `DEV_ENVIRONMENT_SETUP.md` | 500+ | Prerequisites, Context7, Superpowers, bootstrap |

### Appendix F: Development Tooling (Context7 + Superpowers)

**Context7 MCP Server** (https://github.com/upstash/context7) — Provides live, version-specific library documentation to Claude during development. Prevents API hallucination for AWS CDK, DynamoDB boto3, React 18, and Tailwind CSS. Free, MIT licensed.

```bash
# Install (one command)
claude mcp add context7 -- npx -y @upstash/context7-mcp
```

**Superpowers Plugin** (https://github.com/obra/superpowers) — Enforces brainstorm → plan → TDD → implement → review workflow on every task. 14 composable skills including test-driven-development, systematic-debugging, and subagent-driven-development. Free, MIT licensed.

```bash
# Install (two commands inside Claude Code session)
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

**See `DEV_ENVIRONMENT_SETUP.md` for complete installation walkthrough with verification steps.**

---

*End of Document — Version 3.0*
*This document is maintained in version control and updated with each sprint.*
*Last updated: March 1, 2026*
