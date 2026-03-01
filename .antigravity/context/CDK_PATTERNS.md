# AWS CDK Patterns & Infrastructure Guide

**Project:** Salon WhatsApp Marketing Campaign Platform
**Version:** 1.0 | February 2026
**Audience:** Claude + Antigravity

---

## 1. CDK Project Structure

```
infrastructure/
  app.py                        # CDK app entry point
  stacks/
    networking_stack.py          # VPC, security groups
    auth_stack.py                # Cognito user pool, groups
    data_stack.py                # DynamoDB table, GSIs
    cache_stack.py               # ElastiCache Redis
    api_stack.py                 # API Gateway, Lambda functions
    messaging_stack.py           # SQS queues, EventBridge rules
    frontend_stack.py            # S3 + CloudFront
    monitoring_stack.py          # CloudWatch dashboards, alarms, SNS
    billing_stack.py             # Payment webhook handlers
  constructs/
    lambda_function.py           # Custom L3 construct for Lambda
    api_endpoint.py              # Custom L3 construct for API route
    monitored_queue.py           # SQS + DLQ + alarm construct
  config/
    base.py                      # Shared config values
    dev.py                       # Dev environment overrides
    demo.py                      # Demo environment overrides
    prod.py                      # Production overrides
  layers/
    common/                      # Shared Lambda layer (powertools, models)
      requirements.txt
  cdk.json
  requirements.txt               # CDK dependencies
```

---

## 2. CDK App Entry Point

```python
# app.py
#!/usr/bin/env python3
"""CDK application entry point.

Instantiates stacks based on the environment profile.
Phase 1 (solo): Skips Redis and VPC stacks for $0/month deployment.
Phase 2+ (prod): Deploys all stacks including Redis, VPC, WAF.

Usage: cdk deploy --context env=solo     # Zero-cost launch
       cdk deploy --context env=prod     # Full production
"""

import aws_cdk as cdk

from config.solo import SoloConfig
from config.dev import DevConfig
from config.demo import DemoConfig
from config.prod import ProdConfig
from stacks.auth_stack import AuthStack
from stacks.data_stack import DataStack
from stacks.api_stack import ApiStack
from stacks.messaging_stack import MessagingStack
from stacks.frontend_stack import FrontendStack
from stacks.monitoring_stack import MonitoringStack

app = cdk.App()

# Determine environment from CDK context
env_name = app.node.try_get_context("env") or "solo"
config_map = {
    "solo": SoloConfig,
    "dev": DevConfig,
    "demo": DemoConfig,
    "prod": ProdConfig,
}
config = config_map[env_name]()

# Common tags applied to ALL resources
tags = {
    "Project": "salon-marketing",
    "Environment": env_name,
    "ManagedBy": "cdk",
    "CostCenter": "marketing-platform",
}

# AWS environment
aws_env = cdk.Environment(
    account=config.aws_account_id,
    region=config.aws_region,
)

# ─── Always-deployed stacks ─────────────────────────────────
auth = AuthStack(app, f"marketing-auth-{env_name}",
    env=aws_env, config=config)

data = DataStack(app, f"marketing-data-{env_name}",
    env=aws_env, config=config)

messaging = MessagingStack(app, f"marketing-messaging-{env_name}",
    env=aws_env, config=config)

# ─── Conditionally-deployed stacks (Phase 2+ only) ──────────
vpc = None
redis_endpoint = ""

if config.enable_vpc:
    from stacks.networking_stack import NetworkingStack
    networking = NetworkingStack(app, f"marketing-networking-{env_name}",
        env=aws_env, config=config)
    vpc = networking.vpc

if config.enable_redis:
    from stacks.cache_stack import CacheStack
    cache = CacheStack(app, f"marketing-cache-{env_name}",
        env=aws_env, config=config, vpc=vpc)
    redis_endpoint = cache.redis_endpoint

# ─── API stack (receives VPC/Redis only if available) ────────
api = ApiStack(app, f"marketing-api-{env_name}",
    env=aws_env, config=config,
    table=data.table,
    user_pool=auth.user_pool,
    campaign_queue=messaging.campaign_queue,
    vpc=vpc,             # None in Phase 1 (Lambda outside VPC)
    redis_endpoint=redis_endpoint,  # "" in Phase 1 (DynamoDB used instead)
)

frontend = FrontendStack(app, f"marketing-frontend-{env_name}",
    env=aws_env, config=config, api_url=api.api_url)

monitoring = MonitoringStack(app, f"marketing-monitoring-{env_name}",
    env=aws_env, config=config,
    api=api.api,
    table=data.table,
    campaign_queue=messaging.campaign_queue,
    dlq=messaging.dlq,
)

# Apply tags to all stacks
all_stacks = [auth, data, messaging, api, frontend, monitoring]
if config.enable_vpc:
    all_stacks.append(networking)
if config.enable_redis:
    all_stacks.append(cache)

for stack in all_stacks:
    for key, value in tags.items():
        cdk.Tags.of(stack).add(key, value)

app.synth()
```

