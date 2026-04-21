# QA Environment — Deployment Guide

This document covers everything needed to set up and deploy the QA environment, which runs the full stack on AWS: ECS Fargate (backend), RDS PostgreSQL + ElastiCache Redis (data layer), and S3 + CloudFront (frontend).

Deploying to QA is a single `git push origin qa` once the one-time setup below is complete.

---

## Table of Contents

1. [How it works](#how-it-works)
2. [Prerequisites](#prerequisites)
3. [One-time setup](#one-time-setup)
   - [Step 1 — Terraform infrastructure](#step-1--terraform-infrastructure)
   - [Step 2 — Secrets and parameters](#step-2--secrets-and-parameters)
   - [Step 3 — ECR repositories and initial images](#step-3--ecr-repositories-and-initial-images)
   - [Step 4 — GitHub secrets](#step-4--github-secrets)
4. [Deploying to QA](#deploying-to-qa)
5. [Running QA tests manually](#running-qa-tests-manually)
6. [Monitoring a QA deployment](#monitoring-a-qa-deployment)
7. [Resetting the QA database](#resetting-the-qa-database)
8. [Troubleshooting](#troubleshooting)

---

## How it works

Pushing to the `qa` branch triggers the `.github/workflows/deploy-qa.yml` workflow, which:

1. Typechecks and builds all packages via Turborepo
2. Builds Docker images for all 8 services in parallel (matrix job) → pushes to ECR
3. Deploys all services to the `visioncraft-qa` ECS cluster via rolling update
4. Deploys the frontend to S3 + CloudFront (QA distribution) and posts a preview URL
5. Waits for the ALB health check to pass (`GET /health` on api-gateway)
6. Runs `prisma migrate deploy` as a one-off ECS task (inside the VPC, with RDS access)
7. Runs the seed script — creates `alice`, `bob`, and `admin` test accounts
8. Runs all Playwright E2E tests against the live URLs
9. Uploads a Playwright HTML report as a workflow artifact

The workflow does **not** touch the production environment. QA and production are separate ECS clusters, RDS instances, and ElastiCache clusters.

```
git push origin qa
       │
       ▼
┌────────────────────────────────────────────────────┐
│  GitHub Actions — deploy-qa.yml                    │
│                                                    │
│  build ──► build-and-push (matrix, 8 images)       │
│         └► deploy-frontend ──────────────────►     │
│                    │                               │
│                    ▼                               │
│             ECS rolling deploy (8 services)        │
│                    │                               │
│                    ▼                               │
│             migrate-and-seed (ECS one-off task)    │
│                    │                               │
│                    ▼                               │
│             e2e (Playwright)                       │
└────────────────────────────────────────────────────┘
       │                 │
       ▼                 ▼
  ECS Fargate QA    S3 + CloudFront
  (8 services       (frontend at
  + RDS             qa.visioncraft.io)
  + ElastiCache)
```

---

## Prerequisites

The following tools must be installed locally for the one-time setup steps:

```bash
# AWS CLI v2
brew install awscli        # macOS
# or: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html

# Terraform >= 1.6
brew install terraform     # macOS
# or: https://developer.hashicorp.com/terraform/install

# Docker (for building images locally during setup)
# https://docs.docker.com/get-docker/

# Configure AWS credentials
aws configure
# AWS Access Key ID, Secret Access Key, region: us-east-1
```

You also need:

- An AWS account with permissions to create VPC, ECS, RDS, ElastiCache, ALB, ECR, S3, CloudFront, IAM, Secrets Manager, SSM, and ACM resources
- A GitHub repository with Actions enabled

---

## One-time setup

Complete these steps once. After this, all future deploys are automated.

---

### Step 1 — Terraform infrastructure

Apply Terraform to provision the full QA environment:

```bash
cd infra/terraform/environments/qa

# Initialize — downloads providers, configures S3 state backend
terraform init

# Review what will be created
terraform plan

# Apply — creates VPC, ECS cluster, RDS, ElastiCache, ALB, ECR repos, IAM roles,
#          S3 frontend bucket, CloudFront distribution, Secrets Manager stubs, SSM params
terraform apply
```

After `terraform apply` completes, note these outputs — you will need them:

```bash
terraform output alb_dns_name          # e.g. visioncraft-qa-alb-123456.us-east-1.elb.amazonaws.com
terraform output cloudfront_domain     # e.g. d1abc123.cloudfront.net
terraform output ecr_registry          # e.g. 123456789.dkr.ecr.us-east-1.amazonaws.com
terraform output ecs_cluster_name      # visioncraft-qa
```

The ALB DNS name is your QA API endpoint. The CloudFront domain is your QA frontend URL.

---

### Step 2 — Secrets and parameters

Terraform creates Secrets Manager secrets and SSM parameters as empty stubs. Populate them with real values:

#### Secrets Manager (sensitive values)

```bash
# Database URL — from terraform output rds_endpoint
aws secretsmanager put-secret-value \
  --secret-id visioncraft/qa/shared/database-url \
  --secret-string "postgresql://visioncraft:PASSWORD@RDS_ENDPOINT:5432/aiplatform"

# Redis URL — from terraform output elasticache_endpoint
aws secretsmanager put-secret-value \
  --secret-id visioncraft/qa/shared/redis-url \
  --secret-string "redis://ELASTICACHE_ENDPOINT:6379"

# JWT keys (generate fresh RS256 keys)
openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in private.pem -out public.pem

aws secretsmanager put-secret-value \
  --secret-id visioncraft/qa/auth-service/jwt-private-key \
  --secret-string "$(cat private.pem)"

aws secretsmanager put-secret-value \
  --secret-id visioncraft/qa/shared/jwt-public-key \
  --secret-string "$(cat public.pem)"

# Google OAuth
aws secretsmanager put-secret-value \
  --secret-id visioncraft/qa/auth-service/google-client-id \
  --secret-string "<your-google-client-id>"

aws secretsmanager put-secret-value \
  --secret-id visioncraft/qa/auth-service/google-client-secret \
  --secret-string "<your-google-client-secret>"

# AI provider keys
aws secretsmanager put-secret-value \
  --secret-id visioncraft/qa/ai-service/stability-api-key \
  --secret-string "<your-stability-api-key>"

aws secretsmanager put-secret-value \
  --secret-id visioncraft/qa/ai-service/openai-api-key \
  --secret-string "<your-openai-api-key>"
```

#### SSM Parameter Store (non-sensitive config)

```bash
# Google OAuth callback URL — uses the ALB domain from terraform output
aws ssm put-parameter \
  --name /visioncraft/qa/auth-service/google-callback-url \
  --value "https://$(terraform output -raw alb_dns_name)/api/v1/auth/google/callback" \
  --type String

# CORS allowed origins — uses the CloudFront domain from terraform output
aws ssm put-parameter \
  --name /visioncraft/qa/api-gateway/allowed-origins \
  --value "https://$(terraform output -raw cloudfront_domain)" \
  --type String

# LaunchDarkly SDK key
aws ssm put-parameter \
  --name /visioncraft/qa/shared/launchdarkly-sdk-key \
  --value "<your-launchdarkly-qa-sdk-key>" \
  --type String
```

---

### Step 3 — ECR repositories and initial images

Build and push an initial image for each service so ECS can start the tasks for the first time:

```bash
# Log in to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $(terraform output -raw ecr_registry)

ECR=$(terraform output -raw ecr_registry)

# Build and push all 8 services (run from monorepo root)
for service in api-gateway auth-service user-service image-service notification-service analytics-service; do
  docker build -f services/$service/Dockerfile -t $ECR/visioncraft/$service:latest .
  docker push $ECR/visioncraft/$service:latest
done

# image-worker
docker build -f workers/image-worker/Dockerfile -t $ECR/visioncraft/image-worker:latest .
docker push $ECR/visioncraft/image-worker:latest

# ai-service (Python — build from ai-service/ directory)
docker build -f ai-service/Dockerfile -t $ECR/visioncraft/ai-service:latest ai-service/
docker push $ECR/visioncraft/ai-service:latest
```

After pushing initial images, run the initial database migration:

```bash
# Run prisma migrate deploy as a one-off ECS task
aws ecs run-task \
  --cluster visioncraft-qa \
  --task-definition visioncraft-qa-migration \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[PRIVATE_SUBNET_ID],securityGroups=[APP_SG_ID]}" \
  --overrides '{"containerOverrides":[{"name":"auth-service","command":["sh","-c","pnpm prisma migrate deploy"]}]}'
```

The subnet ID and security group ID are in the Terraform outputs.

---

### Step 4 — GitHub secrets

Go to your GitHub repo → **Settings** → **Environments** → **New environment** → name it `qa`.

Add the following secrets to the `qa` environment:

| Secret                            | Where to find it                                              |
| --------------------------------- | ------------------------------------------------------------- |
| `AWS_ACCOUNT_ID`                  | AWS console → top-right account menu                          |
| `AWS_REGION`                      | `us-east-1` (or your chosen region)                           |
| `ECR_REGISTRY`                    | `terraform output ecr_registry`                               |
| `ECS_CLUSTER_QA`                  | `visioncraft-qa`                                              |
| `ALB_QA_URL`                      | `https://$(terraform output alb_dns_name)`                    |
| `CF_DISTRIBUTION_ID_QA`           | `terraform output cloudfront_distribution_id`                 |
| `S3_FRONTEND_BUCKET_QA`           | `visioncraft-frontend-qa`                                     |
| `VITE_API_URL_QA`                 | Same as `ALB_QA_URL` above                                    |
| `VITE_LAUNCHDARKLY_CLIENT_KEY_QA` | LaunchDarkly QA client-side key                               |
| `VITE_SENTRY_DSN`                 | Your Sentry DSN                                               |
| `VITE_POSTHOG_KEY`                | Your PostHog key                                              |
| `TURBO_TOKEN`                     | Turborepo remote cache token (optional — speeds up CI builds) |
| `TURBO_TEAM`                      | Turborepo team slug (optional)                                |

> **No `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` needed.** The CI workflow uses GitHub OIDC to assume an IAM role (`visioncraft-github-actions-deploy`) provisioned by Terraform. This is more secure than long-lived credentials.

---

## Deploying to QA

Once the one-time setup is complete, deploy by pushing to the `qa` branch:

```bash
# First time — create the qa branch from main
git checkout main
git checkout -b qa
git push origin qa

# Subsequent deploys
git checkout qa
git merge main
git push origin qa
```

Or trigger a deploy without a code change:

**GitHub → Actions → Deploy QA → Run workflow → Run workflow**

The workflow takes approximately 8–12 minutes end to end. When it completes:

- All 8 services are running on `visioncraft-qa` ECS cluster
- The frontend is live at the CloudFront QA URL (printed in the `deploy-frontend` job output)
- The QA database has been migrated and seeded with test accounts
- All Playwright E2E tests have passed against the live URLs

---

## Running QA tests manually

To run Playwright tests against the live QA environment without triggering a full deploy:

```bash
pnpm install
pnpm exec playwright install --with-deps chromium firefox

# Run all E2E tests
BASE_URL=https://<cloudfront-qa-domain> pnpm test:e2e

# Run a single test file
BASE_URL=https://<cloudfront-qa-domain> pnpm exec playwright test e2e/auth.test.ts

# Open interactive Playwright UI
BASE_URL=https://<cloudfront-qa-domain> pnpm exec playwright test --ui

# Run on a single browser
BASE_URL=https://<cloudfront-qa-domain> pnpm exec playwright test --project=chromium
```

When `BASE_URL` is set, Playwright skips starting local services and runs directly against the live environment.

**Test accounts available after seeding:**

| Role      | Email               | Password      |
| --------- | ------------------- | ------------- |
| Free tier | `alice@example.com` | `password123` |
| Pro tier  | `bob@example.com`   | `password123` |
| Admin     | `admin@example.com` | `password123` |

---

## Monitoring a QA deployment

**Workflow status:**
GitHub → Actions → Deploy QA → select the latest run

**Playwright report:**
If any E2E test fails, download the `playwright-report` artifact from the workflow summary. It includes screenshots and full traces for every failed test.

**CloudWatch Logs (replaces `railway logs`):**

```bash
# Tail logs for a specific service
aws logs tail /ecs/visioncraft-qa/auth-service --follow
aws logs tail /ecs/visioncraft-qa/api-gateway --follow

# Or view in CloudWatch console:
# AWS Console → CloudWatch → Log groups → /ecs/visioncraft-qa/<service>
```

**Health checks:**

```bash
# Via ALB DNS name
curl https://<alb-qa-dns>/health

# Or via the CloudFront domain if api requests are proxied
curl https://<cf-qa-domain>/api/health
```

**ECS service status:**

```bash
aws ecs list-tasks --cluster visioncraft-qa --service-name auth-service
aws ecs describe-tasks --cluster visioncraft-qa --tasks <task-arn>
```

---

## Resetting the QA database

To wipe all QA data and re-seed fresh test accounts:

```bash
# Run prisma migrate reset as a one-off ECS task
aws ecs run-task \
  --cluster visioncraft-qa \
  --task-definition visioncraft-qa-migration \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[PRIVATE_SUBNET_ID],securityGroups=[APP_SG_ID]}" \
  --overrides '{"containerOverrides":[{"name":"auth-service","command":["sh","-c","pnpm prisma migrate reset --force && cd ../../infra/scripts && pnpm seed"]}]}'
```

> `prisma migrate reset` drops all data. Never run this against production.

Alternatively, re-run just the seed (wipes existing rows and re-inserts). The seed script is idempotent.

---

## Troubleshooting

### The `build-and-push` job fails — Docker build error

- Confirm you are running `docker build` from the monorepo root (`.`), not from the service directory
- Verify `pnpm-lock.yaml` is committed and up-to-date — the Dockerfile uses `--frozen-lockfile`
- Check if any new `packages/` dependency was added without running `pnpm install` first

### The health check poll times out

The workflow polls `ALB_QA_URL/health` for up to 5 minutes. If it times out:

- Check CloudWatch Logs for startup errors: `aws logs tail /ecs/visioncraft-qa/api-gateway --follow`
- Confirm all required secrets are populated in Secrets Manager (missing `JWT_PUBLIC_KEY` or service URLs are common causes)
- Confirm ECS tasks are in RUNNING state: `aws ecs list-tasks --cluster visioncraft-qa`
- Check the ALB target group health: AWS Console → EC2 → Target Groups → select QA target group

### Migrations fail — can't reach database

```
Error: P1001: Can't reach database server
```

- Confirm the ECS migration task is running in the private subnet (same VPC as RDS)
- Verify `visioncraft/qa/shared/database-url` secret has the correct RDS internal hostname
- The `DATABASE_URL` must use the RDS **internal** hostname (not a public endpoint) — RDS has no public access

### E2E tests fail — login returns 401

The seed script uses a bcrypt hash for `password123`. If the hash does not match:

```bash
# Re-run the seed via ECS one-off task (see Resetting section above)
```

If the problem persists, check that `auth-service` bcrypt compare logic matches the seed hash format (`$2b$12$...`).

### Frontend cannot reach the API — CORS error

Update the `ALLOWED_ORIGINS` SSM parameter to include the CloudFront domain:

```bash
aws ssm put-parameter \
  --name /visioncraft/qa/api-gateway/allowed-origins \
  --value "https://<cloudfront-qa-domain>" \
  --type String \
  --overwrite
```

Then force a new ECS deployment for api-gateway so it picks up the new value:

```bash
aws ecs update-service --cluster visioncraft-qa --service api-gateway --force-new-deployment
```

### GitHub OIDC authentication fails

- Verify the `visioncraft-github-actions-deploy` IAM role exists (created by Terraform)
- Confirm the role trust policy allows the correct GitHub repo and branch: `repo:your-org/visioncraft:environment:qa`
- Check that `aws-actions/configure-aws-credentials@v4` is using `role-to-assume` (not access keys)
