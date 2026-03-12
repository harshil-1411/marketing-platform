# Architecture Patterns & Code Templates

**Project:** Salon WhatsApp Marketing Campaign Platform
**Version:** 1.0 | February 2026
**Audience:** Claude + Antigravity

---

## 1. Layer Architecture

Every feature follows this strict layer separation. Never skip layers.

```
┌───────────────────────────────┐
│  Lambda Handler               │  Input validation, auth context, response formatting
│  (src/handlers/)              │  ONLY calls service layer. No business logic here.
├───────────────────────────────┤
│  Service Layer                │  Business logic, orchestration, cross-cutting concerns
│  (src/services/)              │  Calls repositories and integrations. Stateless.
├───────────────────────────────┤
│  Repository Layer             │  Data access (DynamoDB). CRUD + query operations.
│  (src/repositories/)          │  No business logic. Returns domain models.
├───────────────────────────────┤
│  Integration Layer            │  External API calls (WhatsApp, Loyalty, Stripe)
│  (src/integrations/)          │  Abstractions over third-party services.
├───────────────────────────────┤
│  Models Layer                 │  Pydantic models for requests, responses, domain entities
│  (src/models/)                │  Pure data. No side effects.
├───────────────────────────────┤
│  Utils Layer                  │  Shared utilities (errors, date helpers, phone formatting)
│  (src/utils/)                 │  Pure functions. No AWS calls.
└───────────────────────────────┘
```

**Rules:**
- Handlers call services. Never repositories or integrations directly.
- Services call repositories and integrations. Never DynamoDB or boto3 directly.
- Repositories return domain models (Pydantic), never raw DynamoDB dicts.
- Integrations return typed responses, never raw HTTP responses.
- Models have no dependencies on any other layer.
- Utils have no dependencies on any other layer.

---

## 2. Lambda Handler Pattern

### 2.1 Standard Handler Template

```python
"""Campaign API handlers.

Handles HTTP requests for campaign CRUD operations.
Routes: POST/GET/PUT /api/v1/campaigns, POST /api/v1/campaigns/{id}/schedule
"""

from aws_lambda_powertools import Logger, Metrics, Tracer
from aws_lambda_powertools.event_handler import APIGatewayRestResolver
from aws_lambda_powertools.event_handler.exceptions import (
    BadRequestError,
    NotFoundError as PowertoolsNotFound,
    UnauthorizedError,
)
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.metrics import MetricUnit
from aws_lambda_powertools.utilities.typing import LambdaContext

from src.models.campaign import (
    CampaignResponse,
    CreateCampaignRequest,
    UpdateCampaignRequest,
)
from src.services.campaign_service import CampaignService
from src.utils.auth import get_tenant_context, require_role
from src.utils.errors import AppError, NotFoundError, ValidationError
from src.utils.response import api_response, paginated_response

logger = Logger(service="campaign-api")
tracer = Tracer(service="campaign-api")
metrics = Metrics(namespace="SalonMarketing")
app = APIGatewayRestResolver(strip_prefixes=["/api/v1"])

# Service initialization (happens once per Lambda cold start)
_campaign_service: CampaignService | None = None


def get_campaign_service() -> CampaignService:
    """Lazy-initialize campaign service (cold start optimization)."""
    global _campaign_service
    if _campaign_service is None:
        _campaign_service = CampaignService.create()
    return _campaign_service


@app.post("/campaigns")
@tracer.capture_method
def create_campaign() -> dict:
    """Create a new campaign in DRAFT status."""
    ctx = get_tenant_context(app.current_event)
    require_role(ctx, ["admin", "manager"])

    try:
        request = CreateCampaignRequest(**app.current_event.json_body)
    except Exception as e:
        raise BadRequestError(str(e))

    service = get_campaign_service()
    campaign = service.create_campaign(
        tenant_id=ctx.tenant_id,
        request=request,
        user_id=ctx.user_id,
    )

    metrics.add_metric(name="CampaignCreated", unit=MetricUnit.Count, value=1)
    logger.info("Campaign created", extra={
        "tenant_id": ctx.tenant_id,
        "campaign_id": campaign.campaign_id,
        "campaign_type": campaign.type,
    })

    return api_response(data=campaign.model_dump(), status_code=201)


@app.get("/campaigns")
@tracer.capture_method
def list_campaigns() -> dict:
    """List campaigns for the current tenant."""
    ctx = get_tenant_context(app.current_event)
    require_role(ctx, ["admin", "manager", "staff"])

    params = app.current_event.query_string_parameters or {}
    limit = min(int(params.get("limit", "25")), 100)
    cursor = params.get("cursor")
    status_filter = params.get("status")

    service = get_campaign_service()
    campaigns, next_cursor = service.list_campaigns(
        tenant_id=ctx.tenant_id,
        limit=limit,
        cursor=cursor,
        status_filter=status_filter,
    )

    return paginated_response(
        data=[c.model_dump() for c in campaigns],
        cursor=next_cursor,
        limit=limit,
    )


@app.get("/campaigns/<campaign_id>")
@tracer.capture_method
def get_campaign(campaign_id: str) -> dict:
    """Get a single campaign by ID."""
    ctx = get_tenant_context(app.current_event)
    require_role(ctx, ["admin", "manager", "staff"])

    service = get_campaign_service()
    try:
        campaign = service.get_campaign(ctx.tenant_id, campaign_id)
    except NotFoundError:
        raise PowertoolsNotFound(f"Campaign {campaign_id} not found")

    return api_response(data=campaign.model_dump())


@app.post("/campaigns/<campaign_id>/schedule")
@tracer.capture_method
def schedule_campaign(campaign_id: str) -> dict:
    """Schedule a draft campaign for execution."""
    ctx = get_tenant_context(app.current_event)
    require_role(ctx, ["admin", "manager"])

    body = app.current_event.json_body or {}
    scheduled_at = body.get("scheduled_at")

    service = get_campaign_service()
    try:
        campaign = service.schedule_campaign(
            tenant_id=ctx.tenant_id,
            campaign_id=campaign_id,
            scheduled_at=scheduled_at,
            user_id=ctx.user_id,
        )
    except NotFoundError:
        raise PowertoolsNotFound(f"Campaign {campaign_id} not found")
    except ValidationError as e:
        raise BadRequestError(str(e))

    metrics.add_metric(name="CampaignScheduled", unit=MetricUnit.Count, value=1)
    return api_response(data=campaign.model_dump())


# ─── Lambda entry point ──────────────────────────────────────
@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_REST)
@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
def handler(event: dict, context: LambdaContext) -> dict:
    """Lambda entry point. Do NOT put logic here."""
    return app.resolve(event, context)
```