---

## 3. Environment Configuration

```python
# config/base.py
from dataclasses import dataclass


@dataclass
class BaseConfig:
    """Shared configuration across all environments."""
    project_name: str = "salon-marketing"
    aws_region: str = "ap-south-1"  # Mumbai (closest to target market)
    aws_account_id: str = ""

    # Feature flags for cost optimization
    enable_redis: bool = False       # Phase 2+ only
    enable_vpc: bool = False         # Phase 2+ only (required for Redis)
    enable_waf: bool = False         # Phase 2+ only
    enable_sentry: bool = False      # Phase 2+ only
    secrets_backend: str = "ssm"     # "ssm" (free) or "secretsmanager" ($0.40/secret)

    # DynamoDB
    dynamodb_table_name: str = ""  # Set per environment
    dynamodb_pitr_enabled: bool = False
    dynamodb_stream_enabled: bool = True
    dynamodb_billing_mode: str = "PROVISIONED"  # "PROVISIONED" (free tier) or "PAY_PER_REQUEST"

    # Lambda
    lambda_memory_mb: int = 256
    lambda_timeout_seconds: int = 30
    lambda_runtime: str = "python3.12"
    lambda_architecture: str = "arm64"  # Graviton2 for 20% cost savings

    # Cache (only used when enable_redis=True)
    redis_node_type: str = "cache.t3.micro"
    redis_num_replicas: int = 0

    # Logging
    log_retention_days: int = 7
    log_level: str = "DEBUG"

    # API
    api_throttle_rate: int = 100
    api_throttle_burst: int = 200

    # Frontend
    domain_name: str = ""
    certificate_arn: str = ""


# config/solo.py — ZERO COST PROFILE
from config.base import BaseConfig

class SoloConfig(BaseConfig):
    """Solopreneur profile. $0/month on AWS Free Tier.
    
    No Redis, no VPC, no NAT Gateway, no Secrets Manager, no WAF, no Sentry.
    Uses DynamoDB for rate limiting, caching, and SSM for secrets.
    Supports 0-50 tenants and ~100K messages/month.
    """
    aws_account_id = "111111111111"
    dynamodb_table_name = "salon-marketing-solo"
    dynamodb_billing_mode = "PROVISIONED"  # Uses free tier 25 RCU/WCU
    lambda_memory_mb = 256
    log_retention_days = 7
    log_level = "INFO"
    enable_redis = False
    enable_vpc = False
    enable_waf = False
    enable_sentry = False
    secrets_backend = "ssm"
    domain_name = "app.marketing.ajnacapital.com"


# config/dev.py
from config.base import BaseConfig

class DevConfig(BaseConfig):
    aws_account_id = "111111111111"
    dynamodb_table_name = "salon-marketing-dev"
    dynamodb_billing_mode = "PAY_PER_REQUEST"
    lambda_memory_mb = 256
    log_retention_days = 7
    log_level = "DEBUG"
    enable_redis = False   # Match solo for cost savings
    enable_vpc = False
    domain_name = "dev.marketing.ajnacapital.com"


# config/prod.py — FULL PRODUCTION PROFILE
from config.base import BaseConfig

class ProdConfig(BaseConfig):
    """Full production profile with all features. ~$80-235/month.
    
    Enable when scaling past 50 tenants or 100K messages/month.
    """
    aws_account_id = "333333333333"
    dynamodb_table_name = "salon-marketing-prod"
    dynamodb_pitr_enabled = True
    dynamodb_billing_mode = "PAY_PER_REQUEST"
    lambda_memory_mb = 512
    log_retention_days = 90
    log_level = "INFO"
    enable_redis = True
    enable_vpc = True
    enable_waf = True
    enable_sentry = True
    secrets_backend = "secretsmanager"
    redis_node_type = "cache.t3.medium"
    redis_num_replicas = 1  # Multi-AZ
    api_throttle_rate = 500
    api_throttle_burst = 1000
    domain_name = "app.marketing.ajnacapital.com"
```

