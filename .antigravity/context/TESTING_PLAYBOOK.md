# Testing Playbook

**Project:** Salon WhatsApp Marketing Campaign Platform
**Version:** 1.0 | February 2026
**Audience:** Claude + Antigravity

---

## 1. Testing Philosophy

- **Every line of code Claude generates must have a corresponding test.** This is non-negotiable.
- **Tests are documentation.** A developer should understand what a function does by reading its tests.
- **Test behavior, not implementation.** Test what the code does, not how it does it internally.
- **Fast tests run first.** Unit tests in <1 second each. Integration tests can take longer.
- **No flaky tests.** If a test is intermittent, fix it or delete it. Never skip it.

---

## 2. Backend Unit Tests (pytest + moto)

### 2.1 Project Setup

```
backend/
  tests/
    conftest.py              # Shared fixtures (DynamoDB table, SQS queue, etc.)
    unit/
      test_campaign_service.py
      test_campaign_repository.py
      test_segment_service.py
      test_whatsapp_client.py
      test_models.py
    integration/
      test_campaign_api.py
      test_webhook_handler.py
```

### 2.2 conftest.py — Shared Fixtures

```python
"""Shared test fixtures for all backend tests.

Uses moto to mock AWS services. No real AWS calls in unit tests.
"""

import os
from datetime import datetime, timezone

import boto3
import pytest
from moto import mock_aws

# Set environment variables BEFORE any imports that read them
os.environ["ENVIRONMENT"] = "test"
os.environ["DYNAMODB_TABLE_NAME"] = "salon-marketing-test"
os.environ["SQS_CAMPAIGN_QUEUE_URL"] = "https://sqs.us-east-1.amazonaws.com/123/test-queue"
os.environ["AWS_DEFAULT_REGION"] = "us-east-1"
os.environ["AWS_ACCESS_KEY_ID"] = "testing"
os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"


@pytest.fixture
def aws_credentials():
    """Mock AWS credentials for moto."""
    os.environ["AWS_ACCESS_KEY_ID"] = "testing"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
    os.environ["AWS_SECURITY_TOKEN"] = "testing"
    os.environ["AWS_SESSION_TOKEN"] = "testing"
    os.environ["AWS_DEFAULT_REGION"] = "us-east-1"


@pytest.fixture
def dynamodb_table(aws_credentials):
    """Create a mocked DynamoDB table matching production schema."""
    with mock_aws():
        dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        table = dynamodb.create_table(
            TableName="salon-marketing-test",
            KeySchema=[
                {"AttributeName": "PK", "KeyType": "HASH"},
                {"AttributeName": "SK", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "PK", "AttributeType": "S"},
                {"AttributeName": "SK", "AttributeType": "S"},
                {"AttributeName": "GSI1PK", "AttributeType": "S"},
                {"AttributeName": "GSI1SK", "AttributeType": "S"},
            ],
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "GSI1",
                    "KeySchema": [
                        {"AttributeName": "GSI1PK", "KeyType": "HASH"},
                        {"AttributeName": "GSI1SK", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                },
            ],
            BillingMode="PAY_PER_REQUEST",
        )
        table.meta.client.get_waiter("table_exists").wait(TableName="salon-marketing-test")
        yield table


@pytest.fixture
def sqs_queue(aws_credentials):
    """Create a mocked SQS FIFO queue."""
    with mock_aws():
        sqs = boto3.resource("sqs", region_name="us-east-1")
        queue = sqs.create_queue(
            QueueName="test-campaign-queue.fifo",
            Attributes={
                "FifoQueue": "true",
                "ContentBasedDeduplication": "true",
            },
        )
        yield queue


# ─── Domain fixtures ─────────────────────────────────────────

@pytest.fixture
def sample_tenant_id() -> str:
    return "tenant_abc123def456"


@pytest.fixture
def sample_user_id() -> str:
    return "user_xyz789"


@pytest.fixture
def sample_campaign_data() -> dict:
    """Valid campaign creation data."""
    return {
        "name": "Diwali Special Offer",
        "description": "20% off all services during Diwali week",
        "type": "festival",
        "template_id": "tmpl_abc123",
        "segment_id": "seg_def456",
        "personalization_mapping": {
            "1": "customer_name",
            "2": "offer_code",
        },
    }


@pytest.fixture
def sample_campaign(sample_tenant_id):
    """A fully formed Campaign object for testing."""
    from src.models.campaign import Campaign, CampaignStatus

    return Campaign(
        campaign_id="camp_test123456",
        tenant_id=sample_tenant_id,
        name="Test Campaign",
        description="A test campaign",
        type="offer",
        status=CampaignStatus.DRAFT,
        template_id="tmpl_abc123",
        segment_id="seg_def456",
        personalization_mapping={},
        created_by="user_xyz789",
        created_at=datetime(2026, 2, 1, tzinfo=timezone.utc),
        updated_at=datetime(2026, 2, 1, tzinfo=timezone.utc),
        version=1,
    )
```