### 2.2 Handler Rules

1. **No business logic in handlers.** Handlers validate input, call service, format response. That's it.
2. **One handler file per resource** (campaigns, segments, templates, etc.).
3. **Lazy service initialization** to minimize cold start impact.
4. **Always use `get_tenant_context()`** to extract and validate tenant from JWT.
5. **Always use `require_role()`** to enforce RBAC before any operation.
6. **Log after successful operations** with tenant_id, resource_id, and action.
7. **Emit metrics** for every write operation (create, update, schedule, etc.).
8. **Map domain errors to HTTP errors** in the handler (NotFoundError → 404, ValidationError → 400).

### 2.3 Auth Context Utility

```python
# src/utils/auth.py
from dataclasses import dataclass

from aws_lambda_powertools.event_handler.exceptions import UnauthorizedError


@dataclass(frozen=True)
class TenantContext:
    """Extracted from JWT claims. Immutable."""
    tenant_id: str
    user_id: str
    email: str
    role: str  # "admin" | "manager" | "staff"


def get_tenant_context(event) -> TenantContext:
    """Extract tenant context from API Gateway event with Cognito authorizer."""
    claims = event.request_context.authorizer.claims
    if not claims:
        raise UnauthorizedError("Missing authentication")

    return TenantContext(
        tenant_id=claims["custom:tenant_id"],
        user_id=claims["sub"],
        email=claims["email"],
        role=claims["custom:role"],
    )


def require_role(ctx: TenantContext, allowed_roles: list[str]) -> None:
    """Enforce role-based access control."""
    if ctx.role not in allowed_roles:
        raise UnauthorizedError(f"Role '{ctx.role}' is not authorized for this action")
```

### 2.4 Response Utilities

```python
# src/utils/response.py
import uuid
from datetime import datetime, timezone
from typing import Any


def api_response(data: Any, status_code: int = 200) -> dict:
    """Standard success response envelope."""
    return {
        "statusCode": status_code,
        "body": {
            "data": data,
            "meta": {
                "request_id": f"req_{uuid.uuid4().hex[:12]}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        },
    }


def paginated_response(
    data: list[Any],
    cursor: str | None,
    limit: int,
) -> dict:
    """Standard paginated response."""
    return {
        "statusCode": 200,
        "body": {
            "data": data,
            "meta": {
                "request_id": f"req_{uuid.uuid4().hex[:12]}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
            "pagination": {
                "cursor": cursor,
                "has_more": cursor is not None,
                "limit": limit,
            },
        },
    }
```

---

## 3. Service Layer Pattern

### 3.1 Standard Service Template

