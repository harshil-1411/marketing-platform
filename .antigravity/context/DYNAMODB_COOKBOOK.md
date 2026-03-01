# DynamoDB Cookbook

**Project:** Salon WhatsApp Marketing Campaign Platform
**Version:** 1.0 | February 2026
**Audience:** Claude + Antigravity

---

## 1. Golden Rules

1. **Never use Scan.** If you need Scan, the access pattern is missing from the design. Add a GSI.
2. **Always scope by tenant.** Every PK starts with `TENANT#<tenant_id>`. No exceptions.
3. **Use conditional writes** for all creates (prevent duplicates) and updates (optimistic locking).
4. **Use Query, not GetItem, for lists.** GetItem is for single-item lookups only.
5. **Batch reads/writes in groups of 25** (DynamoDB limit). Use `BatchWriteItem` for bulk operations.
6. **Always use `ProjectionExpression`** when you don't need all attributes (saves RCUs).
7. **Set TTL on ephemeral data** (messages: 90 days, analytics detail: 90 days, cooldown records: 48 hours).
8. **Use atomic counters (`ADD`)** for concurrent-safe increments (message counts, usage meters).

---

## 2. Table Schema

```
Table: salon-marketing-{env}
  PK:     String (Partition Key)
  SK:     String (Sort Key)
  GSI1PK: String
  GSI1SK: String
  GSI2PK: String
  GSI2SK: String
  GSI3PK: String
  GSI3SK: String
  ttl:    Number (epoch seconds, optional)
```

---

## 3. Access Patterns by Entity

### 3.1 Campaign

| Access Pattern | Operation | Key Condition |
|---------------|-----------|---------------|
| Get campaign by ID | GetItem | `PK=TENANT#<tid>`, `SK=CAMPAIGN#<cid>` |
| List campaigns by tenant | Query GSI1 | `GSI1PK=TENANT#<tid>#CAMPAIGN` |
| Filter by status | Query GSI1 | + `GSI1SK begins_with <status>` |
| Get scheduled campaigns for a date | Query | `PK=SCHEDULE#<date>`, `SK begins_with <time>` |
| Update campaign status | UpdateItem | Conditional on status + version |
| Increment message counter | UpdateItem ADD | Atomic counter on `messages_sent` |

```python
# Get campaign by ID
response = table.get_item(
    Key={"PK": f"TENANT#{tenant_id}", "SK": f"CAMPAIGN#{campaign_id}"},
    ConsistentRead=True,
)

# List campaigns by tenant (newest first, all statuses)
response = table.query(
    IndexName="GSI1",
    KeyConditionExpression=Key("GSI1PK").eq(f"TENANT#{tenant_id}#CAMPAIGN"),
    ScanIndexForward=False,
    Limit=25,
)

# List only draft campaigns
response = table.query(
    IndexName="GSI1",
    KeyConditionExpression=(
        Key("GSI1PK").eq(f"TENANT#{tenant_id}#CAMPAIGN")
        & Key("GSI1SK").begins_with("draft#")
    ),
    ScanIndexForward=False,
)

# Get campaigns scheduled for today
response = table.query(
    KeyConditionExpression=Key("PK").eq(f"SCHEDULE#2026-02-27"),
    ScanIndexForward=True,
)

# Atomic increment message counter
table.update_item(
    Key={"PK": f"TENANT#{tenant_id}", "SK": f"CAMPAIGN#{campaign_id}"},
    UpdateExpression="ADD messages_sent :inc",
    ExpressionAttributeValues={":inc": 1},
)
```

### 3.2 Template

| Access Pattern | Operation | Key Condition |
|---------------|-----------|---------------|
| Get template by ID | GetItem | `PK=TENANT#<tid>`, `SK=TEMPLATE#<tmid>` |
| List templates by tenant | Query GSI1 | `GSI1PK=TENANT#<tid>#TEMPLATE` |
| Filter by approval status | Query GSI1 | + `GSI1SK begins_with <status>` |

```python
# Get template
response = table.get_item(
    Key={"PK": f"TENANT#{tenant_id}", "SK": f"TEMPLATE#{template_id}"},
)

# List approved templates only
response = table.query(
    IndexName="GSI1",
    KeyConditionExpression=(
        Key("GSI1PK").eq(f"TENANT#{tenant_id}#TEMPLATE")
        & Key("GSI1SK").begins_with("approved#")
    ),
)
```

