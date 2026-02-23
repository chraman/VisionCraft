# Implementation Plan — AI Image Creation Platform
> **Stack:** React (Vercel) · Node.js Microservices (Railway) · FastAPI (Railway) · Turborepo · PostgreSQL · Redis · S3  
> **Duration:** 12 weeks · 8 sprints  
> **Last updated:** 2025 · Companion to HLD v3.0

---

## Ground Rules

- **Flag before code.** Create the feature flag (default OFF) before writing a single line of feature code.
- **Schema before service.** Write and run the Prisma migration before implementing the service layer.
- **Types before implementation.** Add shared types to `packages/types` before implementing on either side.
- **Ship each sprint.** Every sprint ends with a deployable, demo-able increment on staging.
- **No dark sprints.** If a feature isn't ready it goes behind a flag — it never holds up a deploy.

---

## Definition of Done (DoD)

Every task must satisfy all of these before it is considered complete:

- [ ] Code reviewed — at least 1 approval, CI green
- [ ] Unit tests written — ≥ 85% coverage on new code
- [ ] Integration test written — if new API endpoint introduced
- [ ] Feature flag created and wired — if user-facing behaviour
- [ ] Analytics event fired — if user performs an action
- [ ] OpenAPI spec updated — if API contract changed
- [ ] Zero TypeScript errors, zero ESLint violations
- [ ] `CLAUDE.md` updated — if new flag, env var, or convention added
- [ ] Railway / Vercel env vars documented in `.env.example`

---

## Sprint 0 — Foundation & Tooling
**Weeks 1–2 · Goal: Green CI, runnable local stack, complete schema with all reserved columns**

### Monorepo & Tooling
- [ ] Init Nx workspace → migrate to Turborepo (`turbo.json` with build/test/lint/typecheck tasks)
- [ ] Configure pnpm workspaces — `pnpm-workspace.yaml` listing all apps, packages, services
- [ ] TypeScript `tsconfig.base.json` — strict mode, path aliases (`@ai-platform/*`)
- [ ] ESLint + Prettier config shared via `packages/config`
- [ ] Husky pre-commit: `pnpm lint-staged` (lint + typecheck on changed files only)
- [ ] commitlint — enforce Conventional Commits (`feat:` `fix:` `chore:` `docs:` `test:`)

### Shared Packages — Scaffold
- [ ] `packages/types` — DTOs: `User`, `Image`, `GenerationJob`, `APIResponse<T>`, `AppError`, `FeatureFlags`
- [ ] `packages/utils` — Winston logger (structured JSON), `track()` analytics stub, formatters
- [ ] `packages/config` — Zod env schemas per service, shared constants (`API_ROUTES`, `TIERS`)
- [ ] `packages/feature-flags` — `useFlag()` hook, `flagClient` server instance, `flags.default.json`, `flags.test.json`
- [ ] `packages/api-client` — Axios instance skeleton, JWT interceptor stub, typed response wrapper
- [ ] `packages/store` — Zustand store setup, `authSlice` skeleton
- [ ] `packages/ui` — shadcn/ui base install, `Button`, `Input`, `Card`, `Badge`, `Spinner` components

### Database
- [ ] Prisma schema — ALL tables with reserved columns (see HLD §7.1)
  - `users` — include: `credits`, `team_id`, `is_public`, `metadata JSONB`, `deleted_at`
  - `images` — include: `style_preset`, `seed`, `width`, `height`, `collection_id`, `metadata JSONB`
  - `generation_jobs` — include: `batch_id`, `parent_job_id`, `type` enum
  - Empty tables: `teams`, `api_keys`, `analytics_events`
  - All tables: `created_at`, `updated_at`, `deleted_at`, `version`
- [ ] Migration `0001_initial_schema` — run cleanly, no errors
- [ ] Seed script — 3 test users (free / pro / admin tiers), 5 sample images

### Infrastructure
- [ ] Docker Compose — PostgreSQL 16, Redis 7, all Node services (stub `200 /health`), FastAPI (stub)
- [ ] Railway projects created — one per service, linked to GitHub repo, watch paths configured
- [ ] Vercel projects created — `apps/web` and `apps/admin`, build commands set
- [ ] GitHub Actions CI pipeline — `lint → typecheck → test → build` (all green on empty project)
- [ ] Dependabot config — weekly PRs for npm + Python deps
- [ ] gitleaks — secret scanning on every push