```python
"""Campaign service — business logic for campaign operations.

Orchestrates campaign repository, template validation, segment evaluation,
and EventBridge scheduling.
"""

from datetime import datetime, timezone

from aws_lambda_powertools import Logger

from src.integrations.eventbridge_client import EventBridgeClient
from src.models.campaign import (
    Campaign,
    CampaignStatus,
    CreateCampaignRequest,
)
from src.repositories.campaign_repository import CampaignRepository
from src.repositories.template_repository import TemplateRepository
from src.repositories.segment_repository import SegmentRepository
from src.utils.errors import (
    ConflictError,
    InvalidStateError,
    NotFoundError,
    ValidationError,
)
from src.utils.id_generator import generate_id

logger = Logger(service="campaign-service")


class CampaignService:
    """Business logic for campaign management.

    All methods are stateless. Dependencies are injected via constructor
    for testability (mock repositories in unit tests).
    """

    def __init__(
        self,
        campaign_repo: CampaignRepository,
        template_repo: TemplateRepository,
        segment_repo: SegmentRepository,
        eventbridge_client: EventBridgeClient,
    ) -> None:
        self._campaigns = campaign_repo
        self._templates = template_repo
        self._segments = segment_repo
        self._eventbridge = eventbridge_client

    @classmethod
    def create(cls) -> "CampaignService":
        """Factory method for Lambda initialization.
        
        Creates service with real AWS dependencies.
        Unit tests bypass this and inject mocks directly.
        """
        return cls(
            campaign_repo=CampaignRepository.create(),
            template_repo=TemplateRepository.create(),
            segment_repo=SegmentRepository.create(),
            eventbridge_client=EventBridgeClient.create(),
        )

    def create_campaign(
        self,
        tenant_id: str,
        request: CreateCampaignRequest,
        user_id: str,
    ) -> Campaign:
        """Create a new campaign in DRAFT status.

        Args:
            tenant_id: Tenant context for data isolation.
            request: Validated request body.
            user_id: ID of the user creating the campaign.

        Returns:
            Newly created Campaign in DRAFT status.

        Raises:
            NotFoundError: If template_id or segment_id doesn't exist.
            ValidationError: If template is not approved.
        """
        # Validate template exists and is approved
        template = self._templates.get(tenant_id, request.template_id)
        if not template:
            raise NotFoundError(f"Template {request.template_id} not found")
        if template.status != "approved":
            raise ValidationError(
                f"Template {request.template_id} is not approved (status: {template.status})"
            )

        # Validate segment exists
        segment = self._segments.get(tenant_id, request.segment_id)
        if not segment:
            raise NotFoundError(f"Segment {request.segment_id} not found")

        # Create campaign entity
        now = datetime.now(timezone.utc)
        campaign = Campaign(
            campaign_id=generate_id("camp"),
            tenant_id=tenant_id,
            name=request.name,
            description=request.description,
            type=request.type,
            status=CampaignStatus.DRAFT,
            template_id=request.template_id,
            segment_id=request.segment_id,
            personalization_mapping=request.personalization_mapping,
            created_by=user_id,
            created_at=now,
            updated_at=now,
            version=1,
        )

        self._campaigns.put(campaign)
        return campaign

    def schedule_campaign(
        self,
        tenant_id: str,
        campaign_id: str,
        scheduled_at: str | None,
        user_id: str,
    ) -> Campaign:
        """Schedule a draft campaign for future execution.

        Uses DynamoDB conditional write to enforce DRAFT → SCHEDULED
        transition atomically (prevents race conditions).

        Raises:
            NotFoundError: Campaign doesn't exist.
            InvalidStateError: Campaign is not in DRAFT status.
            ValidationError: Template not approved or segment is empty.
        """
        campaign = self._campaigns.get(tenant_id, campaign_id)
        if not campaign:
            raise NotFoundError(f"Campaign {campaign_id} not found")

        if campaign.status != CampaignStatus.DRAFT:
            raise InvalidStateError(
                f"Cannot schedule campaign in {campaign.status} status. Must be DRAFT."
            )

        # Re-validate template (could have been rejected since campaign creation)
        template = self._templates.get(tenant_id, campaign.template_id)
        if not template or template.status != "approved":
            raise ValidationError("Campaign template is not approved")

        # Parse schedule
        if scheduled_at:
            schedule_dt = datetime.fromisoformat(scheduled_at)
            if schedule_dt <= datetime.now(timezone.utc):
                raise ValidationError("Scheduled time must be in the future")
        else:
            schedule_dt = datetime.now(timezone.utc)  # Send immediately

        # Update campaign with conditional write (status must still be DRAFT)
        now = datetime.now(timezone.utc)
        campaign.status = CampaignStatus.SCHEDULED
        campaign.schedule_at = schedule_dt
        campaign.updated_at = now
        campaign.version += 1

        self._campaigns.update_status(
            campaign,
            expected_status=CampaignStatus.DRAFT,
            expected_version=campaign.version - 1,
        )

        # Create EventBridge schedule
        self._eventbridge.create_campaign_schedule(
            tenant_id=tenant_id,
            campaign_id=campaign.campaign_id,
            schedule_at=schedule_dt,
        )

        logger.info("Campaign scheduled", extra={
            "tenant_id": tenant_id,
            "campaign_id": campaign_id,
            "scheduled_at": schedule_dt.isoformat(),
        })

        return campaign

    def list_campaigns(
        self,
        tenant_id: str,
        limit: int = 25,
        cursor: str | None = None,
        status_filter: str | None = None,
    ) -> tuple[list[Campaign], str | None]:
        """List campaigns for a tenant with optional filtering and pagination."""
        return self._campaigns.list_by_tenant(
            tenant_id=tenant_id,
            limit=limit,
            cursor=cursor,
            status_filter=status_filter,
        )

    def get_campaign(self, tenant_id: str, campaign_id: str) -> Campaign:
        """Get a single campaign. Raises NotFoundError if not found."""
        campaign = self._campaigns.get(tenant_id, campaign_id)
        if not campaign:
            raise NotFoundError(f"Campaign {campaign_id} not found")
        return campaign
```