### 3.3 Segment

| Access Pattern | Operation | Key Condition |
|---------------|-----------|---------------|
| Get segment by ID | GetItem | `PK=TENANT#<tid>`, `SK=SEGMENT#<sid>` |
| List segments by tenant | Query GSI1 | `GSI1PK=TENANT#<tid>#SEGMENT` |
| List customers in static segment | Query | `PK=SEGMENT#<sid>`, `SK begins_with CUSTOMER#` |

```python
# Get customers in a static segment
response = table.query(
    KeyConditionExpression=(
        Key("PK").eq(f"SEGMENT#{segment_id}")
        & Key("SK").begins_with("CUSTOMER#")
    ),
)
phones = [item["phone"] for item in response["Items"]]
```

### 3.4 Customer

| Access Pattern | Operation | Key Condition |
|---------------|-----------|---------------|
| Get customer by phone | GetItem | `PK=TENANT#<tid>`, `SK=CUSTOMER#<phone>` |
| List customers by tenant | Query GSI1 | `GSI1PK=TENANT#<tid>#CUSTOMER` |
| Check opt-out status | GetItem | `PK=TENANT#<tid>`, `SK=OPTOUT#<phone>` |
| Get customer campaigns | Query GSI3 | `GSI3PK=CUSTOMER#<phone>`, SK filter |

```python
# Check if customer opted out
response = table.get_item(
    Key={"PK": f"TENANT#{tenant_id}", "SK": f"OPTOUT#{phone}"},
    ProjectionExpression="PK",  # Only need existence check
)
is_opted_out = "Item" in response

# Record opt-out with TTL (never auto-deletes, but pattern shown for reference)
table.put_item(Item={
    "PK": f"TENANT#{tenant_id}",
    "SK": f"OPTOUT#{phone}",
    "phone": phone,
    "opted_out_at": datetime.now(timezone.utc).isoformat(),
    "method": "stop_keyword",
    "entity_type": "OptOut",
})
```

### 3.5 Messages (Campaign Delivery)

| Access Pattern | Operation | Key Condition |
|---------------|-----------|---------------|
| Get message status | GetItem | `PK=CAMPAIGN#<cid>`, `SK=MSG#<phone>` |
| List messages for campaign | Query | `PK=CAMPAIGN#<cid>`, `SK begins_with MSG#` |
| Update delivery status | UpdateItem | On webhook callback |

```python
# Record message send
table.put_item(Item={
    "PK": f"CAMPAIGN#{campaign_id}",
    "SK": f"MSG#{phone}",
    "GSI1PK": f"TENANT#{tenant_id}#MSG",
    "GSI1SK": f"queued#{datetime.now(timezone.utc).isoformat()}",
    "campaign_id": campaign_id,
    "tenant_id": tenant_id,
    "phone": phone,
    "whatsapp_message_id": wa_message_id,
    "status": "queued",
    "sent_at": datetime.now(timezone.utc).isoformat(),
    "entity_type": "Message",
    "ttl": int((datetime.now(timezone.utc) + timedelta(days=90)).timestamp()),
})

# Update message status from webhook
table.update_item(
    Key={"PK": f"CAMPAIGN#{campaign_id}", "SK": f"MSG#{phone}"},
    UpdateExpression="SET #status = :status, #status_at = :now, GSI1SK = :new_gsi1sk",
    ExpressionAttributeNames={
        "#status": "status",
        "#status_at": f"{new_status}_at",
    },
    ExpressionAttributeValues={
        ":status": new_status,  # "delivered", "read", "failed"
        ":now": datetime.now(timezone.utc).isoformat(),
        ":new_gsi1sk": f"{new_status}#{datetime.now(timezone.utc).isoformat()}",
    },
)
```

### 3.6 Cooldown Record

```python
# Check if customer received a marketing message in the last 24 hours
response = table.get_item(
    Key={
        "PK": f"TENANT#{tenant_id}",
        "SK": f"COOLDOWN#{phone}",
    },
    ProjectionExpression="PK",
)
is_in_cooldown = "Item" in response

# Set cooldown (auto-expires via TTL)
cooldown_hours = tenant_settings.get("message_cooldown_hours", 24)
table.put_item(Item={
    "PK": f"TENANT#{tenant_id}",
    "SK": f"COOLDOWN#{phone}",
    "campaign_id": campaign_id,
    "created_at": datetime.now(timezone.utc).isoformat(),
    "entity_type": "Cooldown",
    "ttl": int((datetime.now(timezone.utc) + timedelta(hours=cooldown_hours)).timestamp()),
})
```