### 2.3 Service Layer Tests

```python
"""Unit tests for CampaignService.

Tests business logic in isolation using mocked repositories.
Each test follows Arrange-Act-Assert pattern.
"""

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

from src.models.campaign import Campaign, CampaignStatus, CreateCampaignRequest
from src.models.template import Template, TemplateStatus
from src.models.segment import Segment
from src.services.campaign_service import CampaignService
from src.utils.errors import InvalidStateError, NotFoundError, ValidationError


@pytest.fixture
def mock_repos():
    """Create mock repositories for CampaignService."""
    return {
        "campaign_repo": MagicMock(),
        "template_repo": MagicMock(),
        "segment_repo": MagicMock(),
        "eventbridge_client": MagicMock(),
    }


@pytest.fixture
def campaign_service(mock_repos):
    """CampaignService with mocked dependencies."""
    return CampaignService(
        campaign_repo=mock_repos["campaign_repo"],
        template_repo=mock_repos["template_repo"],
        segment_repo=mock_repos["segment_repo"],
        eventbridge_client=mock_repos["eventbridge_client"],
    )


class TestCreateCampaign:
    """Tests for CampaignService.create_campaign()."""

    def test_creates_campaign_in_draft_status(
        self, campaign_service, mock_repos, sample_tenant_id, sample_campaign_data
    ):
        """Campaign should be created in DRAFT status with generated ID."""
        # Arrange
        mock_repos["template_repo"].get.return_value = Template(
            template_id="tmpl_abc123",
            tenant_id=sample_tenant_id,
            status=TemplateStatus.APPROVED,
            name="test_template",
            language="en",
            category="MARKETING",
        )
        mock_repos["segment_repo"].get.return_value = Segment(
            segment_id="seg_def456",
            tenant_id=sample_tenant_id,
            name="Test Segment",
        )
        request = CreateCampaignRequest(**sample_campaign_data)

        # Act
        result = campaign_service.create_campaign(
            tenant_id=sample_tenant_id,
            request=request,
            user_id="user_xyz789",
        )

        # Assert
        assert result.status == CampaignStatus.DRAFT
        assert result.name == "Diwali Special Offer"
        assert result.tenant_id == sample_tenant_id
        assert result.campaign_id.startswith("camp_")
        mock_repos["campaign_repo"].put.assert_called_once()

    def test_fails_if_template_not_found(
        self, campaign_service, mock_repos, sample_tenant_id, sample_campaign_data
    ):
        """Should raise NotFoundError when template doesn't exist."""
        # Arrange
        mock_repos["template_repo"].get.return_value = None
        request = CreateCampaignRequest(**sample_campaign_data)

        # Act & Assert
        with pytest.raises(NotFoundError, match="Template tmpl_abc123 not found"):
            campaign_service.create_campaign(
                tenant_id=sample_tenant_id,
                request=request,
                user_id="user_xyz789",
            )

    def test_fails_if_template_not_approved(
        self, campaign_service, mock_repos, sample_tenant_id, sample_campaign_data
    ):
        """Should raise ValidationError when template is pending/rejected."""
        # Arrange
        mock_repos["template_repo"].get.return_value = Template(
            template_id="tmpl_abc123",
            tenant_id=sample_tenant_id,
            status=TemplateStatus.PENDING_APPROVAL,
            name="test_template",
            language="en",
            category="MARKETING",
        )
        request = CreateCampaignRequest(**sample_campaign_data)

        # Act & Assert
        with pytest.raises(ValidationError, match="not approved"):
            campaign_service.create_campaign(
                tenant_id=sample_tenant_id,
                request=request,
                user_id="user_xyz789",
            )

    def test_fails_if_segment_not_found(
        self, campaign_service, mock_repos, sample_tenant_id, sample_campaign_data
    ):
        """Should raise NotFoundError when segment doesn't exist."""
        # Arrange
        mock_repos["template_repo"].get.return_value = Template(
            template_id="tmpl_abc123",
            tenant_id=sample_tenant_id,
            status=TemplateStatus.APPROVED,
            name="test_template",
            language="en",
            category="MARKETING",
        )
        mock_repos["segment_repo"].get.return_value = None
        request = CreateCampaignRequest(**sample_campaign_data)

        # Act & Assert
        with pytest.raises(NotFoundError, match="Segment seg_def456 not found"):
            campaign_service.create_campaign(
                tenant_id=sample_tenant_id,
                request=request,
                user_id="user_xyz789",
            )


class TestScheduleCampaign:
    """Tests for CampaignService.schedule_campaign()."""

    def test_schedules_draft_campaign(
        self, campaign_service, mock_repos, sample_tenant_id, sample_campaign
    ):
        """Draft campaign should transition to SCHEDULED."""
        # Arrange
        mock_repos["campaign_repo"].get.return_value = sample_campaign
        mock_repos["template_repo"].get.return_value = Template(
            template_id="tmpl_abc123",
            tenant_id=sample_tenant_id,
            status=TemplateStatus.APPROVED,
            name="test_template",
            language="en",
            category="MARKETING",
        )
        future_time = "2026-12-31T10:00:00+00:00"

        # Act
        result = campaign_service.schedule_campaign(
            tenant_id=sample_tenant_id,
            campaign_id="camp_test123456",
            scheduled_at=future_time,
            user_id="user_xyz789",
        )

        # Assert
        assert result.status == CampaignStatus.SCHEDULED
        mock_repos["campaign_repo"].update_status.assert_called_once()
        mock_repos["eventbridge_client"].create_campaign_schedule.assert_called_once()

    def test_cannot_schedule_completed_campaign(
        self, campaign_service, mock_repos, sample_tenant_id, sample_campaign
    ):
        """Should raise InvalidStateError for non-DRAFT campaigns."""
        # Arrange
        sample_campaign.status = CampaignStatus.COMPLETED
        mock_repos["campaign_repo"].get.return_value = sample_campaign

        # Act & Assert
        with pytest.raises(InvalidStateError, match="Cannot schedule"):
            campaign_service.schedule_campaign(
                tenant_id=sample_tenant_id,
                campaign_id="camp_test123456",
                scheduled_at="2026-12-31T10:00:00+00:00",
                user_id="user_xyz789",
            )

    def test_cannot_schedule_in_the_past(
        self, campaign_service, mock_repos, sample_tenant_id, sample_campaign
    ):
        """Should reject schedule times in the past."""
        # Arrange
        mock_repos["campaign_repo"].get.return_value = sample_campaign
        mock_repos["template_repo"].get.return_value = Template(
            template_id="tmpl_abc123",
            tenant_id=sample_tenant_id,
            status=TemplateStatus.APPROVED,
            name="test_template",
            language="en",
            category="MARKETING",
        )
        past_time = "2020-01-01T10:00:00+00:00"

        # Act & Assert
        with pytest.raises(ValidationError, match="future"):
            campaign_service.schedule_campaign(
                tenant_id=sample_tenant_id,
                campaign_id="camp_test123456",
                scheduled_at=past_time,
                user_id="user_xyz789",
            )
```