### 3.2 Service Rules

1. **Constructor injection** for all dependencies. Never import and call AWS directly.
2. **`create()` class method** for Lambda initialization. Tests inject mocks directly.
3. **Validate business rules** at the service level (not handler, not repository).
4. **Use conditional writes** for state transitions to prevent race conditions.
5. **Log important business events** with structured context.
6. **Return domain models**, never dicts or DynamoDB items.
7. **Raise domain-specific errors** (NotFoundError, ValidationError, etc.).

---

## 4. Repository Layer Pattern

### 4.1 Standard Repository Template

```python
"""Campaign repository — DynamoDB access for campaign entities.

All DynamoDB operations for campaigns are encapsulated here.
Uses single-table design with PK/SK patterns.
"""

import base64
import json
from datetime import datetime, timezone

import boto3
from aws_lambda_powertools import Logger
from boto3.dynamodb.conditions import Attr, Key

from src.config import DYNAMODB_TABLE_NAME
from src.models.campaign import Campaign, CampaignStatus
from src.utils.errors import ConflictError

logger = Logger(service="campaign-repository")


class CampaignRepository:
    """DynamoDB access layer for campaigns.
    
    Key patterns:
      PK: TENANT#<tenant_id>
      SK: CAMPAIGN#<campaign_id>
      GSI1PK: TENANT#<tenant_id>#CAMPAIGN
      GSI1SK: <status>#<created_at_iso>
    """

    def __init__(self, table) -> None:
        self._table = table

    @classmethod
    def create(cls) -> "CampaignRepository":
        """Create with real DynamoDB table."""
        dynamodb = boto3.resource("dynamodb")
        table = dynamodb.Table(DYNAMODB_TABLE_NAME)
        return cls(table=table)

    def put(self, campaign: Campaign) -> None:
        """Insert a new campaign. Fails if campaign_id already exists."""
        item = self._to_dynamo(campaign)
        self._table.put_item(
            Item=item,
            ConditionExpression=Attr("PK").not_exists(),
        )

    def get(self, tenant_id: str, campaign_id: str) -> Campaign | None:
        """Fetch a single campaign by ID. Returns None if not found."""
        response = self._table.get_item(
            Key={
                "PK": f"TENANT#{tenant_id}",
                "SK": f"CAMPAIGN#{campaign_id}",
            },
            ConsistentRead=True,
        )
        item = response.get("Item")
        return self._from_dynamo(item) if item else None

    def update_status(
        self,
        campaign: Campaign,
        expected_status: CampaignStatus,
        expected_version: int,
    ) -> None:
        """Update campaign with optimistic locking.
        
        Uses ConditionExpression to ensure:
        1. Status is still what we expect (prevents race conditions)
        2. Version matches (prevents concurrent updates)
        
        Raises:
            ConflictError: If condition check fails (concurrent modification).
        """
        try:
            self._table.update_item(
                Key={
                    "PK": f"TENANT#{campaign.tenant_id}",
                    "SK": f"CAMPAIGN#{campaign.campaign_id}",
                },
                UpdateExpression=(
                    "SET #status = :new_status, "
                    "#updated_at = :now, "
                    "#version = :new_version, "
                    "#gsi1sk = :new_gsi1sk"
                ),
                ExpressionAttributeNames={
                    "#status": "status",
                    "#updated_at": "updated_at",
                    "#version": "version",
                    "#gsi1sk": "GSI1SK",
                },
                ExpressionAttributeValues={
                    ":new_status": campaign.status.value,
                    ":now": campaign.updated_at.isoformat(),
                    ":new_version": campaign.version,
                    ":new_gsi1sk": f"{campaign.status.value}#{campaign.created_at.isoformat()}",
                    ":expected_status": expected_status.value,
                    ":expected_version": expected_version,
                },
                ConditionExpression=(
                    "#status = :expected_status AND #version = :expected_version"
                ),
            )
        except self._table.meta.client.exceptions.ConditionalCheckFailedException:
            raise ConflictError(
                f"Campaign {campaign.campaign_id} was modified concurrently. "
                f"Expected status={expected_status.value}, version={expected_version}."
            )

    def list_by_tenant(
        self,
        tenant_id: str,
        limit: int = 25,
        cursor: str | None = None,
        status_filter: str | None = None,
    ) -> tuple[list[Campaign], str | None]:
        """List campaigns for a tenant using GSI1.
        
        Returns (campaigns, next_cursor). next_cursor is None if no more pages.
        """
        query_params = {
            "IndexName": "GSI1",
            "KeyConditionExpression": Key("GSI1PK").eq(f"TENANT#{tenant_id}#CAMPAIGN"),
            "ScanIndexForward": False,  # Newest first
            "Limit": limit,
        }

        if status_filter:
            query_params["KeyConditionExpression"] &= Key("GSI1SK").begins_with(status_filter)

        if cursor:
            query_params["ExclusiveStartKey"] = self._decode_cursor(cursor)

        response = self._table.query(**query_params)

        campaigns = [self._from_dynamo(item) for item in response.get("Items", [])]
        last_key = response.get("LastEvaluatedKey")
        next_cursor = self._encode_cursor(last_key) if last_key else None

        return campaigns, next_cursor

    def increment_counter(
        self,
        tenant_id: str,
        campaign_id: str,
        field: str,
        amount: int = 1,
    ) -> None:
        """Atomically increment a campaign counter (messages_sent, etc.)."""
        self._table.update_item(
            Key={
                "PK": f"TENANT#{tenant_id}",
                "SK": f"CAMPAIGN#{campaign_id}",
            },
            UpdateExpression=f"ADD #field :amount",
            ExpressionAttributeNames={"#field": field},
            ExpressionAttributeValues={":amount": amount},
        )

    # ─── Mapping methods ─────────────────────────────────────

    def _to_dynamo(self, campaign: Campaign) -> dict:
        """Convert domain model to DynamoDB item."""
        return {
            "PK": f"TENANT#{campaign.tenant_id}",
            "SK": f"CAMPAIGN#{campaign.campaign_id}",
            "GSI1PK": f"TENANT#{campaign.tenant_id}#CAMPAIGN",
            "GSI1SK": f"{campaign.status.value}#{campaign.created_at.isoformat()}",
            "campaign_id": campaign.campaign_id,
            "tenant_id": campaign.tenant_id,
            "name": campaign.name,
            "description": campaign.description,
            "type": campaign.type,
            "status": campaign.status.value,
            "template_id": campaign.template_id,
            "segment_id": campaign.segment_id,
            "personalization_mapping": campaign.personalization_mapping,
            "created_by": campaign.created_by,
            "created_at": campaign.created_at.isoformat(),
            "updated_at": campaign.updated_at.isoformat(),
            "version": campaign.version,
            "entity_type": "Campaign",
        }

    def _from_dynamo(self, item: dict) -> Campaign:
        """Convert DynamoDB item to domain model."""
        return Campaign(
            campaign_id=item["campaign_id"],
            tenant_id=item["tenant_id"],
            name=item["name"],
            description=item.get("description", ""),
            type=item["type"],
            status=CampaignStatus(item["status"]),
            template_id=item["template_id"],
            segment_id=item["segment_id"],
            personalization_mapping=item.get("personalization_mapping", {}),
            created_by=item["created_by"],
            created_at=datetime.fromisoformat(item["created_at"]),
            updated_at=datetime.fromisoformat(item["updated_at"]),
            version=item.get("version", 1),
        )

    @staticmethod
    def _encode_cursor(last_key: dict) -> str:
        return base64.urlsafe_b64encode(json.dumps(last_key).encode()).decode()

    @staticmethod
    def _decode_cursor(cursor: str) -> dict:
        return json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
```

