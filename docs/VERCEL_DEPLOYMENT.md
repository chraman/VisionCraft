# Vercel Deployment Guide — QA & Production

This document covers Vercel deployment for the `apps/web` frontend in this Turborepo monorepo. It applies to both QA (preview) and Production environments.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Turborepo Integration](#turborepo-integration)
4. [One-Time Setup](#one-time-setup)
   - [Step 1 — Link Vercel Project](#step-1--link-vercel-project)
   - [Step 2 — Configure Build Settings](#step-2--configure-build-settings)
   - [Step 3 — Environment Variables](#step-3--environment-variables)
   - [Step 4 — GitHub Secrets](#step-4--github-secrets)
   - [Step 5 — Turborepo Remote Cache (Optional)](#step-5--turborepo-remote-cache-optional)
5. [QA Deployment](#qa-deployment)
   - [Automated (CI)](#automated-ci)
   - [Manual (CLI)](#manual-cli)
   - [QA Domain Alias](#qa-domain-alias)
6. [Production Deployment](#production-deployment)
   - [Automated (Push to Main)](#automated-push-to-main)
   - [Manual Promotion](#manual-promotion)
   - [Production Custom Domain](#production-custom-domain)
7. [Environment Variable Reference](#environment-variable-reference)
8. [Build Pipeline Details](#build-pipeline-details)
9. [Monorepo Watch & Caching](#monorepo-watch--caching)
10. [Rollback Procedures](#rollback-procedures)
11. [Admin App (Phase 2)](#admin-app-phase-2)
12. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
                    ┌─────────────────────────┐
                    │     Vercel (Frontend)    │
                    │                         │
                    │  apps/web  ─► Preview   │  ← QA (preview deployments)
                    │             ─► Production│  ← Prod (main branch)
                    └────────────┬────────────┘
                                 │ HTTPS
                                 ▼
                    ┌─────────────────────────┐
                    │   Railway (Backend)      │
                    │   api-gateway (public)   │
                    │   ├─ auth-service        │
                    │   ├─ user-service        │
                    │   ├─ image-service       │
                    │   ├─ notification-service│
                    │   └─ analytics-service   │
                    └─────────────────────────┘
```

- **QA** uses Vercel **preview** deployments (unique URL per deploy)
- **Production** uses Vercel **production** deployments (custom domain)
- The frontend communicates with backend exclusively through the `api-gateway`
- Only `VITE_`-prefixed env vars are exposed to the browser (Vite requirement)

---

## Prerequisites

```bash
# Required tools
node --version   # >= 20.0.0
pnpm --version   # >= 9.0.0

# Install Vercel CLI
pnpm add -g vercel

# Accounts needed
# - vercel.com (team or personal)
# - GitHub repo connected to Vercel
```

---

## Turborepo Integration

This is a Turborepo monorepo. Vercel builds only `apps/web` but must resolve workspace dependencies from `packages/*`. Key config files:

| File | Purpose |
|---|---|
| `turbo.json` | Pipeline config — `build` task depends on `^build` (builds deps first) |
| `pnpm-workspace.yaml` | Declares `apps/*`, `packages/*`, `services/*`, `workers/*` workspaces |
| `apps/web/vite.config.ts` | Vite build config, dev proxy to API gateway |
| `apps/web/package.json` | Build script: `tsc -b && vite build` |

**Build command used by Vercel:**

```bash
cd ../.. && pnpm turbo build --filter=@ai-platform/web
```

This builds `apps/web` and all its workspace dependencies (`packages/ui`, `packages/types`, `packages/store`, `packages/api-client`, `packages/feature-flags`, `packages/utils`, `packages/config`).

---

## One-Time Setup

### Step 1 — Link Vercel Project

```bash
cd apps/web
vercel link
```

Follow the prompts:
- Select your Vercel team/account
- Create a new project or link to an existing one
- Project name suggestion: `visioncraft-web`

This creates `apps/web/.vercel/project.json` containing:

```json
{
  "orgId": "team_xxxxxxxxxxxx",
  "projectId": "prj_xxxxxxxxxxxx"
}
```

Save both IDs — you need them for GitHub secrets in Step 4.

> **Note:** Do not commit `.vercel/` to git — it is gitignored.

---

### Step 2 — Configure Build Settings

In the Vercel dashboard → Project → **Settings** → **General**:

| Setting | Value |
|---|---|
| **Framework Preset** | Vite |
| **Root Directory** | `apps/web` |
| **Build Command** | `cd ../.. && pnpm turbo build --filter=@ai-platform/web` |
| **Output Directory** | `dist` |
| **Install Command** | `cd ../.. && corepack enable && pnpm install --frozen-lockfile` |
| **Node.js Version** | 20.x |

> The `cd ../..` navigates from the root directory (`apps/web`) back to the monorepo root so Turborepo and pnpm workspaces resolve correctly. This is the same pattern used by Railway for backend services.

---

### Step 3 — Environment Variables

In Vercel dashboard → Project → **Settings** → **Environment Variables**, add variables per environment:

#### QA (Preview Environment)

| Variable | Value | Scope |
|---|---|---|
| `VITE_API_BASE_URL` | `https://<api-gateway-qa>.up.railway.app` | Preview |
| `VITE_LAUNCHDARKLY_CLIENT_KEY` | `<QA client-side key>` | Preview |
| `VITE_SENTRY_DSN` | `<Sentry DSN>` | Preview |
| `VITE_POSTHOG_KEY` | `<PostHog project key>` | Preview |
| `VITE_POSTHOG_HOST` | `https://app.posthog.com` | Preview |

#### Production

| Variable | Value | Scope |
|---|---|---|
| `VITE_API_BASE_URL` | `https://api.yourdomain.com` | Production |
| `VITE_LAUNCHDARKLY_CLIENT_KEY` | `<Production client-side key>` | Production |
| `VITE_SENTRY_DSN` | `<Sentry DSN>` | Production |
| `VITE_POSTHOG_KEY` | `<PostHog project key>` | Production |
| `VITE_POSTHOG_HOST` | `https://app.posthog.com` | Production |

> **Important:** Use different LaunchDarkly keys per environment. QA uses the LaunchDarkly staging environment; Production uses the production environment. This ensures feature flags are evaluated independently.

---

### Step 4 — GitHub Secrets

Go to GitHub repo → **Settings** → **Environments**.

#### `qa` environment secrets

| Secret | Source |
|---|---|
| `VERCEL_TOKEN` | vercel.com → Settings → Tokens → Create |
| `VERCEL_ORG_ID` | `orgId` from `apps/web/.vercel/project.json` |
| `VERCEL_PROJECT_ID` | `projectId` from `apps/web/.vercel/project.json` |
| `TURBO_TOKEN` | *(optional)* Turborepo remote cache token |
| `TURBO_TEAM` | *(optional)* Turborepo team slug |

#### `production` environment secrets

Same secrets as QA. If using a separate Vercel project for production, use that project's IDs.

---

### Step 5 — Turborepo Remote Cache (Optional)

Turborepo remote caching speeds up CI builds by sharing cached build artifacts between runs.

```bash
# Login to Vercel (Turborepo uses Vercel for remote cache)
pnpm turbo login

# Link repo to remote cache
pnpm turbo link
```

Set `TURBO_TOKEN` and `TURBO_TEAM` in GitHub secrets. The CI workflows already reference these:

```yaml
# From deploy-qa.yml
- name: Build
  run: pnpm turbo build
  env:
    TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
    TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
```

Vercel-hosted Turborepo remote cache is free and included with your Vercel account.

---

## QA Deployment

### Automated (CI)

QA deploys are triggered by pushing to the `qa` branch. The `deploy-qa.yml` workflow handles the full pipeline:

```bash
# First time
git checkout main
git checkout -b qa
git push origin qa

# Subsequent deploys
git checkout qa
git merge main
git push origin qa
```

**What happens in CI:**

```
build ──► deploy-backend (Railway) ──► migrate-and-seed ──┐
       └► deploy-frontend (Vercel) ───────────────────────┴► e2e (Playwright)
```

The frontend deploy step:

1. Pulls Vercel environment config: `vercel pull --yes --environment=preview`
2. Builds locally: `vercel build`
3. Deploys prebuilt output: `vercel deploy --prebuilt`
4. Outputs the preview URL for the E2E job

The preview URL is unique per deploy (e.g., `https://visioncraft-web-abc123.vercel.app`).

### Manual (CLI)

Deploy a preview build from your local machine:

```bash
# From repo root
cd apps/web

# Preview deployment (QA)
vercel

# Or with explicit env
vercel --environment=preview
```

### QA Domain Alias

Instead of using changing preview URLs, assign a stable alias:

```bash
# After deploying, alias the latest preview to a fixed domain
vercel alias <preview-url> visioncraft-qa.vercel.app
```

Or configure in Vercel dashboard → Project → **Settings** → **Domains** → add `visioncraft-qa.vercel.app` for preview deployments.

Update the `ALLOWED_ORIGINS` on api-gateway in Railway to include this alias:

```
ALLOWED_ORIGINS=https://visioncraft-qa.vercel.app,https://*.vercel.app
```

---

## Production Deployment

### Automated (Push to Main)

By default, Vercel auto-deploys the production environment when code is pushed to `main`:

```
PR merged to main
  └─► Vercel detects push
       └─► Builds: cd ../.. && pnpm turbo build --filter=@ai-platform/web
            └─► Deploys to production domain
```

**To disable auto-deploy** (recommended if using manual promotion):

Vercel dashboard → Project → **Settings** → **Git** → toggle off **Auto Deploy** for production.

### Manual Promotion

The recommended production flow from `CLAUDE.md`:

```
1. Merge PR to main  →  auto-deploys to staging (Vercel preview)
2. Playwright E2E runs against staging  →  must pass (CI gate)
3. Manual workflow_dispatch in GitHub Actions  →  promote to production
4. Automated smoke tests run post-deploy
5. Monitor Sentry + Grafana for 15 minutes  →  declare healthy
```

**Promote via CLI:**

```bash
# Deploy to production explicitly
cd apps/web
vercel --prod

# Or promote an existing preview deployment
vercel promote <deployment-url>
```

**Promote via GitHub Actions (workflow_dispatch):**

Create `.github/workflows/deploy-prod.yml`:

```yaml
name: Deploy Production

on:
  workflow_dispatch:
    inputs:
      confirmation:
        description: 'Type "deploy" to confirm production deployment'
        required: true

jobs:
  gate:
    name: Confirm deployment
    runs-on: ubuntu-latest
    steps:
      - name: Validate confirmation
        if: github.event.inputs.confirmation != 'deploy'
        run: |
          echo "ERROR: You must type 'deploy' to confirm."
          exit 1

  deploy-frontend:
    name: Deploy frontend to Vercel Production
    runs-on: ubuntu-latest
    needs: gate
    environment: production
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10.30.1

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Install Vercel CLI
        run: pnpm add -g vercel@latest

      - name: Pull Vercel environment (production)
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Build for Vercel
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ secrets.TURBO_TEAM }}

      - name: Deploy to Vercel Production
        run: |
          URL=$(vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }})
          echo "Production deployed to: $URL"
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Smoke test
        run: |
          echo "Running smoke test against production..."
          for i in $(seq 1 10); do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://yourdomain.com" || echo "000")
            if [ "$STATUS" = "200" ]; then
              echo "Production is healthy."
              exit 0
            fi
            echo "  attempt $i: HTTP $STATUS — retrying in 10s"
            sleep 10
          done
          echo "WARNING: Production did not return 200 within timeout."
          exit 1
```

### Production Custom Domain

1. Vercel dashboard → Project → **Settings** → **Domains**
2. Add your domain (e.g., `app.yourdomain.com`)
3. Configure DNS:
   - **CNAME**: `app` → `cname.vercel-dns.com`
   - Or **A record**: `76.76.21.21` (for apex domains)
4. Vercel auto-provisions SSL via Let's Encrypt

---

## Environment Variable Reference

Complete list of `VITE_` variables used by `apps/web`:

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | Yes | API gateway public URL (used in dev proxy + API client) |
| `VITE_LAUNCHDARKLY_CLIENT_KEY` | Yes | LaunchDarkly client-side SDK key for feature flags |
| `VITE_SENTRY_DSN` | Yes | Sentry DSN for browser error tracking |
| `VITE_POSTHOG_KEY` | Yes | PostHog project API key for analytics |
| `VITE_POSTHOG_HOST` | No | PostHog host (defaults to `https://app.posthog.com`) |
| `VITE_DEV_PORT` | No | Dev server port (defaults to `5173`, local dev only) |

> All `VITE_` variables are embedded at **build time** and shipped to the browser. Never put secrets in `VITE_` variables. API keys here are public client-side keys only.

---

## Build Pipeline Details

### What `pnpm turbo build --filter=@ai-platform/web` does

```
1. Resolves @ai-platform/web's workspace dependencies:
   ├─ @ai-platform/types      (packages/types)
   ├─ @ai-platform/ui         (packages/ui)
   ├─ @ai-platform/store      (packages/store)
   ├─ @ai-platform/api-client (packages/api-client)
   ├─ @ai-platform/feature-flags (packages/feature-flags)
   ├─ @ai-platform/utils      (packages/utils)
   └─ @ai-platform/config     (packages/config)

2. Builds each dependency in topological order (^build)

3. Builds apps/web:
   └─ tsc -b && vite build
      └─ Output: apps/web/dist/
```

### Build output

Vite produces a static `dist/` directory with:
- `index.html` — entry point
- `assets/` — hashed JS/CSS bundles
- Source maps (uploaded to Sentry separately)

Vercel serves this as a static site with edge CDN.

---

## Monorepo Watch & Caching

### Turborepo Cache

Turborepo caches build outputs based on file inputs. Unchanged packages are not rebuilt:

```json
// turbo.json
"build": {
  "dependsOn": ["^build"],
  "inputs": ["$TURBO_DEFAULT$", ".env*"],
  "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
}
```

- **Cache hit**: If source files + env files haven't changed, Turborepo replays cached output
- **Cache miss**: Full build runs and stores output for next time
- **Remote cache**: When `TURBO_TOKEN`/`TURBO_TEAM` are set, cache is shared across CI runs via Vercel

### Vercel Ignored Build Step (Optional)

To skip Vercel builds when only backend files change, add to Vercel project settings → **Git** → **Ignored Build Step**:

```bash
# Only build if apps/web or packages/* changed
git diff --quiet HEAD^ HEAD -- apps/web/ packages/ turbo.json pnpm-lock.yaml || exit 1
```

Or use `npx turbo-ignore` which does this automatically:

```bash
npx turbo-ignore @ai-platform/web
```

---

## Rollback Procedures

### Instant Rollback (Vercel Dashboard)

1. Vercel dashboard → Project → **Deployments**
2. Find the last known-good deployment
3. Click **⋮** → **Promote to Production**

This is instant — no rebuild required. Vercel simply points the production domain to the previous deployment's immutable output.

### CLI Rollback

```bash
# List recent deployments
vercel ls

# Promote a specific deployment to production
vercel promote <deployment-url> --yes
```

### Rollback Considerations

- Rollback only affects the frontend — backend services on Railway are independent
- If the rollback is due to a backend API change, you may also need to rollback the relevant Railway service
- Vercel keeps all deployments indefinitely (free plan: 100 per day)

---

## Admin App (Phase 2)

`apps/admin` is a separate Vite app gated behind the `admin.dashboard.enabled` feature flag. It is **not deployed in Phase 1**.

When Phase 2 is ready:

1. Create a separate Vercel project for `apps/admin`
2. Set Root Directory to `apps/admin`
3. Use the same build pattern: `cd ../.. && pnpm turbo build --filter=@ai-platform/admin`
4. Restrict access via Vercel Authentication or IP allowlist
5. Use a separate domain (e.g., `admin.yourdomain.com`)

---

## Troubleshooting

### Build fails: "Cannot find module '@ai-platform/types'"

The install command must run from the monorepo root to resolve workspace dependencies:

```
Install Command: cd ../.. && corepack enable && pnpm install --frozen-lockfile
```

Verify Root Directory is set to `apps/web`, not the repo root.

### Build fails: "tsc: command not found"

Ensure `typescript` is in the root `devDependencies` (it is — `^5.7.2`). The install command from the monorepo root will hoist it.

### Environment variables not available at runtime

- All browser-accessible vars must be prefixed with `VITE_`
- Vars are embedded at build time — changing them in the Vercel dashboard requires a redeploy
- Verify the variable is set for the correct environment (Preview vs Production)

### CORS errors in QA

The api-gateway's `ALLOWED_ORIGINS` must include the Vercel preview domain. Preview URLs change per deploy — use a wildcard or stable alias:

```
ALLOWED_ORIGINS=https://visioncraft-qa.vercel.app,https://*.vercel.app
```

### Preview deployment not triggered

- Check that the Vercel GitHub integration is installed on the repo
- Verify the branch is not excluded in Vercel → Settings → Git → Branch Deployments
- If using the CLI workflow (deploy-qa.yml), check that `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` secrets are set in the `qa` GitHub environment

### Build is slow in CI

1. Enable Turborepo remote cache (`TURBO_TOKEN` + `TURBO_TEAM`)
2. Use pnpm store caching (already configured in `ci.yml`)
3. Use `turbo-ignore` to skip builds when `apps/web` hasn't changed

### Source maps not appearing in Sentry

Upload source maps as a post-build step:

```bash
pnpm add -D @sentry/vite-plugin

# In vite.config.ts, add:
# import { sentryVitePlugin } from '@sentry/vite-plugin';
# plugins: [react(), sentryVitePlugin({ org: "your-org", project: "visioncraft-web" })]
```

Set `SENTRY_AUTH_TOKEN` in Vercel environment variables.

---

*Last updated: 2026-03-20 · See also: [QA_DEPLOYMENT.md](./QA_DEPLOYMENT.md) for the full-stack QA guide including Railway backend setup.*