### Documentation
- [ ] `CLAUDE.md` — full initial version committed to repo root
- [ ] ADR-0001 through ADR-0007 written in `/docs/adr/`
- [ ] `README.md` — full local setup guide (clone → pnpm install → docker-compose up → working)
- [ ] All feature flags created in LaunchDarkly dev environment (default OFF, core ON)

### Sprint 0 Acceptance Criteria
- `docker-compose up` starts all services with no errors
- `pnpm test` runs and passes on empty project
- CI pipeline is green on every push
- `pnpm prisma migrate dev` runs with no errors
- All 17 feature flags exist in LaunchDarkly dev environment

---

## Sprint 1 — Auth Service
**Week 3 · Goal: Secure, production-ready authentication with Google OAuth and JWT rotation**

### Auth Service — API
- [ ] Express 5 app skeleton — health check, error handler, request ID middleware
- [ ] `POST /api/v1/auth/register` — Zod validation, bcrypt(12), email uniqueness, 201 + token
- [ ] `POST /api/v1/auth/login` — verify creds, issue RS256 access token (15 min) + refresh token (7 days)
- [ ] `POST /api/v1/auth/refresh` — rotate refresh token, detect reuse → revoke family
- [ ] `POST /api/v1/auth/logout` — revoke refresh token, add jti to Redis blacklist
- [ ] `GET  /api/v1/auth/google` — OAuth2 redirect with PKCE + state param
- [ ] `GET  /api/v1/auth/google/callback` — exchange code, upsert user, issue tokens
- [ ] `POST /api/v1/auth/2fa/setup` — generate TOTP secret + QR code (Google Authenticator compatible)
- [ ] `POST /api/v1/auth/2fa/verify` — verify TOTP, mark 2FA enabled on user record
- [ ] Refresh token: httpOnly + SameSite=Strict + Secure cookie, 7-day TTL
- [ ] Account lockout — 5 failed attempts → 15-min lockout → unlock on timer
- [ ] Rate limiting — 10 auth requests per 15 min per IP (Redis sliding window)
- [ ] Audit log — write to `audit_log` table on: login, logout, failed attempt, OAuth, 2FA

### API Gateway — Auth Middleware
- [ ] `validateJWT` middleware — verify RS256 signature, check Redis blacklist, attach `req.user`
- [ ] `requireFlag` middleware — evaluate flag per route, return 403 if disabled
- [ ] `requireRole` middleware — RBAC check (user / admin)
- [ ] Helmet.js — CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- [ ] CORS — whitelist Vercel domain + localhost in dev

### Testing — Sprint 1
- [ ] Unit: JWT issue/verify/rotate, bcrypt helper, token family logic, lockout timer
- [ ] Integration: full register → login → refresh → logout cycle (testcontainers PostgreSQL + Redis)
- [ ] Security: token reuse detection → family revocation, rate limit enforcement, lockout behaviour
- [ ] E2E (Playwright): login page renders, form validation errors show, login redirects to dashboard

---

## Sprint 2 — User Service + Frontend Auth
**Week 4 · Goal: Complete auth UI, user profiles, quota engine**

### User Service — API
- [ ] `GET  /api/v1/users/me` — return authenticated user profile
- [ ] `PATCH /api/v1/users/me` — update name, avatar URL
- [ ] `GET  /api/v1/users/me/quota` — return `{ used, limit, resetAt, tier }`
- [ ] Quota middleware — `checkQuota()` — reads Redis cache first, falls back to DB
- [ ] Monthly quota reset — BullMQ cron job at midnight 1st of month

### Notification Service — Email
- [ ] AWS SES integration — verify sender domain
- [ ] `POST /api/v1/notify/email` — internal endpoint, send via SES
- [ ] Welcome email — triggered on register
- [ ] Email verification — token link, `POST /api/v1/auth/verify-email`