### 4.2 Repository Rules

1. **One repository per entity type** (CampaignRepository, SegmentRepository, etc.).
2. **Constructor receives the DynamoDB table resource.** `create()` factory for real table.
3. **`_to_dynamo()` and `_from_dynamo()`** mapping methods. Never leak DynamoDB structure to callers.
4. **Return domain models or None.** Never return raw dicts.
5. **Use conditional writes** for create (prevent duplicates) and update (optimistic locking).
6. **Cursor-based pagination** using DynamoDB's LastEvaluatedKey, base64-encoded.
7. **Use Query, never Scan.** If you need Scan, the table design is wrong.
8. **Atomic counters** with ADD for concurrent-safe increments (message counts).

---

## 5. Integration Layer Pattern

### 5.1 WhatsApp Client

```python
"""WhatsApp Cloud API client.

Abstracts Meta's Cloud API for sending messages, managing templates,
and handling webhooks.
"""

from dataclasses import dataclass

import httpx
from aws_lambda_powertools import Logger

from src.utils.errors import ExternalServiceError
from src.utils.secrets import get_secret

logger = Logger(service="whatsapp-client")

WHATSAPP_API_BASE = "https://graph.facebook.com/v21.0"


@dataclass
class MessageResult:
    """Result of a message send attempt."""
    message_id: str
    phone: str
    status: str  # "accepted" | "failed"
    error_code: str | None = None
    error_message: str | None = None


class WhatsAppClient:
    """Client for Meta WhatsApp Cloud API."""

    def __init__(self, phone_number_id: str, access_token: str) -> None:
        self._phone_id = phone_number_id
        self._headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        self._client = httpx.Client(
            base_url=WHATSAPP_API_BASE,
            headers=self._headers,
            timeout=10.0,
        )

    @classmethod
    def create(cls, tenant_config: dict) -> "WhatsAppClient":
        """Create client from tenant WhatsApp configuration."""
        access_token = get_secret(tenant_config["access_token_secret_arn"])
        return cls(
            phone_number_id=tenant_config["phone_number_id"],
            access_token=access_token,
        )

    def send_template_message(
        self,
        to_phone: str,
        template_name: str,
        language_code: str,
        components: list[dict],
    ) -> MessageResult:
        """Send a template message to a customer.

        Args:
            to_phone: Customer phone in international format (e.g., "919876543210")
            template_name: Meta-approved template name
            language_code: Template language (e.g., "en", "hi")
            components: Template components with variable values

        Returns:
            MessageResult with message_id on success.

        Raises:
            ExternalServiceError: On API failure (after logging).
        """
        payload = {
            "messaging_product": "whatsapp",
            "to": to_phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code},
                "components": components,
            },
        }

        try:
            response = self._client.post(
                f"/{self._phone_id}/messages",
                json=payload,
            )

            if response.status_code == 429:
                raise ExternalServiceError(
                    code="WHATSAPP_RATE_LIMITED",
                    message="WhatsApp API rate limit exceeded",
                    details={"retry_after": response.headers.get("Retry-After", "60")},
                )

            if response.status_code >= 400:
                error_data = response.json().get("error", {})
                return MessageResult(
                    message_id="",
                    phone=to_phone,
                    status="failed",
                    error_code=str(error_data.get("code", "UNKNOWN")),
                    error_message=error_data.get("message", "Unknown error"),
                )

            data = response.json()
            message_id = data["messages"][0]["id"]
            return MessageResult(
                message_id=message_id,
                phone=to_phone,
                status="accepted",
            )

        except httpx.TimeoutException:
            raise ExternalServiceError(
                code="WHATSAPP_TIMEOUT",
                message=f"WhatsApp API timed out sending to {to_phone[-4:]}",
            )

    def close(self) -> None:
        """Close the HTTP client."""
        self._client.close()
```

