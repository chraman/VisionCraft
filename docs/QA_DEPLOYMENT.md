# QA Environment — Deployment Guide

This document covers everything needed to set up and deploy the QA environment, which runs the full stack on the internet: Railway (backend + DB + Redis) and Vercel (frontend).

Deploying to QA is a single `git push origin qa` once the one-time setup below is complete.

---

## Table of Contents

1. [How it works](#how-it-works)
2. [Prerequisites](#prerequisites)
3. [One-time setup](#one-time-setup)
   - [Step 1 — Railway project](#step-1--railway-project)
   - [Step 2 — Managed databases](#step-2--managed-databases)
   - [Step 3 — Backend services](#step-3--backend-services)
   - [Step 4 — Environment variables](#step-4--environment-variables)
   - [Step 5 — Public domain for API gateway](#step-5--public-domain-for-api-gateway)
   - [Step 6 — Vercel project](#step-6--vercel-project)
   - [Step 7 — GitHub secrets](#step-7--github-secrets)
4. [Deploying to QA](#deploying-to-qa)
5. [Running QA tests manually](#running-qa-tests-manually)
6. [Monitoring a QA deployment](#monitoring-a-qa-deployment)
7. [Resetting the QA database](#resetting-the-qa-database)
8. [Troubleshooting](#troubleshooting)

---

## How it works

Pushing to the `qa` branch triggers the `.github/workflows/deploy-qa.yml` workflow, which:

1. Typechecks and builds all packages via Turborepo
2. Deploys all 6 backend services to Railway (`qa` environment) in parallel
3. Deploys the frontend to Vercel (preview deployment)
4. Waits for the API gateway health check to pass
5. Runs `prisma migrate deploy` against the QA database
6. Runs the seed script — creates `alice`, `bob`, and `admin` test accounts
7. Runs all 5 Playwright E2E auth tests against the live URLs
8. Uploads a Playwright HTML report as a workflow artifact

The workflow does **not** touch the production environment. Railway and Vercel keep QA and production completely isolated.

```
git push origin qa
       │
       ▼
┌─────────────────────────────────────────────────┐
│  GitHub Actions — deploy-qa.yml                 │
│                                                 │
│  build ──► deploy-backend ──► migrate-and-seed  │
│         └► deploy-frontend ──────────────────►  │
│                                                 │
│                              └► e2e (Playwright)│
└─────────────────────────────────────────────────┘
       │                 │
       ▼                 ▼
  Railway QA         Vercel Preview
  (6 services        (frontend at a
  + Postgres         unique HTTPS URL)
  + Redis)
```

---

## Prerequisites

The following tools must be installed locally for the one-time setup steps:

```bash
npm install -g @railway/cli   # Railway CLI
npm install -g vercel         # Vercel CLI
```

You also need accounts on:

- [railway.app](https://railway.app)
- [vercel.com](https://vercel.com)

---

## One-time setup

Complete these steps once. After this, all future deploys are automated.

---

### Step 1 — Railway project

1. Log in to [railway.app](https://railway.app) and create a new project named **visioncraft**
2. Inside the project, click the environment selector (top-left) → **New Environment** → name it `qa`

---

### Step 2 — Managed databases

Inside the `qa` environment:

1. Click **New** → **Database** → **Add PostgreSQL**
   - After it provisions, open the Postgres service → **Variables** tab → copy `DATABASE_URL`
2. Click **New** → **Database** → **Add Redis**
   - After it provisions, open the Redis service → **Variables** tab → copy `REDIS_URL`

Save both connection strings — you will need them in Steps 4 and 7.

---

### Step 3 — Backend services

This is a Turborepo monorepo — all services live in the same repository. Railway handles this by giving each service its own **Root Directory** setting, which tells Railway which subdirectory to treat as the service root. The `railway.toml` in each service directory then navigates back up to the monorepo root (`cd ../..`) so the build can use pnpm workspaces and Turborepo correctly.

For each of the 6 services, click **New** → **GitHub Repo** → select this repo, then configure:

| Service name in Railway | Root Directory setting          |
| ----------------------- | ------------------------------- |
| `auth-service`          | `services/auth-service`         |
| `api-gateway`           | `services/api-gateway`          |
| `user-service`          | `services/user-service`         |
| `image-service`         | `services/image-service`        |
| `notification-service`  | `services/notification-service` |
| `analytics-service`     | `services/analytics-service`    |

For each service:

1. Go to **Settings** → **Source** → set **Root Directory** to the path in the table above
2. Railway will pick up the `railway.toml` from that directory automatically — no build or start command to enter manually
3. **Disable auto-deploy**: Settings → Source → toggle off **Deploy on Push** — the `deploy-qa.yml` GitHub Actions workflow controls all deploys

**How the monorepo build works end-to-end:**

```
GitHub Actions
  └─ railway up --service auth-service   ← runs from repo root, uploads full monorepo

Railway receives the full repo
  └─ CDs into services/auth-service      ← Root Directory setting
       └─ runs buildCommand:
            cd ../..                     ← back to monorepo root
            pnpm install --frozen-lockfile
            pnpm turbo build --filter=@ai-platform/auth-service
                                         ← turbo builds only auth-service + its
                                            workspace dependencies (packages/*)
  └─ runs startCommand from services/auth-service:
       node dist/index.js                ← dist/ produced by the turbo build above
```

Each `railway.toml` also declares `watchPatterns` — Railway uses these to skip a rebuild if the push didn't touch that service's files or the shared `packages/` directory.

---

### Step 4 — Environment variables

In the Railway dashboard, open each service → **Variables** → add the values below.

#### All services (add to every service)

```
NODE_ENV=production
RAILWAY_ENVIRONMENT=qa
LOG_LEVEL=info
DATABASE_URL=<paste from Step 2>
REDIS_URL=<paste from Step 2>
```

#### auth-service (additional)

```
JWT_PRIVATE_KEY=<RS256 PEM private key — paste with literal \n for newlines>
JWT_PUBLIC_KEY=<RS256 PEM public key — paste with literal \n for newlines>
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=604800
GOOGLE_CLIENT_ID=<your Google OAuth client ID>
GOOGLE_CLIENT_SECRET=<your Google OAuth client secret>
GOOGLE_CALLBACK_URL=https://<api-gateway-qa-domain>/api/v1/auth/google/callback
```

> To generate fresh RS256 keys:
>
> ```bash
> openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048
> openssl rsa -pubout -in private.pem -out public.pem
> ```
>
> Copy the file contents and replace real newlines with `\n` before pasting into Railway.

#### api-gateway (additional)

Use Railway's private hostnames for all service-to-service URLs. Traffic on `.railway.internal` stays within Railway's private network and never goes over the internet.

```
JWT_PUBLIC_KEY=<same public key as auth-service>
AUTH_SERVICE_URL=http://auth-service.railway.internal:3001
USER_SERVICE_URL=http://user-service.railway.internal:3002
IMAGE_SERVICE_URL=http://image-service.railway.internal:3003
NOTIFICATION_SERVICE_URL=http://notification-service.railway.internal:3004
ANALYTICS_SERVICE_URL=http://analytics-service.railway.internal:3005
ALLOWED_ORIGINS=https://<your-vercel-qa-domain>
```

> You can set `ALLOWED_ORIGINS` after Step 6 when you have the Vercel domain.

---

### Step 5 — Public domain for API gateway

Only the API gateway should be publicly reachable. All other services communicate over the private Railway network.

1. Open the `api-gateway` service → **Settings** → **Networking**
2. Click **Generate Domain**
3. Copy the generated URL (e.g. `https://api-gateway-qa-production.up.railway.app`)

You will use this URL as `RAILWAY_QA_API_URL` in Step 7, and as the value for `VITE_API_URL` in Vercel.

---

### Step 6 — Vercel project

Link the repo to Vercel and configure the QA environment variables:

```bash
cd apps/web
vercel link
```

Follow the prompts (create a new project or link to existing). After linking, `.vercel/project.json` is created — note the `projectId` and `orgId` values for Step 7.

In the Vercel dashboard → your project → **Settings** → **Environment Variables**, add these for the **Preview** environment:

```
VITE_API_URL=https://<api-gateway-qa-domain from Step 5>
VITE_LAUNCHDARKLY_CLIENT_KEY=<your LaunchDarkly QA client key>
VITE_SENTRY_DSN=<your Sentry DSN>
VITE_POSTHOG_KEY=<your PostHog key>
```

---

### Step 7 — GitHub secrets

Go to your GitHub repo → **Settings** → **Environments** → **New environment** → name it `qa`.

Add the following secrets to the `qa` environment:

| Secret                    | Where to find it                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `RAILWAY_TOKEN`           | railway.app → Account Settings → Tokens → New Token                                    |
| `RAILWAY_QA_API_URL`      | The public domain from Step 5, e.g. `https://api-gateway-qa-production.up.railway.app` |
| `RAILWAY_QA_DATABASE_URL` | Postgres `DATABASE_URL` from Step 2                                                    |
| `VERCEL_TOKEN`            | vercel.com → Settings → Tokens → Create                                                |
| `VERCEL_ORG_ID`           | `orgId` from `apps/web/.vercel/project.json`                                           |
| `VERCEL_PROJECT_ID`       | `projectId` from `apps/web/.vercel/project.json`                                       |
| `TURBO_TOKEN`             | Turborepo remote cache token (optional — speeds up CI builds)                          |
| `TURBO_TEAM`              | Turborepo team slug (optional)                                                         |

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

The workflow takes approximately 5–8 minutes end to end. When it completes:

- All backend services are running on Railway QA
- The frontend is live at the Vercel preview URL (printed in the `deploy-frontend` job output)
- The QA database has been migrated and seeded with test accounts
- All 5 E2E tests have passed against the live URLs

---

## Running QA tests manually

To run Playwright tests against the live QA environment without triggering a full deploy:

```bash
pnpm install
pnpm exec playwright install --with-deps chromium firefox

# Run all auth tests
BASE_URL=https://<vercel-qa-url> pnpm test:e2e

# Run a single test file
BASE_URL=https://<vercel-qa-url> pnpm exec playwright test e2e/auth.test.ts

# Open interactive Playwright UI
BASE_URL=https://<vercel-qa-url> pnpm exec playwright test --ui

# Run on a single browser
BASE_URL=https://<vercel-qa-url> pnpm exec playwright test --project=chromium
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

**Railway logs:**

```bash
# Tail logs for a specific service
railway logs --service auth-service --environment qa
railway logs --service api-gateway --environment qa

# Or view logs in the Railway dashboard
# railway.app → your project → qa environment → select service → Logs tab
```

**Health checks:**

```bash
curl https://<api-gateway-qa-domain>/health
```

---

## Resetting the QA database

To wipe all QA data and re-seed fresh test accounts:

```bash
# Drop and recreate all tables, then re-apply all migrations
cd services/auth-service
DATABASE_URL="<RAILWAY_QA_DATABASE_URL>" pnpm prisma migrate reset --force

# Re-seed
cd ../../infra/scripts
DATABASE_URL="<RAILWAY_QA_DATABASE_URL>" pnpm seed
```

> `prisma migrate reset` drops all data. Never run this against production.

Alternatively, re-run just the seed (wipes existing rows and re-inserts):

```bash
cd infra/scripts
DATABASE_URL="<RAILWAY_QA_DATABASE_URL>" pnpm seed
```

The seed script deletes all rows before inserting, so running it again is safe and idempotent.

---

## Troubleshooting

### The `deploy-backend` job fails on "railway up"

- Verify `RAILWAY_TOKEN` secret is set correctly in the `qa` GitHub environment
- Confirm the service name in Railway exactly matches the `--service` flag in the workflow (e.g. `auth-service`)
- Check that **Deploy on Push** is disabled in Railway — if Railway is already deploying, the CLI may conflict

### The health check poll times out

The workflow polls `RAILWAY_QA_API_URL/health` for up to 5 minutes. If it times out:

- Check Railway logs for startup errors: `railway logs --service api-gateway --environment qa`
- Confirm all required env vars are set on the `api-gateway` service (missing `JWT_PUBLIC_KEY` or service URLs are common causes)
- Verify `api-gateway` has a public domain assigned (Step 5)

### Migrations fail

```
Error: P1001: Can't reach database server
```

- Confirm `RAILWAY_QA_DATABASE_URL` secret is correct and the Railway Postgres service is running
- The connection string must be the **external** URL (used by GitHub Actions runners), not the `.railway.internal` URL (which only works inside Railway's private network)

### E2E tests fail — login returns 401

The seed script uses a bcrypt hash for `password123`. If the hash does not match, re-run the seed after ensuring `bcrypt` is installed in `infra/scripts`:

```bash
cd infra/scripts
DATABASE_URL="<RAILWAY_QA_DATABASE_URL>" pnpm seed
```

If the problem persists, check that `auth-service` is using the same bcrypt compare logic as the seed hash format (`$2b$12$...`).

### Vercel deploy fails — missing env vars

Verify that all `VITE_*` variables are set in the Vercel dashboard under the **Preview** environment (not Production). The QA deploy uses Vercel preview deployments.

### Frontend cannot reach the API — CORS error

Update the `ALLOWED_ORIGINS` variable on the `api-gateway` Railway service to include the Vercel preview domain. Note that Vercel preview URLs change per-deploy — use a wildcard pattern or a fixed QA alias:

```
ALLOWED_ORIGINS=https://visioncraft-qa.vercel.app,https://*.vercel.app
```