### 2.4 Repository Layer Tests

```python
"""Unit tests for CampaignRepository.

Uses moto to mock DynamoDB. Tests actual DynamoDB operations
against a mock table with the same schema as production.
"""

from datetime import datetime, timezone

import pytest
from moto import mock_aws

from src.models.campaign import Campaign, CampaignStatus
from src.repositories.campaign_repository import CampaignRepository
from src.utils.errors import ConflictError


@pytest.fixture
def campaign_repo(dynamodb_table):
    """CampaignRepository with mocked DynamoDB table."""
    return CampaignRepository(table=dynamodb_table)


class TestCampaignRepositoryPut:

    def test_inserts_new_campaign(self, campaign_repo, sample_campaign):
        """Should successfully insert a new campaign."""
        campaign_repo.put(sample_campaign)

        result = campaign_repo.get(
            sample_campaign.tenant_id,
            sample_campaign.campaign_id,
        )
        assert result is not None
        assert result.campaign_id == sample_campaign.campaign_id
        assert result.name == sample_campaign.name
        assert result.status == CampaignStatus.DRAFT

    def test_prevents_duplicate_campaign_id(self, campaign_repo, sample_campaign):
        """Should fail with ConditionalCheckFailed on duplicate ID."""
        campaign_repo.put(sample_campaign)

        with pytest.raises(Exception):  # DynamoDB ConditionalCheckFailed
            campaign_repo.put(sample_campaign)


class TestCampaignRepositoryGet:

    def test_returns_none_for_nonexistent(self, campaign_repo, sample_tenant_id):
        """Should return None when campaign doesn't exist."""
        result = campaign_repo.get(sample_tenant_id, "camp_nonexistent")
        assert result is None

    def test_returns_correct_campaign(self, campaign_repo, sample_campaign):
        """Should return the exact campaign that was stored."""
        campaign_repo.put(sample_campaign)
        result = campaign_repo.get(
            sample_campaign.tenant_id,
            sample_campaign.campaign_id,
        )
        assert result.name == "Test Campaign"
        assert result.type == "offer"

    def test_tenant_isolation(self, campaign_repo, sample_campaign):
        """Campaign from tenant A should not be visible to tenant B."""
        campaign_repo.put(sample_campaign)

        result = campaign_repo.get("tenant_other", sample_campaign.campaign_id)
        assert result is None


class TestCampaignRepositoryUpdateStatus:

    def test_updates_with_correct_version(self, campaign_repo, sample_campaign):
        """Should update when version matches."""
        campaign_repo.put(sample_campaign)

        sample_campaign.status = CampaignStatus.SCHEDULED
        sample_campaign.version = 2
        sample_campaign.updated_at = datetime.now(timezone.utc)

        campaign_repo.update_status(
            sample_campaign,
            expected_status=CampaignStatus.DRAFT,
            expected_version=1,
        )

        result = campaign_repo.get(
            sample_campaign.tenant_id,
            sample_campaign.campaign_id,
        )
        assert result.status == CampaignStatus.SCHEDULED
        assert result.version == 2

    def test_fails_with_wrong_version(self, campaign_repo, sample_campaign):
        """Should raise ConflictError on version mismatch (optimistic lock)."""
        campaign_repo.put(sample_campaign)

        sample_campaign.status = CampaignStatus.SCHEDULED
        sample_campaign.version = 2

        with pytest.raises(ConflictError):
            campaign_repo.update_status(
                sample_campaign,
                expected_status=CampaignStatus.DRAFT,
                expected_version=99,  # Wrong version
            )


class TestCampaignRepositoryList:

    def test_lists_campaigns_for_tenant(self, campaign_repo, sample_tenant_id):
        """Should return campaigns for the specified tenant only."""
        for i in range(3):
            campaign = Campaign(
                campaign_id=f"camp_{i:012d}",
                tenant_id=sample_tenant_id,
                name=f"Campaign {i}",
                description="",
                type="offer",
                status=CampaignStatus.DRAFT,
                template_id="tmpl_abc",
                segment_id="seg_abc",
                personalization_mapping={},
                created_by="user_test",
                created_at=datetime(2026, 2, i + 1, tzinfo=timezone.utc),
                updated_at=datetime(2026, 2, i + 1, tzinfo=timezone.utc),
                version=1,
            )
            campaign_repo.put(campaign)

        campaigns, cursor = campaign_repo.list_by_tenant(sample_tenant_id, limit=10)
        assert len(campaigns) == 3
        assert cursor is None  # No more pages

    def test_pagination_works(self, campaign_repo, sample_tenant_id):
        """Should paginate correctly with cursor."""
        for i in range(5):
            campaign = Campaign(
                campaign_id=f"camp_{i:012d}",
                tenant_id=sample_tenant_id,
                name=f"Campaign {i}",
                description="",
                type="offer",
                status=CampaignStatus.DRAFT,
                template_id="tmpl_abc",
                segment_id="seg_abc",
                personalization_mapping={},
                created_by="user_test",
                created_at=datetime(2026, 2, i + 1, tzinfo=timezone.utc),
                updated_at=datetime(2026, 2, i + 1, tzinfo=timezone.utc),
                version=1,
            )
            campaign_repo.put(campaign)

        # First page
        page1, cursor1 = campaign_repo.list_by_tenant(sample_tenant_id, limit=2)
        assert len(page1) == 2
        assert cursor1 is not None

        # Second page
        page2, cursor2 = campaign_repo.list_by_tenant(
            sample_tenant_id, limit=2, cursor=cursor1
        )
        assert len(page2) == 2
        assert cursor2 is not None

        # Third page
        page3, cursor3 = campaign_repo.list_by_tenant(
            sample_tenant_id, limit=2, cursor=cursor2
        )
        assert len(page3) == 1
        assert cursor3 is None  # No more pages
```