### 3.7 Usage Records

```python
# Increment monthly usage counter (atomic)
period = datetime.now(timezone.utc).strftime("%Y-%m")  # "2026-02"
table.update_item(
    Key={
        "PK": f"TENANT#{tenant_id}",
        "SK": f"USAGE#{period}",
    },
    UpdateExpression=(
        "ADD messages_sent_marketing :inc "
        "SET entity_type = :et, tenant_id = :tid, period = :period"
    ),
    ExpressionAttributeValues={
        ":inc": 1,
        ":et": "UsageRecord",
        ":tid": tenant_id,
        ":period": period,
    },
)

# Check if tenant exceeded plan limit
response = table.get_item(
    Key={"PK": f"TENANT#{tenant_id}", "SK": f"USAGE#{period}"},
    ProjectionExpression="messages_sent_marketing",
)
current_usage = response.get("Item", {}).get("messages_sent_marketing", 0)
if current_usage >= plan_limit:
    raise PlanLimitError(f"Monthly message limit ({plan_limit}) reached")
```

---

## 4. Common Patterns

### 4.1 Conditional Creates (Prevent Duplicates)

```python
# Always use ConditionExpression on put_item for new entities
table.put_item(
    Item=item,
    ConditionExpression=Attr("PK").not_exists(),
)
```

### 4.2 Optimistic Locking

```python
# Update with version check
table.update_item(
    Key={"PK": pk, "SK": sk},
    UpdateExpression="SET #field = :val, #version = :new_ver",
    ConditionExpression="#version = :expected_ver",
    ExpressionAttributeNames={"#field": "status", "#version": "version"},
    ExpressionAttributeValues={
        ":val": new_value,
        ":new_ver": current_version + 1,
        ":expected_ver": current_version,
    },
)
```

### 4.3 Batch Write (Segment Customers)

```python
# Write customers to a static segment in batches of 25
with table.batch_writer() as batch:
    for phone in customer_phones:
        batch.put_item(Item={
            "PK": f"SEGMENT#{segment_id}",
            "SK": f"CUSTOMER#{phone}",
            "phone": phone,
            "added_at": datetime.now(timezone.utc).isoformat(),
        })
# batch_writer handles 25-item chunking automatically
```

### 4.4 Paginated Query Helper

```python
def query_all_pages(table, **query_params) -> list[dict]:
    """Query all pages of a DynamoDB query. Use sparingly (prefer cursor pagination)."""
    items = []
    while True:
        response = table.query(**query_params)
        items.extend(response.get("Items", []))
        last_key = response.get("LastEvaluatedKey")
        if not last_key:
            break
        query_params["ExclusiveStartKey"] = last_key
    return items
```

### 4.5 Transaction Write (Multi-Entity Atomic)

```python
# Atomically create campaign AND schedule entry
client = boto3.client("dynamodb")
client.transact_write_items(
    TransactItems=[
        {
            "Put": {
                "TableName": TABLE_NAME,
                "Item": campaign_item,  # Must be raw DynamoDB format
                "ConditionExpression": "attribute_not_exists(PK)",
            },
        },
        {
            "Put": {
                "TableName": TABLE_NAME,
                "Item": schedule_item,
            },
        },
    ]
)
```

---

## 5. Anti-Patterns (Never Do This)

```python
# ❌ NEVER — Scan the entire table
response = table.scan()

# ❌ NEVER — Filter without KeyCondition (scans then filters = expensive)
response = table.scan(
    FilterExpression=Attr("tenant_id").eq(tenant_id),
)

# ❌ NEVER — Query without tenant scoping
response = table.query(
    KeyConditionExpression=Key("PK").eq(f"CAMPAIGN#{campaign_id}"),
)
# This is only acceptable for cross-tenant patterns like SCHEDULE# and CAMPAIGN# (message tracking)

# ❌ NEVER — Return raw DynamoDB items to callers
def get_campaign(self, tenant_id, campaign_id):
    return table.get_item(Key={...}).get("Item")  # BAD: leaks DynamoDB structure

# ❌ NEVER — Use offset-based pagination
# DynamoDB doesn't support OFFSET. Use cursor (LastEvaluatedKey).

# ❌ NEVER — Store large blobs in DynamoDB (>400KB item limit)
# Use S3 for media, store S3 URL in DynamoDB.

# ❌ NEVER — Use ConsistentRead on GSI (not supported)
response = table.query(
    IndexName="GSI1",
    ConsistentRead=True,  # This will FAIL — GSI doesn't support consistent reads
)
```

