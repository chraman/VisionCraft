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

### Windows (primary dev OS)

**AWS CLI v2**

```powershell
winget install --id Amazon.AWSCLI
# Or download the MSI: https://awscli.amazonaws.com/AWSCLIV2.msi
```

**Terraform >= 1.6**

```powershell
winget install --id Hashicorp.Terraform
# Or download: https://releases.hashicorp.com/terraform/
```

**Docker Desktop** — https://docs.docker.com/get-docker/

**Restart your terminal after installing** so the updated PATH takes effect, then configure AWS:

```bash
aws configure
# AWS Access Key ID:     <your-access-key>
# AWS Secret Access Key: <your-secret-key>
# Default region name:   ap-south-1
# Default output format: json
```

### macOS / Linux

```bash
brew install awscli terraform   # macOS
# Linux: see https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html
#        and https://developer.hashicorp.com/terraform/install

aws configure   # region: ap-south-1
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
```

> **Windows — Terraform TLS fix:** Terraform's Go HTTP client may fail with a TLS handshake
> timeout against AWS endpoints on some Windows networks (error: `TLS handshake timeout` or
> `connectex: A connection attempt failed`). Fix it by setting `GODEBUG=tlskyber=0` in your
> terminal session before running any `terraform` command:
>
> **Git Bash:**
>
> ```bash
> export GODEBUG=tlskyber=0
> ```
>
> **PowerShell:**
>
> ```powershell
> $env:GODEBUG = "tlskyber=0"
> ```
>
> You only need this once per terminal session. This disables Go's experimental post-quantum
> TLS Kyber extension which conflicts with some Windows firewall/proxy setups.

```bash
# Review what will be created (pass all required variables)
terraform plan \
  -var="github_org=<your-github-org>" \
  -var="github_repo=<your-repo-name>" \
  -var="aws_account_id=<your-12-digit-account-id>" \
  -var="db_password=<strong-password>" \
  -var="ses_from_email=<ses-verified-email>"

# Apply — creates VPC, ECS cluster, RDS, ElastiCache, ALB, ECR repos, IAM roles,
#          S3 frontend bucket, CloudFront distribution, Secrets Manager stubs, SSM params
terraform apply \
  -var="github_org=<your-github-org>" \
  -var="github_repo=<your-repo-name>" \
  -var="aws_account_id=<your-12-digit-account-id>" \
  -var="db_password=<strong-password>" \
  -var="ses_from_email=<ses-verified-email>"
```

After `terraform apply` completes (~15–20 min), save the outputs — you will need them in the next steps:

```bash
terraform output alb_dns_name          # e.g. visioncraft-qa-alb-123456.ap-south-1.elb.amazonaws.com
terraform output cloudfront_domain     # e.g. d1abc123.cloudfront.net
terraform output ecr_registry          # e.g. 553138587052.dkr.ecr.ap-south-1.amazonaws.com
terraform output ecs_cluster_name      # visioncraft-qa
terraform output private_subnet_id     # subnet-xxxxxxxx
terraform output app_security_group_id # sg-xxxxxxxx
```

The ALB DNS name is your QA API endpoint. The CloudFront domain is your QA frontend URL.

---

### Step 2 — Secrets and parameters

Terraform creates Secrets Manager secrets and SSM parameters as empty stubs. Populate them with real values.

First, save your Terraform outputs to variables (run from `infra/terraform/environments/qa`):

```bash
ALB_DNS=$(terraform output -raw alb_dns_name)
CF_DOMAIN=$(terraform output -raw cloudfront_domain)
```

#### Secrets Manager (sensitive values)

```bash
# Database URL — replace RDS_ENDPOINT with value from: terraform output rds_endpoint
aws secretsmanager put-secret-value \
  --secret-id visioncraft/qa/shared/database-url \
  --secret-string "postgresql://visioncraft:PASSWORD@RDS_ENDPOINT:5432/aiplatform"

# Redis URL — replace ELASTICACHE_ENDPOINT with value from: terraform output elasticache_endpoint
aws secretsmanager put-secret-value \
  --secret-id visioncraft/qa/shared/redis-url \
  --secret-string "redis://ELASTICACHE_ENDPOINT:6379"

# JWT keys — generate fresh RS256 keys
openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in private.pem -out public.pem

# Read key files into variables first (works in Git Bash on Windows)
JWT_PRIVATE=$(cat private.pem)
JWT_PUBLIC=$(cat public.pem)

aws secretsmanager put-secret-value \
  --secret-id visioncraft/qa/auth-service/jwt-private-key \
  --secret-string "$JWT_PRIVATE"

aws secretsmanager put-secret-value \
  --secret-id visioncraft/qa/shared/jwt-public-key \
  --secret-string "$JWT_PUBLIC"

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
# Google OAuth callback URL
aws ssm put-parameter \
  --name /visioncraft/qa/auth-service/google-callback-url \
  --value "https://$ALB_DNS/api/v1/auth/google/callback" \
  --type String

# CORS allowed origins
aws ssm put-parameter \
  --name /visioncraft/qa/api-gateway/allowed-origins \
  --value "https://$CF_DOMAIN" \
  --type String

# LaunchDarkly SDK key
aws ssm put-parameter \
  --name /visioncraft/qa/shared/launchdarkly-sdk-key \
  --value "<your-launchdarkly-qa-sdk-key>" \
  --type String
```