### 2.5 Model Validation Tests

```python
"""Unit tests for Pydantic models.

Tests input validation, serialization, and edge cases.
"""

import pytest
from pydantic import ValidationError

from src.models.campaign import CreateCampaignRequest


class TestCreateCampaignRequest:

    def test_valid_request(self, sample_campaign_data):
        request = CreateCampaignRequest(**sample_campaign_data)
        assert request.name == "Diwali Special Offer"
        assert request.type == "festival"

    def test_rejects_empty_name(self, sample_campaign_data):
        sample_campaign_data["name"] = ""
        with pytest.raises(ValidationError):
            CreateCampaignRequest(**sample_campaign_data)

    def test_rejects_blank_name(self, sample_campaign_data):
        sample_campaign_data["name"] = "   "
        with pytest.raises(ValidationError):
            CreateCampaignRequest(**sample_campaign_data)

    def test_rejects_name_too_long(self, sample_campaign_data):
        sample_campaign_data["name"] = "x" * 201
        with pytest.raises(ValidationError):
            CreateCampaignRequest(**sample_campaign_data)

    def test_rejects_invalid_type(self, sample_campaign_data):
        sample_campaign_data["type"] = "invalid_type"
        with pytest.raises(ValidationError):
            CreateCampaignRequest(**sample_campaign_data)

    @pytest.mark.parametrize("valid_type", [
        "birthday", "anniversary", "festival", "offer",
        "new_service", "reminder", "reengagement", "custom",
    ])
    def test_accepts_all_valid_types(self, sample_campaign_data, valid_type):
        sample_campaign_data["type"] = valid_type
        request = CreateCampaignRequest(**sample_campaign_data)
        assert request.type == valid_type

    def test_strips_name_whitespace(self, sample_campaign_data):
        sample_campaign_data["name"] = "  Diwali Offer  "
        request = CreateCampaignRequest(**sample_campaign_data)
        assert request.name == "Diwali Offer"
```