---

## 4. Stack Patterns

### 4.1 Data Stack (DynamoDB)

```python
# stacks/data_stack.py
from aws_cdk import (
    Stack, RemovalPolicy, CfnOutput,
    aws_dynamodb as dynamodb,
)
from constructs import Construct


class DataStack(Stack):

    def __init__(self, scope: Construct, id: str, config, **kwargs):
        super().__init__(scope, id, **kwargs)

        self.table = dynamodb.Table(
            self, "MainTable",
            table_name=config.dynamodb_table_name,
            partition_key=dynamodb.Attribute(name="PK", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="SK", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.RETAIN if config.dynamodb_pitr_enabled else RemovalPolicy.DESTROY,
            point_in_time_recovery=config.dynamodb_pitr_enabled,
            stream=dynamodb.StreamViewType.NEW_AND_OLD_IMAGES if config.dynamodb_stream_enabled else None,
            time_to_live_attribute="ttl",
            encryption=dynamodb.TableEncryption.AWS_MANAGED,
        )

        # GSI1: List queries (campaigns by tenant, templates by status)
        self.table.add_global_secondary_index(
            index_name="GSI1",
            partition_key=dynamodb.Attribute(name="GSI1PK", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="GSI1SK", type=dynamodb.AttributeType.STRING),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI2: Scheduled campaigns, billing queries
        self.table.add_global_secondary_index(
            index_name="GSI2",
            partition_key=dynamodb.Attribute(name="GSI2PK", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="GSI2SK", type=dynamodb.AttributeType.STRING),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        # GSI3: Customer lookup across entities
        self.table.add_global_secondary_index(
            index_name="GSI3",
            partition_key=dynamodb.Attribute(name="GSI3PK", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="GSI3SK", type=dynamodb.AttributeType.STRING),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        CfnOutput(self, "TableName", value=self.table.table_name)
        CfnOutput(self, "TableArn", value=self.table.table_arn)
```

### 4.2 API Stack (Lambda + API Gateway)