### 5.2 Integration Rules

1. **One client class per external service** (WhatsApp, Loyalty, Stripe, Razorpay).
2. **Return typed dataclasses**, never raw HTTP responses.
3. **Map external errors to domain errors** (ExternalServiceError with code).
4. **Set explicit timeouts** (10s default for external APIs).
5. **Log all external API calls** with duration, status, and error details.
6. **Never log PII** (mask phone numbers to last 4 digits in logs).
7. **Use `create()` factory** for real initialization, constructor for testing.

---

## 6. Cost-Optimized Backend Abstractions

The platform uses a **strategy pattern** for rate limiting and caching so that the same service layer code works with DynamoDB (Phase 1, $0/month) or Redis (Phase 2+, $48/month).

### 6.1 Rate Limiter (DynamoDB Implementation — Phase 1)

```python
"""Rate limiter using DynamoDB TTL-based atomic counters.

Phase 1 implementation. Handles up to ~100K messages/hour.
Swap to RedisRateLimiter when throughput exceeds this threshold.
"""

from datetime import datetime, timezone
from typing import Protocol

import boto3
from boto3.dynamodb.conditions import Attr

from src.config import DYNAMODB_TABLE_NAME


class RateLimiter(Protocol):
    """Rate limiter interface. Service layer depends on this, not the implementation."""

    def check_and_increment(self, tenant_id: str, key: str, limit: int, window_seconds: int) -> bool:
        """Check if under limit and atomically increment. Returns True if allowed."""
        ...

    def get_remaining(self, tenant_id: str, key: str, limit: int, window_seconds: int) -> int:
        """Get remaining capacity in the current window."""
        ...


class DynamoDBRateLimiter:
    """Rate limiter using DynamoDB TTL items. Free tier. ~5ms latency.

    Pattern:
    - PK: TENANT#<tenant_id>
    - SK: RATELIMIT#<key>#<window_bucket>
    - counter: int (atomic increment via ADD)
    - ttl: epoch seconds (auto-expires after window)
    
    Each time window gets its own item. TTL auto-deletes expired windows.
    """

    def __init__(self, table=None):
        if table is None:
            dynamodb = boto3.resource("dynamodb")
            table = dynamodb.Table(DYNAMODB_TABLE_NAME)
        self._table = table

    def check_and_increment(
        self, tenant_id: str, key: str, limit: int, window_seconds: int
    ) -> bool:
        now = int(datetime.now(timezone.utc).timestamp())
        window_bucket = now // window_seconds  # Floor to window boundary
        ttl_at = (window_bucket + 1) * window_seconds + 60  # Expire 60s after window ends

        try:
            response = self._table.update_item(
                Key={
                    "PK": f"TENANT#{tenant_id}",
                    "SK": f"RATELIMIT#{key}#{window_bucket}",
                },
                UpdateExpression="ADD #counter :inc SET #ttl = if_not_exists(#ttl, :ttl), entity_type = :et",
                ConditionExpression="attribute_not_exists(#counter) OR #counter < :limit",
                ExpressionAttributeNames={
                    "#counter": "counter",
                    "#ttl": "ttl",
                },
                ExpressionAttributeValues={
                    ":inc": 1,
                    ":limit": limit,
                    ":ttl": ttl_at,
                    ":et": "RateLimit",
                },
                ReturnValues="UPDATED_NEW",
            )
            return True  # Under limit, increment succeeded
        except self._table.meta.client.exceptions.ConditionalCheckFailedException:
            return False  # Limit reached

    def get_remaining(
        self, tenant_id: str, key: str, limit: int, window_seconds: int
    ) -> int:
        now = int(datetime.now(timezone.utc).timestamp())
        window_bucket = now // window_seconds

        response = self._table.get_item(
            Key={
                "PK": f"TENANT#{tenant_id}",
                "SK": f"RATELIMIT#{key}#{window_bucket}",
            },
            ProjectionExpression="#counter",
            ExpressionAttributeNames={"#counter": "counter"},
        )
        current = response.get("Item", {}).get("counter", 0)
        return max(0, limit - current)


class RedisRateLimiter:
    """Rate limiter using Redis sliding window. <1ms latency.
    
    Phase 2+ implementation. Deploy when throughput exceeds 100K/hour.
    Requires CacheStack + NetworkingStack in CDK.
    """

    def __init__(self, redis_endpoint: str):
        import redis
        self._redis = redis.Redis.from_url(redis_endpoint, decode_responses=True)

    def check_and_increment(
        self, tenant_id: str, key: str, limit: int, window_seconds: int
    ) -> bool:
        redis_key = f"tenant:{tenant_id}:ratelimit:{key}"
        pipe = self._redis.pipeline()
        pipe.incr(redis_key)
        pipe.expire(redis_key, window_seconds)
        results = pipe.execute()
        current_count = results[0]
        return current_count <= limit

    def get_remaining(
        self, tenant_id: str, key: str, limit: int, window_seconds: int
    ) -> int:
        redis_key = f"tenant:{tenant_id}:ratelimit:{key}"
        current = int(self._redis.get(redis_key) or 0)
        return max(0, limit - current)
```