### Frontend — Auth UI
- [ ] React Router setup — public routes, `<ProtectedRoute>` HOC, redirect logic
- [ ] `packages/store` — `authSlice`: `user`, `isAuthenticated`, `login()`, `logout()`, `setUser()`
- [ ] `packages/api-client` — JWT interceptor: attach access token, auto-refresh on 401
- [ ] **Home / Landing page** — hero section, feature highlights, pricing tiers, "Get Started" CTA
- [ ] **Login page** — email/password form (RHF + Zod), Google OAuth button, error display
- [ ] **Sign Up page** — registration form, password strength indicator, T&C checkbox, email sent state
- [ ] **Dashboard page** — skeleton: quota bar widget, welcome message, empty recent images grid
- [ ] `useCurrentUser()` hook — TanStack Query wrapper for `/api/v1/users/me`
- [ ] `useQuota()` hook — TanStack Query wrapper for quota endpoint

### Testing — Sprint 2
- [ ] Unit: quota engine logic, authSlice actions, form validation schemas
- [ ] Integration: register → email verify → login → quota check cycle
- [ ] E2E: full signup flow, Google OAuth flow (mocked), protected route redirect

---

## Sprint 3 — Image Service + Job Queue + S3
**Week 5 · Goal: Async image generation job system end-to-end (AI mocked)**

### Image Service — API
- [ ] `POST /api/v1/images/generate` — validate JWT + quota + flag → create job → enqueue → 202 + `{ jobId }`
- [ ] `GET  /api/v1/images/jobs/:id` — poll job status: `{ status, imageUrl?, error? }`
- [ ] `GET  /api/v1/images` — list user images, paginated (cursor-based), soft-delete filtered
- [ ] `GET  /api/v1/images/:id` — single image with metadata
- [ ] `POST /api/v1/images/:id/save` — save to collection
- [ ] `DELETE /api/v1/images/:id` — soft delete (set `deleted_at`)
- [ ] `GET  /api/v1/images/collections` — list user collections
- [ ] `POST /api/v1/images/collections` — create collection
- [ ] `GET  /api/v1/images/upload-url` — return S3 presigned upload URL for img2img

### Image Worker
- [ ] BullMQ worker setup — connect to Redis, consume `image-generation` queue
- [ ] Job processor: `PENDING → PROCESSING → call AI service → upload S3 → COMPLETED | FAILED`
- [ ] S3 upload — multipart for large files, tag with `userId` + `jobId`, return CloudFront URL
- [ ] Retry: 3 attempts, exponential backoff (1s, 5s, 30s), dead-letter queue after 3 failures
- [ ] Job timeout: 60s max — mark FAILED if AI service doesn't respond

### S3 + CloudFront Setup
- [ ] Terraform: S3 buckets (`generated`, `uploads`), CloudFront distribution, OAI policy
- [ ] Image naming: `{userId}/{YYYY}/{MM}/{jobId}.webp`
- [ ] Lifecycle rules: Standard → IA (30 days), Glacier (90 days) for free-tier users

### Feature Flag Guards
- [ ] `POST /generate` guarded by `requireFlag('image.text_generation.enabled')`
- [ ] Separate `POST /generate/image` endpoint guarded by `requireFlag('image.img2img.enabled')`

### Testing — Sprint 3
- [ ] Unit: job state machine, S3 URL generation, retry logic, quota decrement
- [ ] Integration: full job lifecycle with mocked AI service and testcontainers
- [ ] Flag test: flag OFF → POST /generate returns 403 FEATURE_DISABLED
- [ ] E2E: job creation returns 202, polling returns COMPLETED with image URL

---

## Sprint 4 — FastAPI AI Service
**Week 6 · Goal: AI service with provider abstraction, safety slot, and model registry**

### FastAPI Service
- [ ] FastAPI app skeleton — Uvicorn, CORS (Railway private network only), structured logging
- [ ] `POST /generate/text` — accept `{ prompt, model, aspectRatio, quality }`, run safety slot, call provider
- [ ] `POST /generate/image` — accept `{ imageUrl, prompt, strength, model }`, img2img generation
- [ ] `GET  /models` — list model registry (filtered by `ai.model_selector.enabled` flag)
- [ ] `GET  /health` — provider reachability check, queue depth
- [ ] `GET  /metrics` — Prometheus metrics: `generation_total`, `generation_duration_seconds`, `generation_errors_total`