```python
# stacks/api_stack.py
from aws_cdk import (
    Stack, Duration, CfnOutput,
    aws_apigateway as apigw,
    aws_lambda as lambda_,
    aws_cognito as cognito,
    aws_iam as iam,
    aws_logs as logs,
)
from constructs import Construct
from constructs_.lambda_function import PythonLambda


class ApiStack(Stack):

    def __init__(self, scope, id, config, table, user_pool, campaign_queue, vpc, redis_endpoint, **kwargs):
        super().__init__(scope, id, **kwargs)

        # Shared Lambda layer (powertools, pydantic, models)
        common_layer = lambda_.LayerVersion(
            self, "CommonLayer",
            code=lambda_.Code.from_asset("layers/common"),
            compatible_runtimes=[lambda_.Runtime.PYTHON_3_12],
            compatible_architectures=[lambda_.Architecture.ARM_64],
            description="Common dependencies: powertools, pydantic, httpx",
        )

        # Shared environment variables
        common_env = {
            "ENVIRONMENT": config.project_name.split("-")[-1],
            "DYNAMODB_TABLE_NAME": table.table_name,
            "SQS_CAMPAIGN_QUEUE_URL": campaign_queue.queue_url,
            "REDIS_ENDPOINT": redis_endpoint,
            "LOG_LEVEL": config.log_level,
            "POWERTOOLS_SERVICE_NAME": "marketing-api",
            "POWERTOOLS_METRICS_NAMESPACE": "SalonMarketing",
        }

        # ─── Campaign API Lambda ───
        campaign_handler = PythonLambda(
            self, "CampaignHandler",
            entry="backend/src",
            handler="handlers.campaign_handler.handler",
            config=config,
            layers=[common_layer],
            environment=common_env,
            vpc=vpc,
        )
        table.grant_read_write_data(campaign_handler.function)
        campaign_queue.grant_send_messages(campaign_handler.function)

        # ─── Webhook Handler Lambda ───
        webhook_handler = PythonLambda(
            self, "WebhookHandler",
            entry="backend/src",
            handler="handlers.webhook_handler.handler",
            config=config,
            layers=[common_layer],
            environment=common_env,
            vpc=vpc,
        )
        table.grant_read_write_data(webhook_handler.function)

        # ─── API Gateway ───
        self.api = apigw.RestApi(
            self, "MarketingApi",
            rest_api_name=f"marketing-api-{config.project_name}",
            deploy_options=apigw.StageOptions(
                stage_name="api",
                throttling_rate_limit=config.api_throttle_rate,
                throttling_burst_limit=config.api_throttle_burst,
                tracing_enabled=True,
                access_log_destination=apigw.LogGroupLogDestination(
                    logs.LogGroup(self, "ApiAccessLogs",
                        retention=logs.RetentionDays.ONE_MONTH,
                    )
                ),
                access_log_format=apigw.AccessLogFormat.json_with_standard_fields(),
            ),
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,
                allow_methods=apigw.Cors.ALL_METHODS,
                allow_headers=["Authorization", "Content-Type"],
            ),
        )

        # Cognito authorizer
        authorizer = apigw.CognitoUserPoolsAuthorizer(
            self, "CognitoAuthorizer",
            cognito_user_pools=[user_pool],
        )

        # ─── Route definitions ───
        v1 = self.api.root.add_resource("api").add_resource("v1")

        # Campaign routes
        campaigns = v1.add_resource("campaigns")
        campaigns.add_method("GET", apigw.LambdaIntegration(campaign_handler.function),
            authorizer=authorizer, authorization_type=apigw.AuthorizationType.COGNITO)
        campaigns.add_method("POST", apigw.LambdaIntegration(campaign_handler.function),
            authorizer=authorizer, authorization_type=apigw.AuthorizationType.COGNITO)

        campaign_id = campaigns.add_resource("{campaign_id}")
        campaign_id.add_method("GET", apigw.LambdaIntegration(campaign_handler.function),
            authorizer=authorizer, authorization_type=apigw.AuthorizationType.COGNITO)
        campaign_id.add_method("PUT", apigw.LambdaIntegration(campaign_handler.function),
            authorizer=authorizer, authorization_type=apigw.AuthorizationType.COGNITO)

        # Webhook routes (no auth — verified by signature)
        hooks = v1.add_resource("hooks")
        whatsapp_hook = hooks.add_resource("whatsapp")
        whatsapp_hook.add_method("GET", apigw.LambdaIntegration(webhook_handler.function))
        whatsapp_hook.add_method("POST", apigw.LambdaIntegration(webhook_handler.function))

        self.api_url = self.api.url
        CfnOutput(self, "ApiUrl", value=self.api.url)
```

### 4.3 Custom Lambda Construct

