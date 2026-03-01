# Development Environment Setup Guide

## WhatsApp Marketing Campaign Platform — Solopreneur Edition

> **Purpose:** This document is the FIRST thing to follow when bootstrapping the project from scratch. It installs all prerequisites, configures Claude Code (Antigravity) with the recommended plugins, sets up the AWS environment at $0/month, and validates everything works before writing a single line of application code.
>
> **Time to complete:** ~45 minutes (one-time setup)

---

## Table of Contents

1. [Prerequisites & System Requirements](#1-prerequisites--system-requirements)
2. [AWS Account Setup (Free Tier)](#2-aws-account-setup-free-tier)
3. [Project Repository Setup](#3-project-repository-setup)
4. [Claude Code (Antigravity) Setup](#4-claude-code-antigravity-setup)
5. [Context7 MCP Server Installation](#5-context7-mcp-server-installation)
6. [Superpowers Plugin Installation](#6-superpowers-plugin-installation)
7. [Project Documentation Structure](#7-project-documentation-structure)
8. [CLAUDE.md Configuration](#8-claudemd-configuration)
9. [AWS CDK Bootstrap](#9-aws-cdk-bootstrap)
10. [Verification Checklist](#10-verification-checklist)
11. [Daily Development Workflow](#11-daily-development-workflow)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites & System Requirements

### 1.1 Required Software

Install these before anything else:

| Tool | Version | Install Command | Purpose |
|------|---------|-----------------|---------|
| **Node.js** | 20 LTS+ | `nvm install 20` | CDK, Context7, frontend tooling |
| **Python** | 3.12+ | `pyenv install 3.12` | Lambda runtime, CDK |
| **AWS CLI** | v2 | `curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"` | AWS resource management |
| **AWS CDK** | 2.x | `npm install -g aws-cdk` | Infrastructure as Code |
| **Git** | 2.40+ | System package manager | Version control |
| **Claude Code** | Latest | `npm install -g @anthropic-ai/claude-code` | AI-assisted development (Antigravity) |
| **Docker** | 24+ | Docker Desktop or engine | Local DynamoDB, testing |

### 1.2 Verify Installations

```bash
# Run all checks in one go
echo "Node: $(node --version)" && \
echo "Python: $(python3 --version)" && \
echo "AWS CLI: $(aws --version)" && \
echo "CDK: $(cdk --version)" && \
echo "Git: $(git --version)" && \
echo "Claude Code: $(claude --version)" && \
echo "Docker: $(docker --version)"
```

**Expected output:** All tools show valid version numbers. No "command not found" errors.

### 1.3 Required Accounts

| Account | URL | Cost | Notes |
|---------|-----|------|-------|
| AWS | https://aws.amazon.com | $0 (free tier) | Use a fresh account for cleanest free tier |
| GitHub | https://github.com | $0 (free) | For repository + CI/CD (2K min/month free Actions) |
| Anthropic | https://console.anthropic.com | Claude Code subscription | For Antigravity |
| Meta Business | https://business.facebook.com | $0 | For WhatsApp Cloud API access |
| Stripe | https://dashboard.stripe.com | $0 (test mode) | Payment processing (no charges until live) |

---

## 2. AWS Account Setup (Free Tier)

### 2.1 Configure AWS CLI

```bash
# Configure default profile (use ap-south-1 for Mumbai — closest to target market)
aws configure
# AWS Access Key ID: <your-key>
# AWS Secret Access Key: <your-secret>
# Default region name: ap-south-1
# Default output format: json

# Verify
aws sts get-caller-identity
```

### 2.2 Create SSM Parameters (Free Secrets Storage)

Phase 1 uses SSM Parameter Store instead of Secrets Manager ($0 vs $2+/month):

```bash
# WhatsApp Cloud API credentials
aws ssm put-parameter \
  --name "/salon-marketing/solo/WHATSAPP_ACCESS_TOKEN" \
  --type "SecureString" \
  --value "YOUR_META_ACCESS_TOKEN"

aws ssm put-parameter \
  --name "/salon-marketing/solo/WHATSAPP_PHONE_NUMBER_ID" \
  --type "SecureString" \
  --value "YOUR_PHONE_NUMBER_ID"

aws ssm put-parameter \
  --name "/salon-marketing/solo/WHATSAPP_VERIFY_TOKEN" \
  --type "SecureString" \
  --value "$(openssl rand -hex 32)"

# Stripe (test mode keys — no charges)
aws ssm put-parameter \
  --name "/salon-marketing/solo/STRIPE_SECRET_KEY" \
  --type "SecureString" \
  --value "sk_test_YOUR_STRIPE_KEY"

aws ssm put-parameter \
  --name "/salon-marketing/solo/STRIPE_WEBHOOK_SECRET" \
  --type "SecureString" \
  --value "whsec_YOUR_WEBHOOK_SECRET"

# Razorpay (test mode keys)
aws ssm put-parameter \
  --name "/salon-marketing/solo/RAZORPAY_KEY_ID" \
  --type "SecureString" \
  --value "rzp_test_YOUR_KEY"

aws ssm put-parameter \
  --name "/salon-marketing/solo/RAZORPAY_KEY_SECRET" \
  --type "SecureString" \
  --value "YOUR_RAZORPAY_SECRET"

# Verify all parameters are stored
aws ssm describe-parameters --filters "Key=Name,Values=/salon-marketing/solo/" \
  --query "Parameters[].Name" --output table
```

> **Cost:** $0. SSM Parameter Store SecureString uses the AWS-managed KMS key at no charge.

---

## 3. Project Repository Setup

### 3.1 Initialize Repository

```bash
# Create project directory
mkdir salon-marketing-platform && cd salon-marketing-platform

# Initialize git
git init
git checkout -b main

# Create GitHub repo (using gh CLI, or create manually on github.com)
gh repo create ai-solopreneur/salon-marketing-platform --private --source=. --remote=origin

# Create project structure
mkdir -p \
  .antigravity/context \
  .claude \
  src/handlers \
  src/services \
  src/repositories \
  src/integrations \
  src/models \
  src/utils \
  tests/unit \
  tests/integration \
  infra/stacks \
  infra/config \
  infra/constructs \
  frontend/src/components \
  frontend/src/pages \
  frontend/src/hooks \
  frontend/src/services \
  frontend/src/store \
  frontend/src/types \
  frontend/src/utils \
  layers/common \
  scripts
```

### 3.2 Copy Documentation Suite into Project

Place all 11 documentation files into `.antigravity/context/` so Claude reads them at session start:

```bash
# Copy all .md files into the Antigravity context directory
# (Assumes you have downloaded them from the outputs)
cp MARKETING_MODULE_PRD.md          .antigravity/context/
cp CODING_STANDARDS.md              .antigravity/context/
cp UX_DESIGN_SYSTEM.md              .antigravity/context/
cp ARCHITECTURE_PATTERNS.md         .antigravity/context/
cp TESTING_PLAYBOOK.md              .antigravity/context/
cp DYNAMODB_COOKBOOK.md              .antigravity/context/
cp REACT_PATTERNS.md                .antigravity/context/
cp CDK_PATTERNS.md                  .antigravity/context/
cp API_CONVENTIONS.md               .antigravity/context/
cp SECURITY_PLAYBOOK.md             .antigravity/context/
cp DEV_ENVIRONMENT_SETUP.md         .antigravity/context/

# Verify
echo "Documentation files in .antigravity/context/:"
ls -la .antigravity/context/*.md | awk '{print NR". "$NF}'
```

**Expected:** 11 files listed.

---

## 4. Claude Code (Antigravity) Setup

### 4.1 Authenticate

```bash
# Login to Claude Code
claude login

# Verify
claude status
```

### 4.2 Configure Project Settings

```bash
# Set project-level model preference
claude config set model claude-sonnet-4-5-20250514

# Enable extended thinking for architectural decisions
claude config set --project thinking enabled

# Set max turns for autonomous work (Superpowers will manage checkpoints)
claude config set --project max-turns 50
```

---

## 5. Context7 MCP Server Installation

### 5.1 What Context7 Does

Context7 is an MCP (Model Context Protocol) server that gives Claude access to **live, version-specific documentation** for any library. Instead of relying on training data (which can hallucinate APIs), Claude queries Context7 for the actual current docs of AWS CDK, DynamoDB, React, Tailwind CSS, etc.

**This is critical for our stack because:**
- AWS CDK releases new L2 constructs frequently — training data goes stale
- DynamoDB boto3 API has subtle parameter differences between versions
- React 18+ hooks and TypeScript patterns evolve rapidly
- Tailwind CSS class names change between versions

### 5.2 Install Context7

```bash
# One command — adds Context7 as a project-scoped MCP server
claude mcp add context7 -- npx -y @upstash/context7-mcp
```

### 5.3 Verify Context7

```bash
# Check MCP servers list
claude mcp list

# Expected output should include:
# context7: npx -y @upstash/context7-mcp
```

### 5.4 How to Use Context7 in Development

Context7 activates automatically when Claude needs library documentation. You can also explicitly request it:

```
# In a Claude Code session, you can say:
"Look up the current AWS CDK Python API for DynamoDB Table construct using Context7"

"Use Context7 to check the exact React 18 useTransition hook signature"

"Check Context7 for the latest boto3 DynamoDB batch_writer API"
```

**Context7 exposes two tools Claude will use:**
1. `resolve-library-id` — Finds the correct library in Context7's database
2. `get-library-docs` — Fetches version-specific documentation snippets

> **Cost:** $0. Context7 is free and open-source (MIT). No API key needed.

---

## 6. Superpowers Plugin Installation

### 6.1 What Superpowers Does

Superpowers is a development methodology plugin that enforces a disciplined workflow on every task Claude undertakes. Instead of jumping straight to code, Claude will:

1. **Brainstorm** — Ask clarifying questions, explore alternatives, refine the design
2. **Write a Plan** — Break work into 2-5 minute tasks with exact file paths and verification steps
3. **Execute with TDD** — Strict RED-GREEN-REFACTOR: write failing test → watch it fail → write minimal code → watch it pass → commit
4. **Code Review** — Two-stage review (spec compliance, then code quality) between tasks
5. **Finish Clean** — Verify all tests pass, present merge/PR options

**This is critical for our project because:**
- Multi-tenant SaaS decisions (partition keys, tenant isolation) have cascading consequences — brainstorming catches issues early
- DynamoDB access patterns must be right from the start — planning prevents costly redesigns
- TDD ensures every Lambda handler, service, and repository has tests before code ships
- Subagent-driven development enables parallel work on CDK infra + Lambda handlers + React components

### 6.2 Install Superpowers

```bash
# Step 1: Register the Superpowers marketplace
/plugin marketplace add obra/superpowers-marketplace

# Step 2: Install the plugin from the marketplace
/plugin install superpowers@superpowers-marketplace
```

> **Run both commands inside a Claude Code session** (start with `claude` in the project directory).

### 6.3 Verify Superpowers

```bash
# Inside Claude Code, run:
/help

# Expected output should include:
# /superpowers:brainstorm      — Interactive design refinement
# /superpowers:write-plan      — Create implementation plan
# /superpowers:execute-plan    — Execute plan in batches
```

### 6.4 Superpowers Skills Inventory

Superpowers installs 14 composable skills that activate automatically:

| Skill | When It Activates | Value for This Project |
|-------|-------------------|----------------------|
| **brainstorming** | Before writing any code | Catches DynamoDB partition key mistakes, tenant isolation gaps |
| **writing-plans** | After design approval | Produces exact file paths, code snippets, verification steps |
| **executing-plans** | When plan is approved | Batch execution with human checkpoints |
| **test-driven-development** | During implementation | Enforces RED-GREEN-REFACTOR — critical for Lambda + DynamoDB |
| **subagent-driven-development** | For parallel tasks | Fresh 200K context window per subtask — prevents context rot |
| **systematic-debugging** | When tests fail | 4-phase root-cause process — invaluable for Lambda cold starts, DynamoDB throttling |
| **requesting-code-review** | Between tasks | Catches security issues, tenant isolation violations |
| **receiving-code-review** | After review feedback | Structured response to feedback |
| **verification-before-completion** | Before declaring "done" | Ensures tests actually pass, not just claimed to pass |
| **using-git-worktrees** | After design approval | Isolated workspace on new branch |
| **finishing-a-development-branch** | When tasks complete | Merge/PR decision with cleanup |
| **dispatching-parallel-agents** | Complex multi-part tasks | Parallel CDK + Lambda + React work |
| **writing-skills** | Creating new skills | Extend Superpowers with project-specific skills |
| **using-superpowers** | Session start | Introduction to the skills system |

### 6.5 Update Superpowers

```bash
# Inside Claude Code:
/plugin update superpowers
```

> **Cost:** $0. Superpowers is open-source (MIT license).

---

## 7. Project Documentation Structure

After setup, your project should have this structure:

```
salon-marketing-platform/
├── .antigravity/
│   └── context/                              # Claude reads these at session start
│       ├── MARKETING_MODULE_PRD.md           # Product requirements (1,925 lines)
│       ├── CODING_STANDARDS.md               # Python/TypeScript conventions (620 lines)
│       ├── UX_DESIGN_SYSTEM.md               # Design tokens, components (719 lines)
│       ├── ARCHITECTURE_PATTERNS.md          # Layer architecture, abstractions (1,267 lines)
│       ├── TESTING_PLAYBOOK.md               # Test patterns, coverage targets (892 lines)
│       ├── DYNAMODB_COOKBOOK.md               # Access patterns, anti-patterns (479 lines)
│       ├── REACT_PATTERNS.md                 # State management, hooks, forms (625 lines)
│       ├── CDK_PATTERNS.md                   # IaC templates, env configs (598 lines)
│       ├── API_CONVENTIONS.md                # REST design, auth, rate limits (430 lines)
│       ├── SECURITY_PLAYBOOK.md              # Multi-tenant security, OWASP (NEW)
│       └── DEV_ENVIRONMENT_SETUP.md          # This file (setup guide)
│
├── .claude/                                  # Claude Code configuration
│   ├── settings.json                         # Project settings
│   └── skills/                               # Superpowers skills (auto-installed)
│       ├── brainstorming/SKILL.md
│       ├── test-driven-development/SKILL.md
│       ├── writing-plans/SKILL.md
│       └── ... (14 total skills)
│
├── CLAUDE.md                                 # Project-level instructions for Claude
│
├── src/                                      # Backend (Python Lambda)
│   ├── handlers/                             # Lambda entry points
│   ├── services/                             # Business logic
│   ├── repositories/                         # DynamoDB data access
│   ├── integrations/                         # External API clients
│   ├── models/                               # Domain models (Pydantic)
│   └── utils/                                # Shared utilities
│       ├── rate_limiter.py                   # DynamoDB/Redis rate limiter
│       ├── cache.py                          # DynamoDB/Redis cache
│       └── secrets.py                        # SSM/Secrets Manager provider
│
├── tests/                                    # Test suite
│   ├── conftest.py                           # Shared fixtures
│   ├── unit/                                 # Unit tests
│   └── integration/                          # Integration tests
│
├── infra/                                    # AWS CDK
│   ├── app.py                                # CDK entry point
│   ├── stacks/                               # Stack definitions
│   └── config/                               # Environment configs (solo, dev, prod)
│
├── frontend/                                 # React 18 + TypeScript
│   └── src/
│
├── layers/common/                            # Shared Lambda layer
├── scripts/                                  # Utility scripts
├── requirements.txt                          # Python dependencies (pinned)
├── package.json                              # Node dependencies
└── .github/workflows/                        # CI/CD pipeline
```

---

## 8. CLAUDE.md Configuration

Create the project-level instruction file that Claude reads at every session start:

```bash
cat > CLAUDE.md << 'CLAUDE_EOF'
# Salon Marketing Campaign Platform — Claude Code Instructions

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
CLAUDE_EOF
```

---

## 9. AWS CDK Bootstrap

### 9.1 Bootstrap CDK in ap-south-1

```bash
# CDK bootstrap (one-time per account/region)
cdk bootstrap aws://YOUR_ACCOUNT_ID/ap-south-1 \
  --tags Project=salon-marketing \
  --tags ManagedBy=cdk
```

### 9.2 Initialize Python Environment

```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install core dependencies
pip install \
  aws-cdk-lib==2.175.0 \
  constructs>=10.0.0 \
  boto3>=1.35.0 \
  aws-lambda-powertools>=3.0.0 \
  pydantic>=2.0.0 \
  moto[dynamodb,sqs,ssm]>=5.0.0 \
  pytest>=8.0.0 \
  pytest-cov>=5.0.0 \
  ruff>=0.7.0 \
  mypy>=1.13.0

# Pin versions
pip freeze > requirements.txt
```

### 9.3 Initialize Frontend

```bash
cd frontend

# Create React 18 + TypeScript project
npm create vite@latest . -- --template react-ts

# Install project dependencies
npm install \
  @tanstack/react-query \
  zustand \
  react-router-dom \
  react-hook-form \
  @hookform/resolvers \
  zod \
  clsx \
  tailwind-merge \
  lucide-react

# Install dev dependencies
npm install -D \
  @testing-library/react \
  @testing-library/user-event \
  @testing-library/jest-dom \
  vitest \
  @vitest/ui \
  jsdom \
  tailwindcss \
  @tailwindcss/forms \
  autoprefixer \
  postcss \
  prettier \
  eslint \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  playwright

cd ..
```

---

## 10. Verification Checklist

Run through this checklist to confirm everything is ready:

```bash
echo "=== VERIFICATION CHECKLIST ==="
echo ""

# 1. AWS access
echo "1. AWS Access:"
aws sts get-caller-identity --query "Account" --output text && echo "   ✅ AWS configured" || echo "   ❌ AWS not configured"

# 2. SSM parameters
echo "2. SSM Parameters:"
PARAMS=$(aws ssm describe-parameters --filters "Key=Name,Values=/salon-marketing/solo/" --query "length(Parameters)" --output text)
echo "   Found $PARAMS parameters (expected: 7)"

# 3. Claude Code
echo "3. Claude Code:"
claude --version && echo "   ✅ Claude Code installed" || echo "   ❌ Claude Code not installed"

# 4. Context7 MCP
echo "4. Context7 MCP:"
claude mcp list 2>/dev/null | grep -q "context7" && echo "   ✅ Context7 configured" || echo "   ❌ Context7 not configured"

# 5. CDK
echo "5. AWS CDK:"
cdk --version && echo "   ✅ CDK installed" || echo "   ❌ CDK not installed"

# 6. Project docs
echo "6. Documentation Suite:"
DOC_COUNT=$(ls .antigravity/context/*.md 2>/dev/null | wc -l)
echo "   Found $DOC_COUNT documents (expected: 11)"

# 7. CLAUDE.md
echo "7. CLAUDE.md:"
[ -f CLAUDE.md ] && echo "   ✅ CLAUDE.md exists" || echo "   ❌ CLAUDE.md missing"

# 8. Python env
echo "8. Python Environment:"
python3 -c "import aws_cdk; print(f'   ✅ CDK lib {aws_cdk.__version__}')" 2>/dev/null || echo "   ❌ Python deps not installed"

echo ""
echo "=== ALL CHECKS COMPLETE ==="
```

**Expected:** All items show ✅. If any show ❌, fix before proceeding.

---

## 11. Daily Development Workflow

### 11.1 Starting a Session

```bash
# Navigate to project root
cd salon-marketing-platform

# Activate Python venv
source .venv/bin/activate

# Start Claude Code (Antigravity)
claude

# Claude will:
# 1. Read CLAUDE.md (project instructions)
# 2. Have Context7 available for API lookups
# 3. Have Superpowers skills loaded for TDD workflow
# 4. Have access to all 11 docs in .antigravity/context/
```

### 11.2 Typical Task Flow (with Superpowers)

```
You: "Build the campaign creation API endpoint"

Claude (brainstorming):
  → Asks clarifying questions about business rules
  → Explores DynamoDB partition key design
  → Presents design for your approval

Claude (writing plan):
  → Breaks into 6-8 tasks, each 2-5 minutes
  → Exact file paths: src/handlers/campaign_handler.py
  → Exact test files: tests/unit/test_campaign_service.py
  → Verification steps for each task

Claude (executing with TDD):
  → Task 1: Write failing test for CampaignService.create()
  → Task 1: Watch it fail (RED)
  → Task 1: Write minimal CampaignService.create() code
  → Task 1: Watch it pass (GREEN)
  → Task 1: Commit
  → Code review: Checks tenant isolation, error handling
  → Task 2: Next...
```

### 11.3 Deploying

```bash
# Validate CDK (no AWS calls)
cdk synth --context env=solo

# Preview changes
cdk diff --context env=solo

# Deploy all stacks ($0/month)
cdk deploy --all --context env=solo --require-approval never

# Verify deployment
aws dynamodb describe-table --table-name salon-marketing-solo --query "Table.TableStatus"
```

---

## 12. Troubleshooting

### Context7 Issues

| Issue | Solution |
|-------|----------|
| `context7 not found` in MCP list | Re-run: `claude mcp add context7 -- npx -y @upstash/context7-mcp` |
| Context7 times out | Check internet. Context7 fetches docs from context7.com at query time |
| Wrong library version | Be specific: "Look up AWS CDK v2 Python DynamoDB Table" |

### Superpowers Issues

| Issue | Solution |
|-------|----------|
| `/superpowers:brainstorm` not found | Re-run: `/plugin install superpowers@superpowers-marketplace` |
| Claude skips brainstorming | Say: "Use the Superpowers brainstorming workflow for this task" |
| Plan tasks are too large | Say: "Break each task into 2-3 minute chunks maximum" |

### AWS / CDK Issues

| Issue | Solution |
|-------|----------|
| CDK bootstrap fails | Ensure AWS credentials have `AdministratorAccess` or CDK-specific policy |
| DynamoDB table already exists | Check existing resources: `aws dynamodb list-tables --region ap-south-1` |
| Lambda timeout during deploy | Increase CDK deploy timeout: `--timeout 300` |
| SSM parameter access denied | Check IAM policy includes `ssm:GetParameter` with `kms:Decrypt` |

### General

| Issue | Solution |
|-------|----------|
| Claude doesn't follow project patterns | Ensure CLAUDE.md exists in project root AND docs are in `.antigravity/context/` |
| Tests fail with import errors | Ensure `source .venv/bin/activate` before running `pytest` |
| Frontend build fails | Run `npm install` in `/frontend` directory |