### Provider Implementation
- [ ] `ProviderRegistry` class — route to correct provider by model name
- [ ] `StabilityAIProvider` — SDXL primary, async HTTP calls, error handling
- [ ] `OpenAIProvider` — DALL-E 3 fallback
- [ ] `HuggingFaceProvider` — secondary fallback
- [ ] `LocalDiffusersProvider` — dev/Docker Compose only (small model, no GPU needed)
- [ ] Provider failover: Stability → OpenAI → HuggingFace → raise error

### Safety Middleware Slot
- [ ] `ai-service/middleware/safety.py` — `async def safety_check(prompt, image_bytes) -> SafetyResult`
- [ ] v1 implementation: always returns `SafetyResult(passed=True, score=0.0)` (pass-through)
- [ ] `SAFETY_ENABLED` env var — when `false`, skip slot entirely
- [ ] `ai.safety_check.enabled` flag check at FastAPI startup
- [ ] Document clearly: "Replace this function to enable safety checking"

### Testing — Sprint 4
- [ ] pytest: provider routing logic, safety slot pass-through, model registry filtering
- [ ] Integration: mock Stability AI → full pipeline → S3 upload → job COMPLETED
- [ ] Fallback test: Stability AI returns 429 → falls through to OpenAI
- [ ] Safety slot: future test scaffold — `test_safety_enabled.py` with skipped tests

---

## Sprint 5 — Frontend Generation UI + Real-time Updates
**Week 7 · Goal: Complete generate-by-text and generate-by-image UI with SSE status**

### Generate by Text Page
- [ ] Prompt textarea — character counter, placeholder examples, Zod validation (min 3 chars)
- [ ] Model info display — shows current model name (hidden until `ai.model_selector.enabled` ON)
- [ ] Aspect ratio selector — 1:1, 16:9, 9:16, 4:3 (maps to width/height in request)
- [ ] Quality slider — Standard / HD (maps to steps parameter)
- [ ] Submit → create job → store `jobId` in TanStack Query mutation result
- [ ] SSE connection — `useJobStatus(jobId)` hook, reconnect on disconnect, timeout after 60s
- [ ] Loading state — animated gradient placeholder with blurhash when available
- [ ] Success state — image display with download + save + regenerate buttons
- [ ] Error state — clear message, retry button, quota exceeded → upgrade CTA

### Generate by Image Page
- [ ] Drag-drop zone (`react-dropzone`) — accept PNG/JPEG/WEBP, max 10 MB, preview thumbnail
- [ ] Client-side compression (`browser-image-compression`) — target < 1 MB before upload
- [ ] Crop UI (`react-image-crop`) — optional crop before sending
- [ ] Direct S3 upload — fetch presigned URL → PUT directly to S3 (no server memory used)
- [ ] Strength slider — 0.1 to 1.0, labelled "Subtle change → Reimagine completely"
- [ ] Prompt input — same component as text generation
- [ ] Submit → job flow same as text generation
- [ ] Entire page hidden when `image.img2img.enabled` flag is OFF

### Saved Images Page
- [ ] `useImages()` hook — TanStack Query, cursor pagination, `invalidateQueries` on save/delete
- [ ] `react-photo-album` — justified grid layout, responsive columns
- [ ] `react-lazy-load-image-component` — lazy load with blurhash blur-up transition
- [ ] `yet-another-react-lightbox` (YARL) — click image → fullscreen, keyboard nav, download
- [ ] Filter bar — by date range, model, aspect ratio
- [ ] Search — by prompt text (debounced, calls `/api/v1/images?search=...`)
- [ ] Bulk select — select multiple → delete, add to collection
- [ ] Empty state — illustrated empty state with "Generate your first image" CTA

### Image Detail Page
- [ ] `react-zoom-pan-pinch` — smooth zoom/pan, double-tap to zoom on mobile
- [ ] Metadata panel — prompt, model, dimensions, seed, generation time, date
- [ ] Actions — download (full res), save to collection, share link (copy URL), delete
- [ ] Related generations — same prompt, different seeds (future placeholder shown)