---

## 6. Phase 1 Access Patterns (Cost Optimization)

These patterns replace ElastiCache Redis in Phase 1, saving ~$48/month.

### 6.1 Rate Limiting (DynamoDB TTL Counter)

Replaces Redis sliding window counter. Handles up to ~100K messages/hour.

```
Key Pattern:
  PK: TENANT#<tenant_id>
  SK: RATELIMIT#<key>#<window_bucket>
  counter: int (atomic ADD)
  ttl: epoch seconds (auto-expires after window)
```

```python
# Check rate limit AND increment atomically
now = int(datetime.now(timezone.utc).timestamp())
window_bucket = now // 3600  # 1-hour windows
ttl_at = (window_bucket + 1) * 3600 + 60  # Expire 60s after window ends

try:
    table.update_item(
        Key={
            "PK": f"TENANT#{tenant_id}",
            "SK": f"RATELIMIT#msg_per_hour#{window_bucket}",
        },
        UpdateExpression="ADD #counter :inc SET #ttl = if_not_exists(#ttl, :ttl)",
        ConditionExpression="attribute_not_exists(#counter) OR #counter < :limit",
        ExpressionAttributeNames={"#counter": "counter", "#ttl": "ttl"},
        ExpressionAttributeValues={":inc": 1, ":limit": 1000, ":ttl": ttl_at},
    )
    allowed = True
except client.exceptions.ConditionalCheckFailedException:
    allowed = False  # Rate limit exceeded

# Check remaining capacity (read-only)
response = table.get_item(
    Key={"PK": f"TENANT#{tenant_id}", "SK": f"RATELIMIT#msg_per_hour#{window_bucket}"},
    ProjectionExpression="#counter",
    ExpressionAttributeNames={"#counter": "counter"},
)
remaining = 1000 - response.get("Item", {}).get("counter", 0)
```

**Why this works for Phase 1:**
- DynamoDB ADD is atomic — no race conditions.
- ConditionExpression prevents exceeding the limit even under concurrent writes.
- TTL auto-deletes expired window items — zero cleanup code.
- ~5ms latency per check (vs <1ms Redis) — irrelevant for campaign message sending.
- Free within DynamoDB's 25 WCU free tier.

### 6.2 Caching (DynamoDB TTL Items)

Replaces Redis cache for Loyalty data, template lookups, etc.

```
Key Pattern:
  PK: TENANT#<tenant_id>
  SK: CACHE#<cache_key>
  cached_value: string (JSON serialized)
  ttl: epoch seconds (auto-expires)
```

```python
import json

# Cache SET (write with TTL)
ttl_seconds = 3600  # 1-hour TTL
ttl_at = int(datetime.now(timezone.utc).timestamp()) + ttl_seconds
table.put_item(Item={
    "PK": f"TENANT#{tenant_id}",
    "SK": f"CACHE#loyalty_customer#{phone}",
    "cached_value": json.dumps(loyalty_data),
    "ttl": ttl_at,
    "entity_type": "Cache",
})

# Cache GET (read with expiry check)
response = table.get_item(
    Key={"PK": f"TENANT#{tenant_id}", "SK": f"CACHE#loyalty_customer#{phone}"},
)
item = response.get("Item")
if item and item.get("ttl", 0) > int(datetime.now(timezone.utc).timestamp()):
    cached = json.loads(item["cached_value"])
else:
    cached = None  # Cache miss or expired

# Cache DELETE (invalidation from webhook)
table.delete_item(
    Key={"PK": f"TENANT#{tenant_id}", "SK": f"CACHE#loyalty_customer#{phone}"},
)
```

**Why manual TTL check is needed:** DynamoDB's TTL deletion is asynchronous (can take up to 48 hours after expiry). Always check `ttl > now` in application code. The TTL attribute ensures eventual cleanup so expired items don't accumulate.