---

### Step 3 — ECR repositories and initial images

Build and push an initial image for each service so ECS can start the tasks for the first time.

Run all commands from the **monorepo root** (`C:\Projects\VisionCraft`):

```bash
# Save ECR registry URL
ECR=$(terraform -chdir=infra/terraform/environments/qa output -raw ecr_registry)

# Log in to ECR
aws ecr get-login-password --region ap-south-1 | \
  docker login --username AWS --password-stdin "$ECR"

# Build and push all Node.js services
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

> **Windows note:** The `for` loop above works in Git Bash. If you're using PowerShell, use:
>
> ```powershell
> $ECR = terraform -chdir infra/terraform/environments/qa output -raw ecr_registry
> foreach ($service in @("api-gateway","auth-service","user-service","image-service","notification-service","analytics-service")) {
>   docker build -f services/$service/Dockerfile -t "$ECR/visioncraft/${service}:latest" .
>   docker push "$ECR/visioncraft/${service}:latest"
> }
> ```

After pushing initial images, run the initial database migration:

```bash
# Retrieve subnet and security group from Terraform outputs
SUBNET=$(terraform -chdir=infra/terraform/environments/qa output -raw private_subnet_id)
SG=$(terraform -chdir=infra/terraform/environments/qa output -raw app_security_group_id)

aws ecs run-task \
  --cluster visioncraft-qa \
  --task-definition visioncraft-qa-auth-service \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET],securityGroups=[$SG],assignPublicIp=DISABLED}" \
  --overrides '{"containerOverrides":[{"name":"auth-service","command":["sh","-c","pnpm prisma migrate deploy"]}]}'
```

---

### Step 4 — GitHub secrets

Go to your GitHub repo → **Settings** → **Environments** → **New environment** → name it `qa`.

Add the following secrets to the `qa` environment:

| Secret                            | Where to find it                                              |
| --------------------------------- | ------------------------------------------------------------- |
| `AWS_ACCOUNT_ID`                  | AWS console → top-right account menu                          |
| `AWS_REGION`                      | `ap-south-1`                                                  |
| `ECR_REGISTRY`                    | `terraform output ecr_registry`                               |
| `ECS_CLUSTER_QA`                  | `visioncraft-qa`                                              |
| `ALB_QA_URL`                      | `https://<value of terraform output alb_dns_name>`            |
| `CF_DISTRIBUTION_ID_QA`           | `terraform output cloudfront_distribution_id`                 |
| `S3_FRONTEND_BUCKET_QA`           | `visioncraft-frontend-qa`                                     |
| `VITE_API_URL_QA`                 | Same as `ALB_QA_URL` above                                    |
| `VITE_LAUNCHDARKLY_CLIENT_KEY_QA` | LaunchDarkly QA client-side key                               |
| `VITE_SENTRY_DSN`                 | Your Sentry DSN                                               |
| `VITE_POSTHOG_KEY`                | Your PostHog key                                              |
| `ECS_PRIVATE_SUBNET_QA`           | `terraform output private_subnet_id`                          |
| `ECS_APP_SG_QA`                   | `terraform output app_security_group_id`                      |
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

# Set the base URL first (Git Bash / macOS / Linux)
export BASE_URL=https://<cloudfront-qa-domain>

# Run all E2E tests
pnpm test:e2e

# Run a single test file
pnpm exec playwright test e2e/auth.test.ts

# Open interactive Playwright UI
pnpm exec playwright test --ui

# Run on a single browser
pnpm exec playwright test --project=chromium
```

> **Windows PowerShell:** Use `$env:BASE_URL = "https://<cloudfront-qa-domain>"` instead of `export`.

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

**CloudWatch Logs:**

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
SUBNET=$(terraform -chdir=infra/terraform/environments/qa output -raw private_subnet_id)
SG=$(terraform -chdir=infra/terraform/environments/qa output -raw app_security_group_id)

aws ecs run-task \
  --cluster visioncraft-qa \
  --task-definition visioncraft-qa-auth-service \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET],securityGroups=[$SG],assignPublicIp=DISABLED}" \
  --overrides '{"containerOverrides":[{"name":"auth-service","command":["sh","-c","pnpm prisma migrate reset --force && cd ../../infra/scripts && pnpm seed"]}]}'
```

> `prisma migrate reset` drops all data. Never run this against production.

Alternatively, re-run just the seed (wipes existing rows and re-inserts). The seed script is idempotent.

---

## Troubleshooting

### Terraform fails — TLS handshake timeout (Windows)

See the [Terraform TLS fix](#step-1--terraform-infrastructure) note in Step 1. Run `export GODEBUG=tlskyber=0` (Git Bash) or `$env:GODEBUG = "tlskyber=0"` (PowerShell) before any `terraform` command.

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