---

## 3. Frontend Tests (Vitest + React Testing Library)

### 3.1 Component Test Pattern

```typescript
// campaign-card.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CampaignCard } from './campaign-card';

const mockCampaign = {
  campaignId: 'camp_test123',
  name: 'Diwali Special Offer',
  status: 'draft' as const,
  type: 'festival' as const,
  createdAt: '2026-02-01T00:00:00Z',
  recipientCount: 1200,
};

describe('CampaignCard', () => {
  it('renders campaign name and status', () => {
    render(<CampaignCard campaign={mockCampaign} />);

    expect(screen.getByText('Diwali Special Offer')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('shows recipient count', () => {
    render(<CampaignCard campaign={mockCampaign} />);

    expect(screen.getByText('1,200 recipients')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<CampaignCard campaign={mockCampaign} onClick={onClick} />);

    await user.click(screen.getByRole('article'));
    expect(onClick).toHaveBeenCalledWith('camp_test123');
  });

  it('applies correct status badge color', () => {
    render(<CampaignCard campaign={{ ...mockCampaign, status: 'completed' }} />);

    const badge = screen.getByText('Completed');
    expect(badge).toHaveClass('bg-green-50', 'text-green-700');
  });

  it('is keyboard accessible', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<CampaignCard campaign={mockCampaign} onClick={onClick} />);

    await user.tab();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalled();
  });
});
```

### 3.2 Hook Test Pattern

```typescript
// use-campaigns.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { useCampaigns } from './use-campaigns';
import * as campaignApi from '@/services/campaign-api';

vi.mock('@/services/campaign-api');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useCampaigns', () => {
  it('returns campaigns on success', async () => {
    vi.mocked(campaignApi.fetchCampaigns).mockResolvedValue({
      data: [{ campaignId: 'camp_1', name: 'Test', status: 'draft' }],
      pagination: { cursor: null, has_more: false, limit: 25 },
    });

    const { result } = renderHook(() => useCampaigns(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].name).toBe('Test');
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(campaignApi.fetchCampaigns).mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(() => useCampaigns(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Network error');
  });
});
```

---

## 4. E2E Tests (Playwright)

### 4.1 Campaign Creation E2E

