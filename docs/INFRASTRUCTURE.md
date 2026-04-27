# VisionCraft Infrastructure Guide

> **Who is this for?** Anyone working on VisionCraft who wants to understand what AWS resources exist, why they exist, and how Terraform creates them — even if you have never used AWS or Terraform before.
>
> **Companion files:** `infra/terraform/environments/qa/` (entry point) · `infra/terraform/modules/` (building blocks) · `docs/QA_DEPLOYMENT.md` (step-by-step deploy guide)

---

## Table of Contents

1. [The big picture](#1-the-big-picture)
2. [What is Terraform?](#2-what-is-terraform)
3. [File layout](#3-file-layout)
4. [AWS resources — module by module](#4-aws-resources--module-by-module)
   - [4.1 Networking — VPC](#41-networking--vpc)
   - [4.2 Docker image storage — ECR](#42-docker-image-storage--ecr)
   - [4.3 Container orchestration — ECS Cluster](#43-container-orchestration--ecs-cluster)
   - [4.4 Each microservice — ECS Service](#44-each-microservice--ecs-service)
   - [4.5 Database — RDS PostgreSQL](#45-database--rds-postgresql)
   - [4.6 Cache and job queue — ElastiCache Redis](#46-cache-and-job-queue--elasticache-redis)
   - [4.7 Public entry point — ALB](#47-public-entry-point--alb)
   - [4.8 Frontend hosting — S3 + CloudFront](#48-frontend-hosting--s3--cloudfront)
   - [4.9 Permissions — IAM](#49-permissions--iam)
   - [4.10 Secrets and config — Secrets Manager + SSM](#410-secrets-and-config--secrets-manager--ssm)
5. [How the modules connect](#5-how-the-modules-connect)
6. [Request flows](#6-request-flows)
7. [Terraform commands reference](#7-terraform-commands-reference)
8. [State backend — why it matters](#8-state-backend--why-it-matters)
9. [Monthly cost estimate](#9-monthly-cost-estimate)

---

## 1. The big picture

VisionCraft runs **8 backend services** on AWS ECS Fargate (serverless containers), stores data in **RDS PostgreSQL** and **ElastiCache Redis**, and serves the React frontend from **S3 + CloudFront**. Terraform provisions all of it from code.

```
                        ┌─────────────────────────────────────────────────────┐
                        │                     INTERNET                         │
                        └─────────────┬───────────────────┬───────────────────┘
                                      │ HTTPS              │ (React SPA)
                                      │                    │
                           ┌──────────▼────────┐  ┌───────▼──────────────────┐
                           │  ALB (Load        │  │  CloudFront CDN          │
                           │  Balancer)        │  │  + S3 bucket             │
                           │  Public HTTPS     │  │  visioncraft-frontend-qa │
                           │  :443 → :3000     │  └──────────────────────────┘
                           └──────────┬────────┘
                                      │
                    ┌─────────────────▼───────────────────────────────────────┐
                    │         VPC  10.0.0.0/16  (private network)             │
                    │                                                          │
                    │   ┌──────────────────────────────────────────────────┐  │
                    │   │    ECS Cluster "visioncraft-qa" (Fargate)        │  │
                    │   │    Service Connect namespace: *.internal          │  │
                    │   │                                                   │  │
                    │   │  api-gateway        :3000  (only public service)  │  │
                    │   │  auth-service       :3001  (JWT, Google OAuth)    │  │
                    │   │  user-service       :3002  (profiles, quotas)     │  │
                    │   │  image-service      :3003  (job CRUD, S3 URLs)    │  │
                    │   │  notification-service:3004 (email, SSE)           │  │
                    │   │  analytics-service  :3005  (event ingestion)      │  │
                    │   │  image-worker       :3006  (BullMQ consumer)      │  │
                    │   │  ai-service         :8000  (FastAPI, Stability AI) │  │
                    │   └────┬──────────┬────────────────┬─────────────────┘  │
                    │        │          │                 │                     │
                    │  ┌─────▼──┐  ┌───▼──────────┐  ┌──▼──────────────────┐ │
                    │  │  RDS   │  │ ElastiCache  │  │  S3 Image Buckets   │ │
                    │  │Postgres│  │  Redis :6379  │  │ qa-ai-images-       │ │
                    │  │ :5432  │  │  (queue,      │  │ generated           │ │
                    │  │        │  │  rate limit,  │  │ qa-ai-images-       │ │
                    │  │        │  │  sessions)    │  │ uploads             │ │
                    │  └────────┘  └──────────────┘  └─────────────────────┘ │
                    └─────────────────────────────────────────────────────────┘

GitHub Actions (CI/CD):                    AWS Secrets Manager + SSM:
  push to `qa` branch                        injected into containers at startup
       │                                     - DATABASE_URL
       ▼                                     - JWT private/public key
  Build Docker images                        - Google OAuth credentials
       │                                     - AI provider API keys
       ▼
  Push to ECR (8 repos)
       │
       ▼
  Update ECS services (rolling deploy)
       │
       ▼
  Upload frontend to S3 → CloudFront invalidation
```

---

## 2. What is Terraform?

**Terraform is Infrastructure as Code** — instead of clicking around the AWS console to create servers, databases, and load balancers, you write files that _describe_ what you want, and Terraform creates it for you.

The key workflow is three commands:

```bash
terraform init    # Set up Terraform (downloads AWS plugin, connects to state storage)
terraform plan    # Preview what will be created/changed/deleted (no real changes yet)
terraform apply   # Actually create or update the real AWS resources
```

Terraform remembers everything it created in a **state file** — a JSON file stored in an S3 bucket (`visioncraft-terraform-state`). This lets it know what already exists so it doesn't try to create duplicates. A DynamoDB table (`visioncraft-terraform-locks`) acts as a lock so two people can't run `terraform apply` at the same time and corrupt the state.

These two AWS resources (the S3 bucket and DynamoDB table) must be created **manually before** running `terraform init` for the first time — see `docs/QA_DEPLOYMENT.md` for the one-time setup commands.

See: `infra/terraform/environments/qa/backend.tf`

---

## 3. File layout

```
infra/terraform/
│
├── environments/
│   └── qa/                        ← Entry point — run terraform commands from here
│       ├── main.tf                ← Calls all modules and wires them together
│       ├── variables.tf           ← Input values (region, GitHub org, DB password…)
│       ├── outputs.tf             ← Values printed after apply (ALB URL, ECR registry…)
│       ├── backend.tf             ← Where Terraform stores its state (S3 + DynamoDB)
│       └── .terraform.lock.hcl   ← Pinned provider versions (committed to git)
│
└── modules/                       ← Reusable building blocks (called from main.tf)
    ├── vpc/main.tf                ← Private network, subnets, firewalls
    ├── ecr/main.tf                ← Docker image registries (one per service)
    ├── ecs-cluster/main.tf        ← ECS cluster + internal DNS namespace
    ├── ecs-service/main.tf        ← Reusable: one service → task + service + logs
    ├── rds/main.tf                ← PostgreSQL 16 database
    ├── elasticache/main.tf        ← Redis 7 cache
    ├── alb/main.tf                ← Application Load Balancer (public HTTPS entry)
    ├── s3-frontend/main.tf        ← S3 bucket + CloudFront for React SPA
    ├── iam/main.tf                ← IAM roles and permissions
    └── secrets/main.tf            ← Secrets Manager + SSM Parameter Store stubs
```

`environments/qa/main.tf` is the **only file you need to read** to understand the whole system — it calls every module and shows how they connect. The modules themselves are the implementation details.

---

## 4. AWS resources — module by module

---

### 4.1 Networking — VPC

**File:** `infra/terraform/modules/vpc/main.tf`
**Called from:** `module "vpc"` in `environments/qa/main.tf`

#### What is a VPC?

A **VPC (Virtual Private Cloud)** is a private, isolated network inside AWS — like renting a section of the internet that only your resources can use. Everything VisionCraft runs is inside one VPC (`10.0.0.0/16`) so services can talk to each other over a private network without going through the public internet.

#### Why VisionCraft needs it

Without a VPC, all services would be exposed to the public internet. The VPC lets us put databases and services on a **private subnet** (no public internet access) while only the load balancer sits on a **public subnet** (internet-accessible). This is standard security practice.

#### What gets created

| Resource             | CIDR / Detail         | Purpose                                             |
| -------------------- | --------------------- | --------------------------------------------------- |
| **VPC**              | `10.0.0.0/16`         | The private network container for everything        |
| **Public Subnet 1**  | `10.0.1.0/24` (AZ-a)  | ALB lives here — has direct internet access         |
| **Public Subnet 2**  | `10.0.2.0/24` (AZ-b)  | Second AZ for ALB high availability                 |
| **Private Subnet 1** | `10.0.11.0/24` (AZ-a) | All 8 services, RDS, Redis — no direct internet     |
| **Private Subnet 2** | `10.0.12.0/24` (AZ-b) | Second AZ for RDS + ElastiCache                     |
| **Internet Gateway** | —                     | Connects public subnets to the internet             |
| **NAT Gateway**      | In public subnet 1    | Private subnet outbound internet via masqueraded IP |
| **Elastic IP**       | —                     | Static IP address for the NAT gateway               |
| **Route Tables**     | Public + Private      | Public → Internet Gateway; Private → NAT Gateway    |

#### Security Groups (the firewalls)

Security Groups are **stateful firewalls** — you define which traffic is allowed in (ingress) and the response traffic is automatically allowed out.

| Security Group | Allows IN                                  | Purpose                              |
| -------------- | ------------------------------------------ | ------------------------------------ |
| `alb-sg`       | Port 80 + 443 from anywhere (`0.0.0.0/0`)  | Internet → ALB only                  |
| `app-sg`       | All TCP from `alb-sg`; all TCP from itself | ALB → services; services → services  |
| `rds-sg`       | Port 5432 from `app-sg` only               | Only services can reach the database |
| `redis-sg`     | Port 6379 from `app-sg` only               | Only services can reach Redis        |

The `app-sg` rule "all TCP from itself" is what allows services to call each other internally (e.g., api-gateway calling auth-service) — they all share the same security group.

---

### 4.2 Docker image storage — ECR

**File:** `infra/terraform/modules/ecr/main.tf`
**Called from:** `module "ecr"` in `environments/qa/main.tf`

#### What is ECR?

**ECR (Elastic Container Registry)** is AWS's private Docker registry — like Docker Hub, but private and inside your AWS account. When you run `docker push`, the image goes here. When ECS starts a container, it pulls the image from here.

#### Why VisionCraft needs it

ECS needs to pull Docker images from somewhere. We use ECR instead of Docker Hub because:

- It's inside our AWS account — no credentials needed (ECS has IAM permission)
- Images stay private
- It's in the same AWS region, so pulls are fast

#### What gets created

8 ECR repositories — one per service:

| Repository                         | What service uses it                               |
| ---------------------------------- | -------------------------------------------------- |
| `visioncraft/api-gateway`          | BFF — only public-facing backend service           |
| `visioncraft/auth-service`         | JWT signing, Google OAuth, session management      |
| `visioncraft/user-service`         | User profiles, quota engine, subscription tiers    |
| `visioncraft/image-service`        | Image job CRUD, S3 presigned URLs, collections     |
| `visioncraft/notification-service` | Email (AWS SES), Server-Sent Events                |
| `visioncraft/analytics-service`    | Analytics event ingestion                          |
| `visioncraft/image-worker`         | BullMQ worker — consumes the generation job queue  |
| `visioncraft/ai-service`           | FastAPI Python — Stability AI, OpenAI, HuggingFace |

**Lifecycle policy on every repo:** automatically deletes images older than the last 10 — keeps storage costs down without manual cleanup.

---

### 4.3 Container orchestration — ECS Cluster

**File:** `infra/terraform/modules/ecs-cluster/main.tf`
**Called from:** `module "ecs_cluster"` in `environments/qa/main.tf`

#### What is ECS?

**ECS (Elastic Container Service)** is AWS's system for running Docker containers. You tell it "run this Docker image, give it 512 MB of RAM, restart it if it crashes" — ECS handles the rest. We use **Fargate** launch type, which means AWS manages the underlying servers too — we never touch a VM.

#### What gets created

| Resource                      | Detail                 | Purpose                                              |
| ----------------------------- | ---------------------- | ---------------------------------------------------- |
| **ECS Cluster**               | Name: `visioncraft-qa` | Logical grouping that holds all 8 services           |
| **Container Insights**        | Enabled                | Sends CPU/memory metrics to CloudWatch automatically |
| **Service Connect namespace** | Name: `internal`       | Enables internal DNS for service discovery           |

#### Service Connect — how services find each other

Without Service Connect, services would need to know each other's IP addresses, which change every time a container restarts. Service Connect registers each service under a DNS name so:

- `api-gateway` calls `http://auth-service:3001` — works forever, even after restarts
- `image-worker` calls `http://ai-service:8000` — same thing
- No hard-coded IPs, no service registries, just DNS

> **Hostname format:** Service Connect uses the plain service name as the DNS alias (e.g. `auth-service`, not `auth-service.internal`). The namespace is named `internal` in Cloud Map, but that is only an organisational label — the Envoy sidecar intercepts connections to the short name. Set `AUTH_SERVICE_URL=http://auth-service:3001`, not `http://auth-service.internal:3001`.

---

### 4.4 Each microservice — ECS Service

**File:** `infra/terraform/modules/ecs-service/main.tf`
**Called from:** 8 separate `module "xxx_service"` blocks in `environments/qa/main.tf`

This is a **reusable module** — `environments/qa/main.tf` calls it 8 times, once for each service, passing different values (image name, port, environment variables, secrets).

#### What gets created per service call

| Resource                 | Detail                                                          | Purpose                                        |
| ------------------------ | --------------------------------------------------------------- | ---------------------------------------------- |
| **CloudWatch Log Group** | `/ecs/visioncraft-qa/{service-name}` · 14-day retention         | Container stdout/stderr goes here              |
| **ECS Task Definition**  | Blueprint: image URI, CPU, RAM, env vars, secrets, health check | Describes exactly how to run one container     |
| **ECS Service**          | Desired count: 1; rolling deploy config                         | Keeps N copies running; replaces crashed tasks |

#### Task Definition — what each container gets

```
image:       553138587052.dkr.ecr.ap-south-1.amazonaws.com/visioncraft/{service}:latest
cpu:         256 (= 0.25 vCPU)     ← ai-service gets 512
memory:      512 MB                ← ai-service gets 1024 MB
port:        {service port}
health check: curl http://localhost:{port}/health   (every 30s)
```

**Environment variables** (non-sensitive, set directly in Terraform):

```
SERVICE_NAME, NODE_ENV=production, APP_ENV=qa, PORT
AWS_REGION=ap-south-1
# Service-specific:
AWS_BUCKET_GENERATED=qa-ai-images-generated   (image-service, image-worker)
AUTH_SERVICE_URL=http://auth-service:3001   (api-gateway — plain name, no .internal suffix)
... etc.
```

**Secrets** (sensitive, fetched from Secrets Manager at startup — never in source code):

```
DATABASE_URL  → visioncraft/qa/shared/database-url
REDIS_URL     → visioncraft/qa/shared/redis-url
JWT_PRIVATE_KEY → visioncraft/qa/auth-service/jwt-private-key
... etc.
```

#### Rolling deploy — how updates work

When GitHub Actions pushes a new image and updates the ECS service:

1. ECS launches new containers with the new image
2. Waits for their health check to pass
3. Only then drains traffic from the old containers
4. Old containers stop

The `lifecycle { ignore_changes = [task_definition, desired_count] }` block means Terraform hands off deployment control to GitHub Actions — Terraform only creates/updates ECS services, GitHub Actions manages the actual rollouts.

---

### 4.5 Database — RDS PostgreSQL

**File:** `infra/terraform/modules/rds/main.tf`
**Called from:** `module "rds"` in `environments/qa/main.tf`

#### What is RDS?

**RDS (Relational Database Service)** is AWS's managed PostgreSQL — AWS handles installation, patching, backups, and failover. You just connect to it like any PostgreSQL database.

#### Why VisionCraft needs it

All 6 Node.js services share one PostgreSQL 16 database. The Prisma ORM manages the schema via migrations. All user data, images, jobs, and sessions are stored here.

#### What gets created

| Resource            | Detail                             | Purpose                       |
| ------------------- | ---------------------------------- | ----------------------------- |
| **DB Subnet Group** | Both private subnets (AZ-a + AZ-b) | RDS can fail over between AZs |
| **RDS Instance**    | See details below                  | The actual database           |

**Database details:**

| Setting        | Value                            | Why                                               |
| -------------- | -------------------------------- | ------------------------------------------------- |
| Engine         | PostgreSQL 16.6                  | Latest stable, matches Prisma support             |
| Instance class | `db.t3.micro`                    | Small burstable instance — fine for QA            |
| Storage        | 20 GB gp3, auto-scales to 100 GB | Encrypted at rest                                 |
| Database name  | `aiplatform`                     | Single DB, multiple schemas                       |
| Master user    | `visioncraft`                    | Prisma migrations run as this user                |
| Security group | `rds-sg`                         | Only ECS services on `app-sg` can reach port 5432 |
| Backups        | 7-day retention                  | Automated nightly snapshots                       |
| Public access  | `false`                          | No internet route to the database                 |
| Final snapshot | Skipped (QA)                     | Faster teardown; production requires a snapshot   |

**Connection string format:**

```
postgresql://visioncraft:PASSWORD@visioncraft-qa.xxxx.ap-south-1.rds.amazonaws.com:5432/aiplatform
```

This is stored in Secrets Manager as `visioncraft/qa/shared/database-url` and injected into every service container at startup.

---

### 4.6 Cache and job queue — ElastiCache Redis

**File:** `infra/terraform/modules/elasticache/main.tf`
**Called from:** `module "elasticache"` in `environments/qa/main.tf`

#### What is ElastiCache?

**ElastiCache** is AWS's managed Redis — a fast in-memory key-value store. Like RDS, AWS manages patching and failover. Redis is much faster than a database for temporary data because it keeps everything in RAM.

#### Why VisionCraft needs it

Redis does four jobs in VisionCraft:

| Job                        | Redis key pattern            | TTL            |
| -------------------------- | ---------------------------- | -------------- |
| Image generation job queue | BullMQ internal keys         | Until consumed |
| Rate limiting              | `ratelimit:{userId}:{route}` | 1 hour         |
| Session presence           | `session:{userId}`           | 15 minutes     |
| Feature flag cache         | `flag:cache:{userId}`        | 5 minutes      |

#### What gets created

| Resource                     | Detail                      | Purpose                   |
| ---------------------------- | --------------------------- | ------------------------- |
| **ElastiCache Subnet Group** | Both private subnets        | Multi-AZ awareness        |
| **Replication Group**        | 1 node (primary), Redis 7.1 | The actual Redis instance |

**Redis details:**

| Setting               | Value            | Why                                                    |
| --------------------- | ---------------- | ------------------------------------------------------ |
| Node type             | `cache.t3.micro` | Small, burstable — fine for QA                         |
| Port                  | 6379             | Standard Redis port                                    |
| Encryption at rest    | Enabled          | Data encrypted on disk                                 |
| Encryption in transit | **Disabled**     | Allows plain `redis://` URL — simpler; enable for prod |
| Security group        | `redis-sg`       | Only ECS services can reach port 6379                  |

**Connection string format:**

```
redis://visioncraft-qa.xxxx.ng.0001.aps1.cache.amazonaws.com:6379
```

Stored in Secrets Manager as `visioncraft/qa/shared/redis-url`.

---

### 4.7 Public entry point — ALB

**File:** `infra/terraform/modules/alb/main.tf`
**Called from:** `module "alb"` in `environments/qa/main.tf`

#### What is an ALB?

An **ALB (Application Load Balancer)** is a managed reverse proxy that sits between the internet and your services. It receives HTTPS requests from browsers, decrypts the TLS, and forwards plain HTTP to the correct service internally.

#### Why VisionCraft needs it

Only `api-gateway` should be reachable from the internet — all other services communicate internally. The ALB is the single public entry point for all backend API traffic. It also handles:

- **TLS termination** — decrypts HTTPS so services don't need to manage certificates
- **HTTP → HTTPS redirect** — automatically upgrades any HTTP request to HTTPS
- **Health checking** — stops sending traffic to unhealthy containers

#### What gets created

| Resource                      | Detail                                | Purpose                            |
| ----------------------------- | ------------------------------------- | ---------------------------------- |
| **Application Load Balancer** | Public-facing, in both public subnets | Receives internet traffic          |
| **Target Group**              | Port 3000, protocol HTTP, type IP     | Routes to api-gateway ECS task IPs |
| **HTTP Listener** (port 80)   | Redirect action → HTTPS 301           | Forces HTTPS                       |
| **HTTPS Listener** (port 443) | Forwards to target group; TLS 1.2+1.3 | Serves API traffic                 |

**Health check:** Every 30 seconds, the ALB calls `GET http://{api-gateway-task-ip}:3000/health`.

- 2 successes → task marked healthy → receives traffic
- 3 failures → task marked unhealthy → ECS replaces it

**ALB DNS name** (printed by `terraform output alb_dns_name`):

```
visioncraft-qa-123456.ap-south-1.elb.amazonaws.com
```

This becomes your QA API base URL (set as `ALB_QA_URL` GitHub secret).

---

### 4.8 Frontend hosting — S3 + CloudFront

**File:** `infra/terraform/modules/s3-frontend/main.tf`
**Called from:** `module "s3_frontend"` in `environments/qa/main.tf`

#### What is S3 + CloudFront?

**S3 (Simple Storage Service)** is object storage — like a hard drive in the cloud. For a React app, we build it to static files (`index.html`, JS, CSS) and upload them to S3.

**CloudFront** is AWS's CDN (Content Delivery Network) — it caches your S3 files at dozens of edge locations worldwide so users get them from a nearby server (fast) rather than from the S3 bucket directly (slower, expensive at scale).

#### Why VisionCraft needs it

The React app is a SPA (Single Page Application) — one `index.html` file plus JavaScript. Serving it from S3 + CloudFront is cheaper, faster, and simpler than running a web server.

#### What gets created

| Resource                    | Detail                                              | Purpose                                    |
| --------------------------- | --------------------------------------------------- | ------------------------------------------ |
| **S3 Bucket**               | `visioncraft-frontend-qa` · block all public access | Stores built React app                     |
| **CloudFront OAC**          | Origin Access Control                               | Only CloudFront (not internet) can read S3 |
| **CloudFront Distribution** | Origin: S3 bucket · Default root: `index.html`      | CDN: caches and serves files globally      |
| **S3 Bucket Policy**        | Allows `s3:GetObject` from CloudFront OAC only      | Enforces OAC — direct S3 URLs return 403   |

**SPA routing fix:** When a user visits `https://d123.cloudfront.net/gallery`, React Router handles that route — but S3 has no file called `/gallery`. Without a fix, CloudFront returns 403 (file not found in S3). The fix: return `index.html` with HTTP 200 for any 403/404 response. React Router then handles the route in the browser.

**Caching strategy:**

- `index.html`: short TTL (it changes on every deploy)
- JS/CSS bundles (e.g., `main.a1b2c3.js`): 1-year TTL (the hash in the filename changes when content changes, so old caches are busted automatically)

After every deploy, GitHub Actions runs `aws cloudfront create-invalidation` to force CloudFront to re-fetch `index.html` from S3 immediately.

**CloudFront domain** (printed by `terraform output cloudfront_domain`):

```
d1abc123.cloudfront.net
```

---

### 4.9 Permissions — IAM

**File:** `infra/terraform/modules/iam/main.tf`
**Called from:** `module "iam"` in `environments/qa/main.tf`

#### What is IAM?

**IAM (Identity and Access Management)** is AWS's permission system. Every action in AWS (read a secret, push to ECR, update a service) must be authorized by an IAM policy. IAM Roles are like job titles with a list of what that job is allowed to do.

#### Three roles VisionCraft needs

---

**Role 1: GitHub Actions (`visioncraft-github-actions-deploy`)**

GitHub Actions needs to push Docker images and update ECS — but we don't want to store long-lived AWS credentials in GitHub (security risk). Instead, we use **OIDC (OpenID Connect)**: GitHub generates a short-lived token for each workflow run, and AWS exchanges it for temporary credentials.

Terraform creates an **IAM OIDC Provider** that trusts `token.actions.githubusercontent.com` (GitHub's token issuer). The trust policy restricts this to only the `chraman/VisionCraft` repo on the `qa` environment.

What GitHub Actions can do with this role:

```
ECR:   GetAuthorizationToken, BatchCheckLayerAvailability, PutImage, ...  (push images)
ECS:   RegisterTaskDefinition, UpdateService, RunTask, DescribeServices...  (deploy)
IAM:   PassRole (needed to assign task roles to new task definitions)
S3:    PutObject, DeleteObject, GetObject, ListBucket  (sync frontend)
CloudFront: CreateInvalidation  (bust cache after frontend deploy)
```

---

**Role 2: ECS Task Execution (`visioncraft-qa-ecs-task-execution`)**

This role is assumed by the **AWS ECS agent** (not your code) when starting a container. It needs permission to:

- Pull the Docker image from ECR
- Fetch secrets from Secrets Manager and SSM (to inject into the container as env vars)
- Write container logs to CloudWatch

Permissions are restricted to `visioncraft/qa/*` secrets — the role can't read production secrets.

---

**Role 3: ECS Task (`visioncraft-qa-ecs-task`)**

This role is assumed by **your application code** while it's running inside the container. It gives the app permission to use other AWS services.

What the application can do:

```
S3:   PutObject, GetObject, DeleteObject on qa-ai-images-* buckets  (store/serve images)
SES:  SendEmail, SendRawEmail  (notification-service sends transactional emails)
```

The app cannot read secrets, touch other accounts' S3 buckets, or do anything else — least-privilege by default.

---

### 4.10 Secrets and config — Secrets Manager + SSM

**File:** `infra/terraform/modules/secrets/main.tf`
**Called from:** `module "secrets"` in `environments/qa/main.tf`

#### What are Secrets Manager and SSM?

**AWS Secrets Manager** stores sensitive values encrypted at rest — API keys, database passwords, JWT private keys. Each secret is accessed via ARN and the ECS task execution role fetches them at container startup.

**AWS SSM Parameter Store** stores non-sensitive configuration values — simpler and cheaper than Secrets Manager for things like URLs and feature flag keys.

#### Why not just use environment variables in Terraform?

If we put secrets in Terraform, they'd appear in the Terraform state file (which is readable). Secrets Manager and SSM keep secrets out of state files and out of source code entirely.

#### What Terraform creates (stubs)

Terraform creates **empty placeholder stubs** — the infrastructure exists, but values are populated manually after `terraform apply` (Step 2 of `docs/QA_DEPLOYMENT.md`).

**Secrets Manager (sensitive):**

| Secret Name                                        | Injected as            | Set by                                |
| -------------------------------------------------- | ---------------------- | ------------------------------------- |
| `visioncraft/qa/shared/database-url`               | `DATABASE_URL`         | `aws secretsmanager put-secret-value` |
| `visioncraft/qa/shared/redis-url`                  | `REDIS_URL`            | `aws secretsmanager put-secret-value` |
| `visioncraft/qa/shared/jwt-public-key`             | `JWT_PUBLIC_KEY`       | `openssl` + `aws secretsmanager`      |
| `visioncraft/qa/auth-service/jwt-private-key`      | `JWT_PRIVATE_KEY`      | `openssl` + `aws secretsmanager`      |
| `visioncraft/qa/auth-service/google-client-id`     | `GOOGLE_CLIENT_ID`     | Google Cloud Console                  |
| `visioncraft/qa/auth-service/google-client-secret` | `GOOGLE_CLIENT_SECRET` | Google Cloud Console                  |
| `visioncraft/qa/ai-service/stability-api-key`      | `STABILITY_API_KEY`    | Stability AI dashboard                |
| `visioncraft/qa/ai-service/openai-api-key`         | `OPENAI_API_KEY`       | OpenAI dashboard                      |

**SSM Parameter Store (non-sensitive):**

| Parameter Name                                     | Value (example)                                 |
| -------------------------------------------------- | ----------------------------------------------- |
| `/visioncraft/qa/auth-service/google-callback-url` | `https://{ALB_DNS}/api/v1/auth/google/callback` |
| `/visioncraft/qa/api-gateway/allowed-origins`      | `https://{cloudfront_domain}`                   |
| `/visioncraft/qa/shared/launchdarkly-sdk-key`      | LaunchDarkly QA server-side key                 |

#### How secrets get into containers

```
1. terraform apply creates the secret stub in Secrets Manager
2. Operator populates the secret value manually
3. ECS task definition references the secret ARN:
     "secrets": [{ "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:..." }]
4. When ECS starts a new container task:
     - ECS task execution role calls GetSecretValue on Secrets Manager
     - AWS decrypts the value and injects it as the DATABASE_URL environment variable
     - The application code reads process.env.DATABASE_URL — never sees the ARN
5. The secret value is never written to logs, state files, or source code
```

---

## 5. How the modules connect

`environments/qa/main.tf` is the wiring harness — it calls every module and passes outputs from one as inputs to another. Here is how data flows between modules:

```
module.vpc
  .vpc_id              → module.alb.var.vpc_id
  .public_subnet_ids   → module.alb.var.public_subnet_ids
  .private_subnet_ids  → module.rds.var.private_subnet_ids
  .private_subnet_ids  → module.elasticache.var.private_subnet_ids
  .private_subnet_ids  → module.ecs_service[*].var.private_subnet_ids
  .private_subnet_id   → environments/qa/outputs.tf (for ECS one-off tasks)
  .alb_sg_id           → module.alb.var.alb_sg_id
  .app_sg_id           → module.ecs_service[*].var.app_sg_id
  .app_sg_id           → environments/qa/outputs.tf (for ECS one-off tasks)
  .rds_sg_id           → module.rds.var.rds_sg_id
  .redis_sg_id         → module.elasticache.var.redis_sg_id

module.iam
  .execution_role_arn  → module.ecs_service[*].var.execution_role_arn
  .task_role_arn       → module.ecs_service[*].var.task_role_arn
  .github_actions_role_arn → environments/qa/outputs.tf

module.ecr
  .registry_url        → environments/qa/outputs.tf (GitHub secret ECR_REGISTRY)
  .repository_urls[service] → module.ecs_service[service].var.image_uri

module.ecs_cluster
  .cluster_arn         → module.ecs_service[*].var.cluster_arn
  .namespace_arn       → module.ecs_service[*].var.service_connect_namespace_arn

module.secrets
  .secret_arns         → module.ecs_service[*].var.secrets (as map of name→ARN)

module.alb
  .api_gateway_tg_arn  → module.api_gateway.var.target_group_arn (only api-gateway)

module.rds
  .endpoint            → environments/qa/outputs.tf (to build DATABASE_URL)

module.elasticache
  .primary_endpoint    → environments/qa/outputs.tf (to build REDIS_URL)

module.s3_frontend
  .bucket_name         → environments/qa/outputs.tf (GitHub secret S3_FRONTEND_BUCKET_QA)
  .cloudfront_domain   → environments/qa/outputs.tf
  .distribution_id     → environments/qa/outputs.tf (GitHub secret CF_DISTRIBUTION_ID_QA)
```

---

## 6. Request flows

### 6.1 User generates an image

```
1. Browser (React SPA from CloudFront)
   POST https://{alb_dns}/api/v1/images/generate   ← HTTPS hits ALB

2. ALB
   Decrypts TLS, checks health, forwards to:
   http://api-gateway-task-ip:3000/api/v1/images/generate

3. api-gateway (ECS Fargate task)
   - Validates JWT (public key from Secrets Manager)
   - Checks rate limit in Redis (ratelimit:{userId}:/api/v1/images/generate)
   - Forwards to image-service via Service Connect DNS

4. image-service (http://image-service:3003)
   - Creates a GenerationJob record in RDS PostgreSQL
   - Pushes job ID to BullMQ queue in Redis

5. image-worker (http://image-worker:3006)
   - BullMQ consumer picks up the job from Redis
   - Calls ai-service via Service Connect DNS

6. ai-service (http://ai-service:8000)  [FastAPI Python]
   - Calls Stability AI API with the prompt
   - On success: uploads result image to S3 (qa-ai-images-generated)
   - Returns S3 key to image-worker

7. image-worker
   - Updates GenerationJob status to "completed" in RDS
   - Writes CDN URL to the image record

8. api-gateway (SSE)
   - Client has a persistent Server-Sent Events connection open
   - api-gateway pushes job status update
   - Browser receives the update, fetches image URL from image-service
   - Image appears in the UI (loaded from CloudFront CDN via S3)
```

### 6.2 User logs in with Google OAuth

```
1. Browser → clicks "Sign in with Google"
   GET https://{alb_dns}/api/v1/auth/google   → api-gateway → auth-service

2. auth-service
   - Redirects browser to Google's OAuth consent screen
   - Google redirects back to:
     https://{alb_dns}/api/v1/auth/google/callback?code=xxx
     (this URL is stored in SSM: /visioncraft/qa/auth-service/google-callback-url)

3. auth-service
   - Exchanges code for Google user profile
   - Creates or updates user in RDS PostgreSQL
   - Signs a JWT (RS256, private key from Secrets Manager)
   - Returns JWT access token + refresh token to browser

4. api-gateway (subsequent requests)
   - Reads Authorization: Bearer {jwt} header
   - Verifies signature using JWT public key (from Secrets Manager)
   - Extracts user ID and role, attaches to req.user
   - Forwards request to the correct internal service
```

### 6.3 GitHub Actions deploys new code

```
1. Developer pushes to `qa` branch
   → GitHub Actions workflow triggers (.github/workflows/deploy-qa.yml)

2. GitHub OIDC
   - GitHub generates a short-lived OIDC token for this workflow run
   - aws-actions/configure-aws-credentials exchanges it for temporary AWS credentials
   - Assumes role: visioncraft-github-actions-deploy (created by Terraform in iam module)

3. Build + Push (matrix job, 8 services in parallel)
   - docker build -f services/{service}/Dockerfile .
   - docker push {ecr_registry}/visioncraft/{service}:latest

4. Deploy frontend
   - pnpm turbo build:qa
   - aws s3 sync apps/web/dist/ s3://visioncraft-frontend-qa/ --delete
   - aws cloudfront create-invalidation --paths "/index.html"
     (forces browsers to get the new index.html instead of cached version)

5. Deploy backend services (8 ECS services in parallel)
   - aws ecs register-task-definition (new task def pointing to the new ECR image)
   - aws ecs update-service --force-new-deployment
     (ECS starts new tasks, health check passes, old tasks drain and stop)

6. Health check poll
   - Workflow polls ALB_QA_URL/health every 15 seconds for up to 5 minutes
   - Returns 200 → deployment successful

7. DB migration + seed (ECS one-off task)
   - aws ecs run-task with command: node_modules/.bin/prisma migrate deploy
   - Runs inside the VPC (private subnet) so it can reach RDS directly
   - Uses the Prisma version bundled in the container (avoids pulling a mismatched version from npm)

8. E2E tests (Playwright)
   - pnpm test:e2e against the live CloudFront domain
   - All 8 critical flows must pass before workflow completes
```

---

## 7. Terraform commands reference

Run all commands from `infra/terraform/environments/qa/`.

> **Windows:** Before any Terraform command, set `$env:GODEBUG = "tlskyber=0"` in PowerShell (or `export GODEBUG=tlskyber=0` in Git Bash) to fix a TLS handshake issue with Terraform's Go HTTP client on some Windows networks.

| Command                              | What it does                                                                                       | When to run                                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `terraform init`                     | Downloads AWS provider plugin, connects to S3 state backend, sets up local `.terraform/` directory | Once, or after changing `backend.tf` or adding a new module |
| `terraform plan -var="..."`          | Dry run — shows exactly what will be created, changed, or destroyed. Nothing real changes.         | Before every `apply`                                        |
| `terraform apply -var="..."`         | Creates or updates real AWS resources. Prompts for confirmation unless `-auto-approve` is passed.  | First-time setup and infrastructure changes                 |
| `terraform output`                   | Prints all output values from `outputs.tf`                                                         | After `apply`, to get the ALB URL, ECR registry URL, etc.   |
| `terraform output -raw alb_dns_name` | Prints one specific output value without quotes (useful in scripts)                                | When building connection strings or GitHub secrets          |
| `terraform destroy`                  | Deletes everything Terraform created. **Irreversible.**                                            | QA teardown only — never run against production             |

**Required `-var` flags for QA:**

```bash
-var="github_org=chraman"
-var="github_repo=VisionCraft"
-var="aws_account_id=553138587052"
-var="db_password=<strong-password>"
-var="ses_from_email=<ses-verified-email>"
```

These match the variables declared in `infra/terraform/environments/qa/variables.tf`. The `db_password` is marked `sensitive = true` — Terraform will never print it in logs.

---

## 8. State backend — why it matters

Terraform needs to remember what it has already created so it can detect changes and avoid creating duplicates. It does this via a **state file** — a JSON file listing every resource and its current AWS ID.

We store this state file **remotely in S3** (not locally) so the whole team shares the same state. The DynamoDB table provides a **lock** so only one `terraform apply` can run at a time.

```
infra/terraform/environments/qa/backend.tf:

terraform {
  backend "s3" {
    bucket         = "visioncraft-terraform-state"          ← state file lives here
    key            = "environments/qa/terraform.tfstate"    ← file path inside bucket
    region         = "ap-south-1"
    dynamodb_table = "visioncraft-terraform-locks"          ← lock table
    encrypt        = true                                   ← state file encrypted at rest
  }
}
```

**The S3 bucket and DynamoDB table must exist before `terraform init` will work.** They are not created by Terraform itself (bootstrapping problem — you need state storage before you can store state). Create them once with AWS CLI:

```bash
aws s3api create-bucket --bucket visioncraft-terraform-state --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1
aws s3api put-bucket-versioning --bucket visioncraft-terraform-state \
  --versioning-configuration Status=Enabled
aws dynamodb create-table --table-name visioncraft-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST --region ap-south-1
```

---

## 9. Monthly cost estimate

These are approximate costs for the QA environment running 24/7. QA can be stopped during off-hours to save money (destroy + recreate, or stop ECS tasks).

| Resource                                          | Size                 | ~Cost/month (ap-south-1) |
| ------------------------------------------------- | -------------------- | ------------------------ |
| RDS PostgreSQL (`db.t3.micro`, 20 GB)             | Always on            | ~$15                     |
| ElastiCache Redis (`cache.t3.micro`, 1 node)      | Always on            | ~$15                     |
| ECS Fargate (8 services, 0.25 vCPU × 512 MB each) | Running containers   | ~$30                     |
| ALB (1 load balancer + data processing)           | Always on            | ~$20                     |
| NAT Gateway (data processed outbound)             | Outbound traffic     | ~$10                     |
| S3 (frontend + image buckets)                     | Storage + requests   | ~$5                      |
| CloudFront (egress)                               | Minimal in QA        | ~$1                      |
| ECR (image storage)                               | ~10 images × 8 repos | ~$2                      |
| Secrets Manager (8 secrets)                       | $0.40/secret/month   | ~$3                      |
| CloudWatch Logs (14-day retention)                | Log ingestion        | ~$3                      |
| **Total**                                         |                      | **~$104/month**          |

> **Tip:** To save cost when QA is not actively used, set `desired_count = 0` on all ECS services — containers stop running but RDS and ElastiCache still incur charges. To save more, use `terraform destroy` and `terraform apply` to tear down and recreate the full environment.