### Dashboard
- [ ] Recent images grid — last 8 images, `react-photo-album` masonry
- [ ] Quota bar — `used / limit` progress bar, colour: green < 70%, amber < 90%, red ≥ 90%
- [ ] Quick action card — "Generate new image" → routes to /generate/text
- [ ] Stats row — total generated, saved, collections

### Testing — Sprint 5
- [ ] Unit: `useJobStatus` SSE hook, `useImages` pagination, upload compression helper
- [ ] E2E (Playwright): full text generation flow, img2img flow, save image, gallery lightbox
- [ ] Flag test: img2img tab hidden when flag OFF, tab visible when flag ON

---

## Sprint 6 — Security Hardening + Observability
**Weeks 8–9 · Goal: OWASP clean, full observability stack wired**

### Security
- [ ] OWASP ZAP baseline scan on staging — zero high findings target
- [ ] Helmet.js audit — confirm all headers present on every service
- [ ] Input sanitisation audit — every user input passes Zod schema before processing
- [ ] SQL injection audit — confirm all queries use Prisma parameterisation (no raw `$queryRaw` without review)
- [ ] SSRF protection — whitelist AI provider domains in api-gateway proxy, block RFC 1918 ranges
- [ ] Prompt injection hardening — strip special chars from prompts before AI provider call
- [ ] Audit log completeness — every data mutation writes to `audit_log` (automated test)
- [ ] Rate limit testing — verify 429 responses, per-tier limits enforced
- [ ] Token security audit — confirm httpOnly cookie, SameSite=Strict, no token in localStorage
- [ ] gitleaks — no secrets in git history scan

### Observability — Sentry
- [ ] Sentry browser SDK in `apps/web` — source maps uploaded on Vercel deploy
- [ ] Sentry Node SDK in all services — unhandled rejection capture, request breadcrumbs
- [ ] Sentry Python SDK in `ai-service`
- [ ] Performance tracing — sample 20% of requests, trace from api-gateway through service
- [ ] Alert rules: error rate > 1% → Slack notification

### Observability — Logging
- [ ] Railway log drain → Logtail (or Papertrail) — all services streaming
- [ ] Logtail alert: `level:error` count > 10/min → Slack webhook
- [ ] Confirm: no PII in logs (automated log scan in CI — grep for email pattern)

### Observability — Metrics
- [ ] Prometheus scrape endpoints on all services (`/metrics`)
- [ ] Grafana Cloud free tier — connect to Railway services via Prometheus remote write
- [ ] Dashboard: API P95 latency, generation success rate, queue depth, active jobs
- [ ] Alert: P99 > 2s → PagerDuty; generation failure rate > 5% → Slack

### Observability — Tracing
- [ ] OpenTelemetry SDK in all Node services — trace context propagation via `X-Trace-Id` header
- [ ] Honeycomb free tier — visualise traces across api-gateway → service → worker → AI

### Uptime Monitoring
- [ ] Checkly — synthetic monitor for login flow + generate flow, runs every 5 min
- [ ] Alert: 2 consecutive failures → PagerDuty

### Testing — Sprint 6
- [ ] k6 load test: 100 concurrent users, 5-minute sustained, P95 < 200ms for API
- [ ] OWASP ZAP scan — zero high/critical findings on staging
- [ ] Rate limit test: 429 returned correctly at tier limits
- [ ] Audit log test: every mutation in integration tests asserts `audit_log` row created

---

## Sprint 7 — Analytics + Testing Completion
**Week 10 · Goal: Full analytics pipeline, all 8 E2E flows green, coverage gates met**

### Analytics Service
- [ ] `POST /api/v1/events` — ingest event, validate schema (Zod), write to `analytics_events` table
- [ ] Background sync — BullMQ job syncs rows to ClickHouse (Railway service) every 5 min
- [ ] `packages/utils/analytics.ts` — `track(event, properties)` called consistently across frontend + backend
- [ ] All events wired per taxonomy (see HLD §11)
- [ ] PostHog self-hosted on Railway — receive events, funnel analysis, session replay configured

### A/B Testing
- [ ] `ui.new_dashboard.enabled` flag — two variants wired to PostHog experiment
- [ ] Dashboard page renders `control` or `variant_a` layout based on flag evaluation
- [ ] `flag_evaluated` + `experiment_exposure` events fired on page load