### 6.2 Cache Backend (DynamoDB Implementation — Phase 1)

```python
"""Cache backend using DynamoDB TTL items.

Phase 1 implementation. ~5ms latency per lookup.
Swap to RedisCache when sub-millisecond reads are needed.
"""

import json
from datetime import datetime, timezone
from typing import Protocol

import boto3
from src.config import DYNAMODB_TABLE_NAME


class CacheBackend(Protocol):
    """Cache interface. Service layer depends on this, not the implementation."""

    def get(self, tenant_id: str, key: str) -> dict | None: ...
    def set(self, tenant_id: str, key: str, value: dict, ttl_seconds: int) -> None: ...
    def delete(self, tenant_id: str, key: str) -> None: ...


class DynamoDBCache:
    """Cache using DynamoDB items with TTL auto-expiry. Free tier."""

    def __init__(self, table=None):
        if table is None:
            dynamodb = boto3.resource("dynamodb")
            table = dynamodb.Table(DYNAMODB_TABLE_NAME)
        self._table = table

    def get(self, tenant_id: str, key: str) -> dict | None:
        response = self._table.get_item(
            Key={"PK": f"TENANT#{tenant_id}", "SK": f"CACHE#{key}"},
        )
        item = response.get("Item")
        if not item:
            return None
        # Check if TTL has logically expired (DynamoDB TTL deletion is async)
        if item.get("ttl", 0) < int(datetime.now(timezone.utc).timestamp()):
            return None
        return json.loads(item["cached_value"])

    def set(self, tenant_id: str, key: str, value: dict, ttl_seconds: int) -> None:
        ttl_at = int(datetime.now(timezone.utc).timestamp()) + ttl_seconds
        self._table.put_item(Item={
            "PK": f"TENANT#{tenant_id}",
            "SK": f"CACHE#{key}",
            "cached_value": json.dumps(value),
            "ttl": ttl_at,
            "entity_type": "Cache",
        })

    def delete(self, tenant_id: str, key: str) -> None:
        self._table.delete_item(
            Key={"PK": f"TENANT#{tenant_id}", "SK": f"CACHE#{key}"},
        )


class RedisCache:
    """Cache using Redis. <1ms latency. Phase 2+."""

    def __init__(self, redis_endpoint: str):
        import redis
        self._redis = redis.Redis.from_url(redis_endpoint, decode_responses=True)

    def get(self, tenant_id: str, key: str) -> dict | None:
        value = self._redis.get(f"tenant:{tenant_id}:cache:{key}")
        return json.loads(value) if value else None

    def set(self, tenant_id: str, key: str, value: dict, ttl_seconds: int) -> None:
        self._redis.setex(f"tenant:{tenant_id}:cache:{key}", ttl_seconds, json.dumps(value))

    def delete(self, tenant_id: str, key: str) -> None:
        self._redis.delete(f"tenant:{tenant_id}:cache:{key}")
```

### 6.3 Secrets Provider Abstraction