```typescript
// e2e/campaign-creation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Campaign Creation Wizard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@testsalon.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('creates a campaign through the full wizard', async ({ page }) => {
    // Navigate to campaign creation
    await page.click('[data-testid="nav-campaigns"]');
    await page.click('[data-testid="create-campaign-button"]');
    await page.waitForURL('/campaigns/new');

    // Step 1: Basics
    await page.fill('[data-testid="campaign-name"]', 'E2E Test Campaign');
    await page.selectOption('[data-testid="campaign-type"]', 'offer');
    await page.click('[data-testid="next-step"]');

    // Step 2: Audience
    await page.click('[data-testid="segment-select"]');
    await page.click('[data-testid="segment-option-all-customers"]');
    await expect(page.locator('[data-testid="audience-count"]')).toContainText(/\d+ customers/);
    await page.click('[data-testid="next-step"]');

    // Step 3: Content
    await page.click('[data-testid="template-select"]');
    await page.click('[data-testid="template-option-0"]');
    await expect(page.locator('[data-testid="whatsapp-preview"]')).toBeVisible();
    await page.click('[data-testid="next-step"]');

    // Step 4: Schedule
    await page.click('[data-testid="schedule-now"]');
    await page.click('[data-testid="next-step"]');

    // Step 5: Review & Confirm
    await expect(page.locator('[data-testid="review-name"]')).toContainText('E2E Test Campaign');
    await page.click('[data-testid="confirm-schedule"]');

    // Verify success
    await expect(page.locator('[data-testid="success-toast"]')).toContainText('Campaign scheduled');
    await page.waitForURL(/\/campaigns\/camp_/);
  });

  test('preserves data when navigating back in wizard', async ({ page }) => {
    await page.goto('/campaigns/new');

    // Fill step 1
    await page.fill('[data-testid="campaign-name"]', 'Back Navigation Test');
    await page.click('[data-testid="next-step"]');

    // Go back
    await page.click('[data-testid="prev-step"]');

    // Verify data is preserved
    await expect(page.locator('[data-testid="campaign-name"]')).toHaveValue('Back Navigation Test');
  });

  test('shows validation errors for empty required fields', async ({ page }) => {
    await page.goto('/campaigns/new');

    // Try to proceed without filling required fields
    await page.click('[data-testid="next-step"]');

    // Verify error messages
    await expect(page.locator('[data-testid="name-error"]')).toContainText('required');
  });
});
```

### 4.2 Data Attributes Convention

Always use `data-testid` attributes for E2E selectors. Never select by CSS class or DOM structure.

```tsx
// ✅ CORRECT — stable test selectors
<input data-testid="campaign-name" />
<button data-testid="create-campaign-button">Create</button>
<div data-testid="audience-count">{count} customers</div>

// ❌ WRONG — brittle selectors
page.click('.btn-primary');              // CSS class changes break tests
page.click('div > button:first-child');  // DOM structure changes break tests
```

---

## 5. Test Configuration

### 5.1 pytest.ini

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = 
    -v
    --tb=short
    --strict-markers
    --cov=src
    --cov-report=term-missing
    --cov-report=html:coverage_html
    --cov-fail-under=80
markers =
    unit: Unit tests (run with moto mocks)
    integration: Integration tests (require LocalStack)
    slow: Tests that take >5 seconds
```

### 5.2 Coverage Thresholds

| Layer | Minimum | Enforced In CI |
|-------|---------|---------------|
| `src/models/` | 95% | ✅ Fail |
| `src/repositories/` | 85% | ✅ Fail |
| `src/services/` | 80% | ✅ Fail |
| `src/handlers/` | 75% | ⚠️ Warn |
| `src/integrations/` | 70% | ⚠️ Warn |
| Overall backend | 80% | ✅ Fail |
| Frontend components | 80% | ✅ Fail |
| Frontend hooks | 85% | ✅ Fail |

---

## 6. What to Test — Checklist

For every feature Claude generates, verify tests cover:

- [ ] **Happy path** — normal successful flow
- [ ] **Input validation** — invalid/missing/boundary inputs
- [ ] **Not found** — resource doesn't exist
- [ ] **State violations** — wrong lifecycle state
- [ ] **Tenant isolation** — tenant A can't see tenant B's data
- [ ] **Concurrent modification** — optimistic lock conflicts
- [ ] **External service failure** — WhatsApp API down, Loyalty API down
- [ ] **Rate limiting** — behavior when limit is hit
- [ ] **Plan limits** — behavior when tenant exceeds plan
- [ ] **Pagination** — first page, middle page, last page, empty results
- [ ] **Edge cases** — empty strings, very long strings, special characters, zero values