### Testing Completion
- [ ] Pact.io contract tests — api-gateway ↔ auth-service, image-service ↔ ai-service
- [ ] Chromatic visual regression — all `packages/ui` components snapshotted
- [ ] Coverage gates enforced in CI — builds fail below 85% unit / 70% integration
- [ ] All 8 E2E flows green and stable in CI (retry max 1)
- [ ] k6 performance test — 200 concurrent users, 10 min sustained, P95 < 200ms

### Testing — Sprint 7
- [ ] Pact contract tests green — both boundaries
- [ ] Analytics: assert events fire correctly in E2E tests (PostHog test API)
- [ ] A/B test: assert both variants render without errors

---

## Sprint 8 — Production Deploy + Launch Readiness
**Weeks 11–12 · Goal: Production live, monitored, canary-deployed, runbook complete**

### Railway Production
- [ ] Create Railway production environment — all services, production env vars set
- [ ] Private networking verified — all internal service calls use `.railway.internal` hostnames
- [ ] Health checks configured — Railway restarts unhealthy containers automatically
- [ ] Resource limits set per service — prevent noisy-neighbour issues
- [ ] PostgreSQL production — Railway managed, daily backups enabled, point-in-time restore tested
- [ ] Redis production — Railway managed, maxmemory-policy `allkeys-lru` configured

### Vercel Production
- [ ] Custom domain connected — SSL automatic via Vercel
- [ ] Environment variables set — production API URL, LaunchDarkly client key, Sentry DSN
- [ ] Preview deploy protection — require auth for non-production previews

### Deploy Pipeline
- [ ] GitHub Actions — deploy to staging on merge to main
- [ ] Staging E2E run — Playwright against staging, block production if fails
- [ ] Manual promote step — GitHub Actions `workflow_dispatch` to promote staging → production
- [ ] Smoke tests post-deploy — automated: health checks + login + generate + save
- [ ] Rollback plan — Railway instant rollback to previous deploy (one click)

### LaunchDarkly Production
- [ ] Production environment created — all flags configured, defaults verified
- [ ] Core flags ON: `image.text_generation.enabled`, `image.img2img.enabled`
- [ ] All Phase 2+ flags OFF in production
- [ ] SDK key stored in Railway production secrets

### AWS Production
- [ ] S3 production buckets created — versioning enabled, MFA delete on generated bucket
- [ ] CloudFront production distribution — HTTPS only, HSTS headers
- [ ] SES production — out of sandbox, sending limits appropriate for launch volume
- [ ] IAM roles — principle of least privilege, no root credentials used

### Runbook & Operations
- [ ] Runbook written: `/docs/runbook.md` — on-call guide, incident severity levels
- [ ] Incident response playbook — P1/P2/P3 escalation paths
- [ ] Rollback procedure documented and tested
- [ ] Backup restore tested — restore PostgreSQL from backup to staging, verify data
- [ ] On-call rotation set up — at least 2 people with Railway + AWS access

### Launch Checklist
- [ ] All 8 E2E flows passing on production (post-deploy smoke run)
- [ ] Zero high Sentry errors in first 30 min
- [ ] Checkly synthetic monitors green
- [ ] Grafana dashboards showing real traffic
- [ ] Rate limiting verified under real traffic
- [ ] LaunchDarkly streaming confirmed (flag changes take effect in < 2s on production)

---

## Feature Phases — Post-Launch Roadmap

### Phase 2 — Month 2–3
| Feature | Flag to enable | Estimated effort |
|---|---|---|
| Batch Image Generation | `image.batch_generation.enabled` | 3 days |
| AI Upscaling (4x) | `image.upscaling.enabled` | 3 days |
| AI Model Selector | `ai.model_selector.enabled` | 2 days |
| Style Presets | `ai.style_presets.enabled` | 2 days |
| Dark Mode | `ui.dark_mode.enabled` | 1 day |
| Stripe Billing | `payments.stripe.enabled` | 1 week |
| Admin Dashboard | `admin.dashboard.enabled` | 3 days |