```python
"""Secrets provider that reads from SSM (Phase 1) or Secrets Manager (Phase 2+).

Phase 1: SSM Parameter Store SecureString — free, no auto-rotation.
Phase 2+: AWS Secrets Manager — $0.40/secret/month, supports auto-rotation.
"""

import os
import boto3
from functools import lru_cache


@lru_cache(maxsize=32)
def get_secret(name: str) -> str:
    """Fetch secret value. Cached for Lambda lifetime (until cold start).
    
    Args:
        name: Parameter name in SSM or secret name/ARN in Secrets Manager.
    """
    backend = os.environ.get("SECRETS_BACKEND", "ssm")

    if backend == "secretsmanager":
        client = boto3.client("secretsmanager")
        response = client.get_secret_value(SecretId=name)
        return response["SecretString"]
    else:
        client = boto3.client("ssm")
        response = client.get_parameter(Name=name, WithDecryption=True)
        return response["Parameter"]["Value"]
```

### 6.4 Factory Functions (Used by Service Layer)

```python
"""Factories for selecting the correct backend implementation.

Service layer calls these factories. Never imports DynamoDB/Redis implementations directly.
Environment variables control which implementation is used.
"""

import os
from src.utils.rate_limiter import DynamoDBRateLimiter, RedisRateLimiter, RateLimiter
from src.utils.cache import DynamoDBCache, RedisCache, CacheBackend


def create_rate_limiter() -> RateLimiter:
    """Create rate limiter based on RATE_LIMITER_BACKEND env var."""
    backend = os.environ.get("RATE_LIMITER_BACKEND", "dynamodb")
    if backend == "redis":
        return RedisRateLimiter(os.environ["REDIS_ENDPOINT"])
    return DynamoDBRateLimiter()


def create_cache() -> CacheBackend:
    """Create cache backend based on CACHE_BACKEND env var."""
    backend = os.environ.get("CACHE_BACKEND", "dynamodb")
    if backend == "redis":
        return RedisCache(os.environ["REDIS_ENDPOINT"])
    return DynamoDBCache()
```

---

## 7. Error Hierarchy

```python
# src/utils/errors.py

class AppError(Exception):
    """Base application error. All domain errors extend this."""
    def __init__(self, code: str, message: str, details: dict | None = None):
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(message)


class NotFoundError(AppError):
    """Resource not found (maps to HTTP 404)."""
    def __init__(self, message: str):
        super().__init__(code="NOT_FOUND", message=message)


class ValidationError(AppError):
    """Input validation failed (maps to HTTP 400)."""
    def __init__(self, message: str, details: dict | None = None):
        super().__init__(code="VALIDATION_ERROR", message=message, details=details)


class InvalidStateError(AppError):
    """Operation not allowed in current state (maps to HTTP 409)."""
    def __init__(self, message: str):
        super().__init__(code="INVALID_STATE", message=message)


class ConflictError(AppError):
    """Concurrent modification detected (maps to HTTP 409)."""
    def __init__(self, message: str):
        super().__init__(code="CONFLICT", message=message)


class ExternalServiceError(AppError):
    """External API call failed (maps to HTTP 502)."""
    def __init__(self, code: str, message: str, details: dict | None = None):
        super().__init__(code=code, message=message, details=details)


class PlanLimitError(AppError):
    """Tenant has exceeded their plan limits (maps to HTTP 403)."""
    def __init__(self, message: str, details: dict | None = None):
        super().__init__(code="PLAN_LIMIT_EXCEEDED", message=message, details=details)


class UnauthorizedError(AppError):
    """Authentication or authorization failure (maps to HTTP 401/403)."""
    def __init__(self, message: str):
        super().__init__(code="UNAUTHORIZED", message=message)
```

---

## 8. ID Generation

```python
# src/utils/id_generator.py
import uuid


def generate_id(prefix: str) -> str:
    """Generate a prefixed unique ID.
    
    Examples:
        generate_id("camp")  → "camp_a1b2c3d4e5f6"
        generate_id("seg")   → "seg_f6e5d4c3b2a1"
        generate_id("tmpl")  → "tmpl_1a2b3c4d5e6f"
    
    Prefix helps identify entity type in logs and debugging.
    UUID portion is 12 hex chars (48 bits of entropy, sufficient for this scale).
    """
    short_uuid = uuid.uuid4().hex[:12]
    return f"{prefix}_{short_uuid}"
```

Use these prefixes consistently:

| Entity | Prefix | Example |
|--------|--------|---------|
| Campaign | `camp` | `camp_a1b2c3d4e5f6` |
| Segment | `seg` | `seg_f6e5d4c3b2a1` |
| Template | `tmpl` | `tmpl_1a2b3c4d5e6f` |
| Message | `msg` | `msg_abcdef123456` |
| API Key | `mk_live` / `mk_test` | `mk_live_a1b2c3d4` |
| Webhook | `whk` | `whk_123456abcdef` |
| Invoice | `inv` | `inv_202602abc123` |
| Notification | `notif` | `notif_abcdef1234` |