```python
# constructs/lambda_function.py
from aws_cdk import Duration, aws_lambda as lambda_, aws_logs as logs
from constructs import Construct


class PythonLambda(Construct):
    """Custom L3 construct for Lambda with project defaults.
    
    Ensures every Lambda has:
    - ARM64 architecture (cost savings)
    - X-Ray tracing enabled
    - Structured log retention
    - Consistent memory/timeout from config
    """

    def __init__(
        self,
        scope: Construct,
        id: str,
        entry: str,
        handler: str,
        config,
        layers: list | None = None,
        environment: dict | None = None,
        vpc=None,
        reserved_concurrency: int | None = None,
    ):
        super().__init__(scope, id)

        self.function = lambda_.Function(
            self, "Function",
            runtime=lambda_.Runtime.PYTHON_3_12,
            architecture=lambda_.Architecture.ARM_64,
            code=lambda_.Code.from_asset(entry),
            handler=handler,
            memory_size=config.lambda_memory_mb,
            timeout=Duration.seconds(config.lambda_timeout_seconds),
            tracing=lambda_.Tracing.ACTIVE,
            layers=layers or [],
            environment=environment or {},
            vpc=vpc,
            reserved_concurrent_executions=reserved_concurrency,
            log_retention=getattr(logs.RetentionDays, f"ONE_WEEK")
                if config.log_retention_days <= 7
                else logs.RetentionDays.ONE_MONTH,
        )
```

### 4.4 Messaging Stack (SQS + EventBridge)

```python
# stacks/messaging_stack.py
from aws_cdk import (
    Stack, Duration, CfnOutput,
    aws_sqs as sqs,
    aws_events as events,
    aws_events_targets as targets,
)
from constructs import Construct


class MessagingStack(Stack):

    def __init__(self, scope, id, config, **kwargs):
        super().__init__(scope, id, **kwargs)

        # Dead Letter Queue
        self.dlq = sqs.Queue(
            self, "CampaignDLQ",
            queue_name=f"marketing-campaign-dlq-{config.project_name}.fifo",
            fifo=True,
            retention_period=Duration.days(14),
        )

        # Campaign message queue (FIFO for ordering)
        self.campaign_queue = sqs.Queue(
            self, "CampaignQueue",
            queue_name=f"marketing-campaign-queue-{config.project_name}.fifo",
            fifo=True,
            content_based_deduplication=True,
            visibility_timeout=Duration.minutes(5),
            dead_letter_queue=sqs.DeadLetterQueue(
                max_receive_count=3,
                queue=self.dlq,
            ),
        )

        CfnOutput(self, "CampaignQueueUrl", value=self.campaign_queue.queue_url)
        CfnOutput(self, "DLQUrl", value=self.dlq.queue_url)
```

---

## 5. CDK Best Practices

### 5.1 Rules

1. **Separate stateful from stateless.** DynamoDB (DataStack) and S3 are in separate stacks from Lambda (ApiStack). This prevents accidental deletion.
2. **`RemovalPolicy.RETAIN`** on production DynamoDB and S3 buckets. Never allow CDK to delete production data.
3. **Least-privilege IAM.** Use `table.grant_read_write_data(fn)` instead of `fn.add_to_role_policy(*)`. CDK generates minimal policies automatically.
4. **Tag everything.** Project, Environment, CostCenter on all resources. Apply at the app level with `cdk.Tags.of()`.
5. **Use CfnOutput for cross-stack references.** Never hardcode ARNs or resource names.
6. **ARM64 Lambda (Graviton2)** for all functions. 20% cheaper, same performance.
7. **`cdk diff` before every deploy.** Review all changes, especially deletions.
8. **Never `cdk destroy` in production.** Only dev environments.

### 5.2 Deployment Commands

```bash
# ─── Phase 1: Solopreneur ($0/month) ───
# Synthesize and validate
cdk synth --context env=solo

# Show what will be created (review before deploying)
cdk diff --context env=solo

# Deploy (skips Redis, VPC, NAT — 6 stacks only)
cdk deploy --all --context env=solo --require-approval never

# ─── Development ───
cdk deploy --all --context env=dev --require-approval never

# ─── Production (Phase 2+ — all 8 stacks) ───
# Always review changes first
cdk diff --context env=prod

# Deploy with approval for IAM/security changes
cdk deploy --all --context env=prod --require-approval broadening

# ─── Migration: Solo → Prod ───
# Step 1: Review all changes (will show new VPC, Redis, NAT resources)
cdk diff --context env=prod

# Step 2: Deploy (creates ~15 new resources)
cdk deploy --all --context env=prod --require-approval broadening

# ─── Destroy (dev/solo only — NEVER in production) ───
cdk destroy --all --context env=solo
```