### Phase 3 — Month 4–6
| Feature | Flag to enable | Notes |
|---|---|---|
| NSFW Safety Check | `ai.safety_check.enabled` | Implement `safety.py`, deploy NudeNet |
| Image Inpainting | `image.inpainting.enabled` | `react-konva` mask UI + FastAPI `/inpaint` |
| Credit System | `payments.credits.enabled` | `credits_ledger` table already in schema |
| Public Profiles | `user.social_profiles.enabled` | `is_public` col already in `users` |
| Team Workspaces | `user.teams.enabled` | `teams` table already exists |
| Developer API Access | `user.api_access.enabled` | `api_keys` table already exists |

### Phase 4 — Month 7+
| Feature | Notes |
|---|---|
| Text/Image to Video | New `video-service` Railway service, GPU worker |
| Mobile App | React Native, reuses all `packages/*` |
| Custom Model Fine-tuning | S3 model storage, training pipeline |

---

## Environment Variables Reference

### All Services
```bash
NODE_ENV=development|staging|production
LOG_LEVEL=debug|info|warn|error
SERVICE_NAME=auth-service         # Used in structured logs + traces
RAILWAY_ENVIRONMENT=dev|staging|production
```

### Auth Service
```bash
JWT_PRIVATE_KEY=<RS256 PEM>
JWT_PUBLIC_KEY=<RS256 PEM>
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=604800
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

### Image Service
```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_BUCKET_GENERATED=prod-ai-images-generated
AWS_BUCKET_UPLOADS=prod-ai-images-uploads
CLOUDFRONT_DOMAIN=https://cdn.yourdomain.com
AI_SERVICE_URL=http://ai-service.railway.internal:8000
```

### FastAPI AI Service
```bash
STABILITY_API_KEY=
OPENAI_API_KEY=
HUGGINGFACE_API_KEY=
SAFETY_ENABLED=false              # Set true when ai.safety_check.enabled flag ON
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_GENERATED=
```

### Feature Flags (All Services + Frontend)
```bash
LAUNCHDARKLY_SDK_KEY=             # Server-side SDK key (Node.js services)
VITE_LAUNCHDARKLY_CLIENT_KEY=     # Client-side key (Vercel frontend)
UNLEASH_URL=                      # Dev self-hosted fallback
UNLEASH_CLIENT_SECRET=
FEATURE_FLAGS_PROVIDER=launchdarkly|unleash|static
```

---

## Common Commands

```bash
# Local dev
pnpm install
docker-compose up                           # Start all infra (DB, Redis, services)
pnpm dev --filter=web                       # Start frontend only
pnpm dev --filter=auth-service              # Start one service

# Tests
pnpm test                                   # Run all tests
pnpm turbo test --filter=...affected        # Only affected packages
pnpm test:e2e                               # Playwright E2E

# Database
cd services/image-service
pnpm prisma migrate dev --name description  # New migration
pnpm prisma studio                          # DB UI

# Build
pnpm build                                  # Build all (Turborepo cached)
pnpm turbo build --filter=web               # Build single app

# Type check + lint
pnpm typecheck
pnpm lint

# API client regeneration (after OpenAPI spec change)
pnpm run generate:api-client

# Railway deploy (via CLI)
railway up --service auth-service
```

---

## Architecture Decision Log

| ADR | Decision | Status |
|---|---|---|
| ADR-0001 | Turborepo over Nx — simpler config, Vercel-native | Accepted |
| ADR-0002 | TanStack Query for server state — not Redux RTK Query | Accepted |
| ADR-0003 | FastAPI for AI service — Python ML ecosystem | Accepted |
| ADR-0004 | LaunchDarkly + Unleash fallback for feature flags | Accepted |
| ADR-0005 | BullMQ over SQS — Railway-native, simpler setup | Accepted |
| ADR-0006 | Prisma with soft deletes — never hard-delete user content | Accepted |
| ADR-0007 | RS256 JWT with refresh token rotation + family revocation | Accepted |
| ADR-0008 | Railway + Vercel over Kubernetes — zero-ops, faster iteration | Accepted |
| ADR-0009 | Safety middleware as pass-through slot — enable in Phase 3 | Accepted |

---

*This plan is a living document. Update sprint tasks as work progresses. Add new ADRs for non-trivial decisions. Keep CLAUDE.md in sync.*
