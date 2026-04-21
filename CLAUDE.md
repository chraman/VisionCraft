# CLAUDE.md — AI Image Creation Platform

> **Read this entire file before writing any code, creating any files, or suggesting any changes.**
> This is the single source of truth for AI coding agents (Claude Code, Cursor, Copilot, etc.) working on this codebase.
> Companion document: `/docs/HLD_v3_FINAL.docx` · Implementation plan: `/docs/IMPLEMENTATION_PLAN.md`

---

## 1. Project Identity

| Field           | Value                                                 |
| --------------- | ----------------------------------------------------- |
| Project         | AI Image Creation Platform                            |
| HLD Version     | v3.0 — FINAL                                          |
| Frontend        | React 18 + TypeScript · hosted on **S3 + CloudFront** |
| Backend         | Node.js microservices · hosted on **ECS Fargate**     |
| AI Service      | FastAPI (Python 3.11) · hosted on **ECS Fargate**     |
| Monorepo        | Turborepo + pnpm workspaces                           |
| Node version    | 20 LTS                                                |
| Python version  | 3.11                                                  |
| Package manager | pnpm (never npm, never yarn)                          |

---

## 2. Repository Structure

```
ai-image-platform/
├── apps/
│   ├── web/                        # Main React 18 user app (Vite)
│   └── admin/                      # Admin dashboard — Phase 2, flag-gated
├── packages/
│   ├── ui/                         # Shared component library (shadcn/ui base, fully owned)
│   ├── api-client/                 # Typed Axios client — generated from OpenAPI spec
│   ├── store/                      # Zustand slices shared across apps
│   ├── types/                      # Shared TypeScript interfaces & DTOs
│   ├── feature-flags/              # Flag client — wraps LaunchDarkly + static fallback
│   ├── utils/                      # Winston logger, analytics tracker, formatters, validators
│   └── config/                     # Zod env schemas per service, shared constants
├── services/
│   ├── api-gateway/                # BFF — routing, JWT validation, rate limiting, flag middleware
│   ├── auth-service/               # JWT RS256, Google OAuth2, 2FA, RBAC, audit log
│   ├── user-service/               # Profile CRUD, quota engine, subscription tier
│   ├── image-service/              # Job CRUD, S3 URLs, save/delete, collections
│   ├── notification-service/       # Email (AWS SES), SSE push, in-app events
│   └── analytics-service/          # Event ingestion, ClickHouse writer
├── ai-service/                     # FastAPI Python — text2img, img2img, model registry
├── workers/
│   └── image-worker/               # BullMQ worker — consumes generation queue
├── infra/
│   ├── terraform/                  # Full AWS infra — VPC, ECS, RDS, ElastiCache, ALB, S3, CloudFront
│   ├── railway/                    # Deprecated — services now run on ECS Fargate
│   └── scripts/                    # DB seed, migration helpers, dev utilities
├── e2e/                            # Playwright test suite — all 8 critical flows
├── docs/
│   ├── HLD_v3_FINAL.docx           # Final architecture document
│   ├── IMPLEMENTATION_PLAN.md      # Sprint-level plan
│   └── adr/                        # Architecture Decision Records (markdown)
├── CLAUDE.md                       # You are here
├── turbo.json                      # Turborepo pipeline config
├── pnpm-workspace.yaml
└── README.md
```

---

## 3. Package Dependency Rules

These are hard rules. Never violate them.

| Package                  | Can import                                              | Cannot import                      |
| ------------------------ | ------------------------------------------------------- | ---------------------------------- |
| `apps/web`               | `packages/*` · service types only                       | Service runtime code directly      |
| `apps/admin`             | `packages/*` · service types only                       | Service runtime code directly      |
| `packages/ui`            | `packages/types` · `packages/utils`                     | `apps/*` · `services/*`            |
| `packages/feature-flags` | `packages/types`                                        | `apps/*` · `services/*`            |
| `packages/store`         | `packages/types` · `packages/api-client`                | `apps/*`                           |
| `packages/api-client`    | `packages/types`                                        | `apps/*` · `services/*`            |
| `services/*`             | `packages/types` · `packages/utils` · `packages/config` | Other services directly — use HTTP |
| `ai-service`             | Python stdlib + pip packages only                       | Node packages                      |

---

## 4. Tech Stack — Quick Reference

### Frontend (`apps/web`, `apps/admin`)

| Concern        | Library                      | Notes                                                 |
| -------------- | ---------------------------- | ----------------------------------------------------- |
| Framework      | React 18 + TypeScript strict | Concurrent mode, StrictMode enabled                   |
| Build          | Vite 5                       | Fast HMR, native ESM                                  |
| Routing        | React Router v6              | Loader-based data fetching, code splitting            |
| Server state   | TanStack Query v5            | Cache, deduplication, SSE support, optimistic updates |
| Global state   | Zustand 5                    | Typed slices, no providers needed                     |
| Forms          | React Hook Form + Zod        | Zero re-renders, schema-first validation              |
| Styling        | Tailwind CSS v3              | JIT, design tokens, `dark:` classes ready throughout  |
| Components     | `packages/ui` (shadcn/ui)    | Fully owned — not an npm dependency                   |
| Feature flags  | `packages/feature-flags`     | `useFlag()` hook — never inline boolean hacks         |
| Error tracking | Sentry browser SDK           | Source maps uploaded on CI deploy                     |
| Analytics      | PostHog browser SDK          | Funnels, session replay, A/B tests                    |

### Image Libraries (frontend)

| Library                           | Used on                       | Purpose                                       |
| --------------------------------- | ----------------------------- | --------------------------------------------- |
| `react-dropzone`                  | img2img, any upload           | Drag-drop, validation, preview URLs           |
| `browser-image-compression`       | img2img upload                | Compress to < 1 MB before S3 presigned upload |
| `react-image-crop`                | img2img upload                | Crop before sending to AI provider            |
| `blurhash`                        | All image displays            | Blurred placeholder while image loads         |
| `react-lazy-load-image-component` | Saved Images gallery          | IntersectionObserver lazy load + blur-up      |
| `react-photo-album`               | Saved Images gallery          | Justified/masonry grid, optimal row layout    |
| `yet-another-react-lightbox`      | Gallery, image detail         | Fullscreen lightbox, keyboard nav, zoom       |
| `react-zoom-pan-pinch`            | Image detail page             | Smooth zoom/pan on high-res AI images         |
| `react-konva`                     | Inpainting (Phase 3, flagged) | Canvas mask drawing for inpainting            |

### Backend (Node.js services)

| Concern     | Library                           | Notes                                                           |
| ----------- | --------------------------------- | --------------------------------------------------------------- |
| Framework   | Express 5                         | Native async error handling                                     |
| Validation  | Zod                               | All req/res schemas — shared with frontend via `packages/types` |
| ORM         | Prisma 5                          | Type-safe, migrations in git, soft deletes                      |
| Job queue   | BullMQ + Redis                    | Retry, exponential backoff, dead-letter queue                   |
| HTTP client | Axios                             | Typed, JWT interceptor, automatic retry                         |
| Auth        | Passport.js + jsonwebtoken        | RS256 asymmetric keys, strategy registry                        |
| API docs    | swagger-jsdoc                     | OpenAPI 3.1, auto-generated, always in sync                     |
| Logging     | Winston                           | Structured JSON — see §9                                        |
| Testing     | Jest + Supertest + testcontainers | Unit + integration against real DB                              |

### AI Service (Python/FastAPI)

| Concern            | Library                 |
| ------------------ | ----------------------- |
| Framework          | FastAPI + Uvicorn       |
| Primary AI         | Stability AI SDK (SDXL) |
| Fallback AI        | OpenAI SDK (DALL-E 3)   |
| Secondary fallback | HuggingFace via `httpx` |
| Image processing   | Pillow                  |
| Testing            | pytest + httpx          |

### Infrastructure

| Concern             | Tool                                                                     |
| ------------------- | ------------------------------------------------------------------------ |
| Frontend hosting    | S3 + CloudFront (SPA static hosting)                                     |
| Backend hosting     | ECS Fargate (containerized microservices, private VPC)                   |
| Container registry  | ECR (one repository per service)                                         |
| Database            | RDS PostgreSQL 16 (Multi-AZ)                                             |
| Cache / Queue       | ElastiCache Redis 7                                                      |
| Load balancer       | Application Load Balancer (public HTTPS to api-gateway only)             |
| Object storage      | AWS S3 + CloudFront CDN                                                  |
| Email               | AWS SES                                                                  |
| Feature flags       | LaunchDarkly (prod) / Unleash self-hosted (dev)                          |
| Error tracking      | Sentry (frontend + backend + Python)                                     |
| Uptime / synthetics | Checkly                                                                  |
| Metrics dashboards  | Grafana Cloud free + Prometheus                                          |
| Distributed tracing | OpenTelemetry + Honeycomb free tier                                      |
| Log aggregation     | CloudWatch Logs → Logtail                                                |
| IaC                 | Terraform (full infra — VPC, ECS, RDS, ElastiCache, ALB, S3, CloudFront) |
| CI/CD               | GitHub Actions                                                           |
| E2E                 | Playwright                                                               |
| Performance testing | k6                                                                       |
| Security scanning   | OWASP ZAP (CI, staging) + Snyk                                           |
| Visual regression   | Chromatic                                                                |
| Contract testing    | Pact.io                                                                  |

---

## 5. ⭐ Feature Flag System — Complete Reference

Feature flags are a **first-class architectural concern**. Every user-facing feature, every A/B test, and every Phase 2+ capability is controlled by a flag. This is non-negotiable.

### 5.1 Provider Setup

| Environment | Provider                                                   | Update latency         |
| ----------- | ---------------------------------------------------------- | ---------------------- |
| Production  | LaunchDarkly (SDK key from Secrets Manager)                | < 1s streaming         |
| Staging     | LaunchDarkly (staging environment)                         | < 1s streaming         |
| Development | Unleash (Docker Compose container)                         | < 1s                   |
| CI / tests  | `flags.test.json` (static file)                            | Immediate — no network |
| Fallback    | `flags.default.json` (bundled in `packages/feature-flags`) | On deploy              |

Fallback behaviour: core generation features ON, all billing/payments OFF, admin OFF.

### 5.2 Flag Naming Convention

```
<domain>.<feature>.enabled

Examples:
  image.text_generation.enabled
  image.img2img.enabled
  ai.model_selector.enabled
  ui.dark_mode.enabled
  payments.stripe.enabled
  admin.dashboard.enabled
```

### 5.3 Complete Flag Registry

**Keep this table up to date.** Every new flag must be added here before code is written.

| Flag key                         | Type    | v1 default | Phase      | Description                              |
| -------------------------------- | ------- | ---------- | ---------- | ---------------------------------------- |
| `image.text_generation.enabled`  | boolean | **ON**     | 1 — Stable | Core text-to-image generation            |
| `image.img2img.enabled`          | boolean | **ON**     | 1 — Stable | Image-to-image generation                |
| `image.batch_generation.enabled` | boolean | OFF        | 2          | Generate multiple images per request     |
| `image.upscaling.enabled`        | boolean | OFF        | 2          | AI 4x super-resolution upscaling         |
| `image.inpainting.enabled`       | boolean | OFF        | 3          | Edit image regions with canvas mask      |
| `image.video_generation.enabled` | boolean | OFF        | 4          | Text/image to video generation           |
| `ai.model_selector.enabled`      | boolean | OFF        | 2          | User chooses AI model from registry      |
| `ai.style_presets.enabled`       | boolean | OFF        | 2          | One-click style preset buttons           |
| `ai.safety_check.enabled`        | boolean | OFF        | 3          | Enable NSFW safety middleware in FastAPI |
| `ui.dark_mode.enabled`           | boolean | OFF        | 2          | Dark theme toggle in settings            |
| `ui.new_dashboard.enabled`       | string  | `control`  | 2          | A/B test — `control` or `variant_a`      |
| `payments.stripe.enabled`        | boolean | OFF        | 2          | Stripe subscription checkout flow        |
| `payments.credits.enabled`       | boolean | OFF        | 3          | Pay-per-generation credit system         |
| `user.social_profiles.enabled`   | boolean | OFF        | 3          | Public gallery + profile page            |
| `user.teams.enabled`             | boolean | OFF        | 3          | Team workspaces + shared collections     |
| `user.api_access.enabled`        | boolean | OFF        | 3          | Developer API key management             |
| `admin.dashboard.enabled`        | boolean | OFF        | 2          | Admin app — restricted to admin role     |

### 5.4 Using Flags — Frontend

```tsx
import { useFlag, useFlags } from '@ai-platform/feature-flags';

// Single flag
const isImg2ImgEnabled = useFlag('image.img2img.enabled');

// Multiple flags
const { 'ui.dark_mode.enabled': darkMode } = useFlags(['ui.dark_mode.enabled']);

// Guard a section
{
  isImg2ImgEnabled && <GenerateByImageTab />;
}

// Guard a whole route
<ProtectedRoute flag="image.img2img.enabled">
  <GenerateByImagePage />
</ProtectedRoute>;

// ❌ NEVER do this
const isEnabled = process.env.VITE_SHOW_IMG2IMG === 'true'; // wrong
const BATCH_ENABLED = false; // wrong
```

### 5.5 Using Flags — Backend

```typescript
// api-gateway/middleware/featureFlag.ts
import { flagClient } from '@ai-platform/feature-flags/server';

export const requireFlag =
  (flagKey: string) => async (req: Request, res: Response, next: NextFunction) => {
    const enabled = await flagClient.isEnabled(flagKey, {
      userId: req.user?.id,
      tier: req.user?.tier,
    });
    if (!enabled) {
      return res.status(403).json({
        success: false,
        error: { code: 'FEATURE_DISABLED', message: 'Feature not available' },
      });
    }
    next();
  };

// Apply to any route:
router.post('/generate/text', requireFlag('image.text_generation.enabled'), handler);
```

### 5.6 Flag Lifecycle

```
1. NEW FEATURE  →  Create flag in LaunchDarkly (default: OFF everywhere)
2. DEVELOPMENT  →  Enable in dev environment only
3. STAGING      →  Enable for QA + internal users (or % rollout)
4. PRODUCTION   →  Canary 5% → 25% → 100% based on metrics
5. STABLE       →  Remove flag + dead code after 2 stable weeks
```

### 5.7 Adding a New Flag — Checklist

- [ ] Create flag in LaunchDarkly dev environment (default OFF)
- [ ] Add to `flags.default.json` and `flags.test.json` in `packages/feature-flags`
- [ ] Add row to the flag registry table in §5.3 of this file
- [ ] Update `packages/types/src/flags.types.ts` with the new key
- [ ] Add `requireFlag()` middleware on the backend route
- [ ] Wrap frontend feature with `useFlag()` check

---

## 6. Adding a New Feature — Complete Checklist

Follow this for every new user-facing feature without exception:

```
[ ] 1.  Create feature flag (default OFF) — update §5.3 of this file
[ ] 2.  Add Prisma migration if DB schema changes needed
[ ] 3.  Add shared types to packages/types
[ ] 4.  Add API route with requireFlag() middleware on api-gateway
[ ] 5.  Update OpenAPI spec (swagger-jsdoc annotations on the route)
[ ] 6.  Regenerate api-client:  pnpm run generate:api-client
[ ] 7.  Implement frontend feature behind useFlag() check
[ ] 8.  Fire analytics event(s) for all user actions (see §10)
[ ] 9.  Write unit tests — ≥ 85% coverage on new code
[ ] 10. Write at least 1 integration test for the new endpoint
[ ] 11. Write at least 1 E2E Playwright test for the happy path
[ ] 12. Update .env.example if new env vars are introduced
[ ] 13. Write ADR in /docs/adr/ if this was a non-trivial architectural decision
[ ] 14. Update this file if a new convention or pattern was introduced
```

---

## 7. Database Conventions

### 7.1 Prisma Rules

- **All mutations go through repository classes** — no raw Prisma calls in route handlers
- **Never `prisma db push`** in any environment — always `prisma migrate dev` (dev) or `prisma migrate deploy` (staging/prod)
- **Soft deletes only** — set `deletedAt`, never call `.delete()` on user-owned records
- **Every table has:** `id` (uuid), `createdAt`, `updatedAt`, `deletedAt` (nullable), `version` (int, optimistic locking), `metadata` (Json, extension point)
- **Migration naming:** `YYYYMMDD_short_description` — descriptive, not numbered
- **No raw `$queryRaw`** without team review and a comment explaining why Prisma ORM can't handle it

### 7.2 Reserved Columns — Do Not Remove

These columns exist in v1 schema for future features. They are nullable and unused in v1:

| Table             | Reserved columns                                         | Unlocked by                      |
| ----------------- | -------------------------------------------------------- | -------------------------------- |
| `users`           | `credits`, `teamId`, `isPublic`, `apiKeyHash`            | Phase 2–3 flags                  |
| `images`          | `stylePreset`, `seed`, `width`, `height`, `collectionId` | Phase 2 flags                    |
| `generation_jobs` | `batchId`, `parentJobId`                                 | `image.batch_generation.enabled` |
| `teams`           | entire table (exists in schema, empty)                   | `user.teams.enabled`             |
| `api_keys`        | entire table (exists in schema, empty)                   | `user.api_access.enabled`        |

### 7.3 Redis Key Patterns

Always use these exact patterns. Don't invent new ones without adding them here:

| Pattern                      | TTL                        | Purpose                                  |
| ---------------------------- | -------------------------- | ---------------------------------------- |
| `revoked:{jti}`              | Access token remaining TTL | Revoked access token blacklist           |
| `ratelimit:{userId}:{route}` | 1 hour                     | Sliding window rate limit counter        |
| `quota:{userId}`             | 1 hour                     | Cached quota — avoids DB hit per request |
| `job:status:{jobId}`         | 2 hours                    | Live job status for SSE polling          |
| `session:{userId}`           | 15 min                     | Session presence cache                   |
| `flag:cache:{userId}`        | 5 min                      | Evaluated flag cache per user            |

---

## 8. API Conventions

### 8.1 Route Structure

```
GET    /api/v1/{resource}              → list (paginated)
GET    /api/v1/{resource}/:id          → get one
POST   /api/v1/{resource}              → create
PATCH  /api/v1/{resource}/:id          → partial update
DELETE /api/v1/{resource}/:id          → soft delete
POST   /api/v1/{resource}/:id/{action} → custom action
```

All routes prefixed `/api/v1/`. Breaking changes go to `/api/v2/`. v(N-1) supported 6 months after vN.

### 8.2 Standard Response Envelope

Every API response — success or error — uses this exact shape:

```typescript
// Success
{ "success": true, "data": T, "requestId": "uuid" }

// Error
{
  "success": false,
  "error": {
    "code": "QUOTA_EXCEEDED",       // SCREAMING_SNAKE, machine-readable
    "message": "Human readable",
    "details": {}                   // optional extra context
  },
  "requestId": "uuid"
}
```

Use `AppError` from `packages/types/src/errors.ts` — never `throw new Error(...)` in service code.

### 8.3 Pagination

Cursor-based for all list endpoints:

```typescript
// Request: ?limit=20&cursor=<lastItemId>&sort=createdAt&order=desc
// Response:
{
  "data": [...],
  "pagination": { "nextCursor": "uuid|null", "hasMore": true, "total": 142 }
}
```

### 8.4 Service-to-Service Communication

- Use ECS Service Connect DNS: `http://auth-service.internal:3001` (private VPC, never public internet)
- Never call another service's database directly
- Never expose internal hostnames in API responses to clients
- All inter-service calls use `packages/api-client` with service-to-service auth header

---

## 9. Logging Standards

Use `logger` from `packages/utils/src/logger.ts` everywhere. `console.log` is banned — ESLint will catch it.

### 9.1 Correct Usage

```typescript
import { logger } from '@ai-platform/utils';

logger.info('Image generation completed', {
  userId: job.userId,
  jobId: job.id,
  provider: job.provider,
  durationMs: Date.now() - job.startedAt,
  model: job.model,
});

logger.error('AI provider call failed', {
  userId: job.userId,
  jobId: job.id,
  provider: job.provider,
  error: err.message, // message only — never the full error object
  attempt: attempt,
});
```

### 9.2 Required Fields on Every Log Line

`timestamp` · `level` · `service` · `traceId` · `requestId` · `userId` (or null) · `action`

### 9.3 Never Log These

- Passwords or password hashes
- JWT tokens (access or refresh)
- API keys (Stability AI, OpenAI, LaunchDarkly)
- Full email addresses in production — log `user@***.com`
- S3 presigned URLs
- Database connection strings
- Full prompt text in error context — truncate to 100 characters

---

## 10. Analytics Events

Use `track()` from `packages/utils/src/analytics.ts`. Every user action must fire an event.

```typescript
import { track } from '@ai-platform/utils/analytics';

track('generation_completed', {
  userId: user.id,
  jobId: job.id,
  provider: 'stability-ai',
  model: 'sdxl',
  durationMs: 12400,
  promptLength: prompt.length,
  success: true,
});
```

All event schemas are typed in `packages/types/src/analytics.types.ts`. Add new event types there before using them.

### Event Taxonomy

| Category    | Events                                                                  |
| ----------- | ----------------------------------------------------------------------- |
| Acquisition | `page_view` · `signup_started` · `signup_completed` · `oauth_clicked`   |
| Engagement  | `login` · `session_start` · `feature_used` · `prompt_submitted`         |
| Generation  | `generation_started` · `generation_completed` · `generation_failed`     |
| Content     | `image_saved` · `image_deleted` · `collection_created` · `image_shared` |
| Conversion  | `upgrade_clicked` · `plan_selected` · `payment_completed`               |
| Errors      | `api_error` · `quota_exceeded` · `safety_rejected` · `upload_failed`    |
| Flags / A/B | `flag_evaluated` · `experiment_exposure` · `variant_assigned`           |

---

## 11. Coding Conventions

### 11.1 TypeScript

- `"strict": true` — no exceptions, no `@ts-ignore` without an explanatory comment
- No `any` — use `unknown` + type narrowing, or generics
- Prefer `type` for unions/intersections; `interface` for extendable shapes
- Use `satisfies` operator for config objects
- All shared types live in `packages/types` — never define the same shape in two places

### 11.2 File Naming

```
React components:      PascalCase.tsx           GenerateImageForm.tsx
React hooks:           use + camelCase.ts        useImageGeneration.ts
Service files:         camelCase.service.ts      imageGeneration.service.ts
Repository files:      camelCase.repository.ts   image.repository.ts
Test files:            *.test.ts                 image.service.test.ts
Type files:            PascalCase.types.ts       GenerationJob.types.ts
Constants:             SCREAMING_SNAKE.ts        API_ROUTES.ts
```

### 11.3 React Component Structure

Always in this order, no exceptions:

```tsx
// 1. External imports
// 2. Internal imports (packages first, then relative)
// 3. Types / interfaces local to this file
// 4. Constants defined outside the component (stable references)
// 5. Component function
//    a. All hooks at the top
//    b. Derived state / useMemo
//    c. Event handlers
//    d. Early returns (loading, error, empty states)
//    e. JSX return
// 6. Named export (not default — except page-level components)
```

### 11.4 Error Handling

```typescript
// ✅ Services — throw AppError
import { AppError } from '@ai-platform/types';
throw new AppError('QUOTA_EXCEEDED', 'Monthly limit reached', 429, { limit, used });

// ✅ Express routes — use asyncHandler wrapper
import { asyncHandler } from '../middleware/asyncHandler';
router.post(
  '/generate',
  asyncHandler(async (req, res) => {
    // thrown errors auto-forwarded to error middleware
  })
);

// ✅ Frontend — TanStack Query + Sentry
const { mutate } = useMutation({
  mutationFn: generateImage,
  onError: (err) => {
    Sentry.captureException(err);
    toast.error(getErrorMessage(err));
  },
});

// ❌ Never
throw new Error('something went wrong'); // no code, untyped
console.error(err); // not structured, not tracked
```

### 11.5 Feature Flag Discipline

```tsx
// ✅ Always use the flag client
const isEnabled = useFlag('image.batch_generation.enabled');

// ❌ Never use env vars for feature control
if (process.env.VITE_BATCH_ENABLED) { ... }

// ❌ Never hardcode feature state
const BATCH_ENABLED = false;
```

---

## 12. AI Service Conventions (FastAPI)

### 12.1 Safety Middleware Slot

The safety check middleware is a **deliberate pass-through in v1**. It must not be removed. The interface is fixed — only the implementation changes when the flag is enabled:

```python
# ai-service/middleware/safety.py

async def safety_check(
    prompt: str | None,
    image_bytes: bytes | None,
) -> SafetyResult:
    """
    v1: Pass-through — always returns passed=True.
    To activate: implement the classifier body here.
    Controlled by: ai.safety_check.enabled feature flag + SAFETY_ENABLED env var.
    """
    return SafetyResult(passed=True, score=0.0, reason=None)
```

The caller does not change when safety is enabled. Only this function body changes.

### 12.2 Adding a New AI Model

Only one step required — add an entry to the model registry:

```python
# ai-service/registry/models.py
MODEL_REGISTRY = {
  "sdxl":       { "provider": "stability",    "version": "stable-diffusion-xl-1024-v1-0" },
  "dalle3":     { "provider": "openai",        "version": "dall-e-3" },
  "sdxl-turbo": { "provider": "huggingface",   "repo": "stabilityai/sdxl-turbo" },
  # Add here — nothing else changes
}
```

### 12.3 Provider Failover Order

Stability AI → OpenAI DALL-E 3 → HuggingFace → raise `ProviderUnavailableError`

---

## 13. Testing Requirements

| Level             | Tool                              | Min coverage                 | Run command                            |
| ----------------- | --------------------------------- | ---------------------------- | -------------------------------------- |
| Unit — frontend   | Vitest + Testing Library          | 85% per package              | `pnpm test:unit --filter=web`          |
| Unit — backend    | Jest                              | 85% per service              | `pnpm test:unit --filter=auth-service` |
| Integration       | Jest + Supertest + testcontainers | 70% per service              | `pnpm test:integration`                |
| Contract          | Pact.io                           | All service boundaries       | `pnpm test:contract`                   |
| E2E               | Playwright                        | All 8 critical flows         | `pnpm test:e2e`                        |
| Performance       | k6                                | Key endpoints                | `pnpm test:perf`                       |
| Security (DAST)   | OWASP ZAP                         | Zero high findings           | CI only (staging)                      |
| Visual regression | Chromatic                         | All `packages/ui` components | CI on PR                               |

### CI Gates — PRs Blocked If:

- Any test fails
- Coverage drops below threshold
- TypeScript errors exist
- ESLint violations exist
- `eslint-disable` added without explanatory comment
- New user-facing feature added without a feature flag
- New API endpoint added without OpenAPI annotation

### 8 Critical E2E Flows (all must pass before any production deploy)

1. Full signup → email verify → dashboard
2. Google OAuth → dashboard
3. Text generation → SSE update → image appears → save
4. Image-to-image → upload → crop → generate → view result
5. Saved images → gallery → lightbox → download → delete
6. Access protected route without token → redirect to login
7. Exhaust quota → correct error + upgrade CTA shown
8. Logout → tokens revoked → protected routes blocked

---

## 14. Environment Variables

### All Services

Three environments: `local` (local dev) · `qa` (QA on AWS) · `prod` (production on AWS).

```bash
APP_ENV=local|qa|prod             # Application environment discriminator
NODE_ENV=development|production   # Node.js runtime mode (local → development, qa/prod → production)
LOG_LEVEL=debug|info|warn|error
SERVICE_NAME=auth-service
```

### Auth Service

```bash
JWT_PRIVATE_KEY=          # RS256 PEM private key
JWT_PUBLIC_KEY=           # RS256 PEM public key
JWT_ACCESS_TTL=900        # 15 minutes
JWT_REFRESH_TTL=604800    # 7 days
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
DATABASE_URL=
REDIS_URL=
```

### Image Service

```bash
DATABASE_URL=
REDIS_URL=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_BUCKET_GENERATED=prod-ai-images-generated
AWS_BUCKET_UPLOADS=prod-ai-images-uploads
CLOUDFRONT_DOMAIN=https://cdn.yourdomain.com
AI_SERVICE_URL=http://ai-service.internal:8000
```

### AI Service (FastAPI)

```bash
STABILITY_API_KEY=
OPENAI_API_KEY=
HUGGINGFACE_API_KEY=
SAFETY_ENABLED=false      # Set true when ai.safety_check.enabled flag is ON
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_GENERATED=
```

### Feature Flags

```bash
LAUNCHDARKLY_SDK_KEY=           # Server-side SDK key — all Node.js services
VITE_LAUNCHDARKLY_CLIENT_KEY=   # Client-side key — frontend (CloudFront)
UNLEASH_URL=                    # Dev self-hosted Unleash
UNLEASH_CLIENT_SECRET=
FEATURE_FLAGS_PROVIDER=launchdarkly|unleash|static
```

> **Rule:** Never commit real values. Every service has `.env.example`. Real secrets live in AWS Secrets Manager + SSM Parameter Store (prod/staging) or `.env.local` (local dev, gitignored).

---

## 15. Common Commands

```bash
# Install
pnpm install

# Local dev
docker-compose up                                   # Full stack (DB, Redis, all services)
pnpm dev --filter=@ai-platform/web                  # Frontend only
pnpm dev --filter=@ai-platform/auth-service         # Single backend service

# Tests
pnpm test                                           # All tests
pnpm turbo test --filter=...affected                # Affected packages only
pnpm test:e2e                                       # Playwright full suite
pnpm test:e2e --project=chromium                    # Single browser

# Database (run from services/auth-service — owns the Prisma schema)
pnpm prisma migrate dev --name description          # Create new migration
pnpm prisma migrate deploy                          # Apply in staging/prod
pnpm prisma studio                                  # Visual editor

# Code quality
pnpm typecheck                                      # TypeScript across all packages
pnpm lint                                           # ESLint across all packages
pnpm lint --fix                                     # Auto-fix safe issues

# Build
pnpm build                                          # All packages (Turborepo cached)
pnpm turbo build --filter=@ai-platform/web          # Single app

# After any OpenAPI spec change
pnpm run generate:api-client

# Docker (build a service image locally — monorepo root as context)
docker build -f services/auth-service/Dockerfile -t auth-service:local .
docker run --rm -p 3001:3001 auth-service:local

# AWS / ECS (manual deploy — CI does this automatically)
aws ecs update-service --cluster visioncraft-production --service auth-service --force-new-deployment
aws logs tail /ecs/visioncraft/auth-service --follow

# Frontend (manual deploy to S3 — CI does this automatically)
pnpm turbo build --filter=@ai-platform/web
aws s3 sync apps/web/dist/ s3://visioncraft-frontend-production/ --delete
aws cloudfront create-invalidation --distribution-id $CF_DIST_ID --paths "/index.html"

# Terraform
cd infra/terraform/environments/qa && terraform plan
cd infra/terraform/environments/qa && terraform apply
```

---

## 16. Deployment Quick Reference

### S3 + CloudFront (Frontend)

- Push to `main` → GitHub Actions builds `apps/web` → syncs to S3 → CloudFront invalidation
- Every PR → preview URL at `https://preview.visioncraft.io/pr-{number}/`
- Build command: `pnpm turbo build --filter=@ai-platform/web`
- Env vars: SSM Parameter Store (`VITE_*` values injected at build time in CI)

### ECS Fargate (Backend)

- Push to `main` → GitHub Actions builds Docker images → pushes to ECR → ECS rolling deploy
- All 8 services (6 Node.js + image-worker + ai-service) deploy in parallel via matrix job
- Internal URLs: `http://<service-name>.internal:<port>` via ECS Service Connect — use for all inter-service calls
- External: only `api-gateway` is publicly exposed via ALB
- Env vars: SSM Parameter Store (non-sensitive) + Secrets Manager (sensitive) — injected at container start

### Promoting to Production

```
1. Merge to main  →  auto-deploys to QA (ECS + S3)
2. Playwright E2E runs against QA  →  must pass (CI gate)
3. Manual workflow_dispatch in GitHub Actions  →  promote to production
4. Automated smoke tests run post-deploy
5. Monitor Sentry + Grafana for 15 minutes  →  declare healthy
```

---

## 17. Architecture Decision Log

| ADR      | Decision                                                                        | Status   |
| -------- | ------------------------------------------------------------------------------- | -------- |
| ADR-0001 | Turborepo over Nx — simpler config, remote cache compatible                     | Accepted |
| ADR-0002 | TanStack Query for server state — not Redux RTK Query                           | Accepted |
| ADR-0003 | FastAPI for AI service — Python ML ecosystem required                           | Accepted |
| ADR-0004 | LaunchDarkly (prod) + Unleash (dev) for feature flags                           | Accepted |
| ADR-0005 | BullMQ over AWS SQS — simpler ops, Redis already required                       | Accepted |
| ADR-0006 | Prisma with soft deletes — never hard-delete user content                       | Accepted |
| ADR-0007 | RS256 JWT with refresh token rotation + family revocation                       | Accepted |
| ADR-0008 | ECS Fargate + S3/CloudFront over Kubernetes — managed infra, lower ops overhead | Accepted |
| ADR-0009 | Safety middleware as pass-through slot in v1, enable in Phase 3                 | Accepted |

Full ADR files with context and consequences are in `/docs/adr/`.

---

## 18. Security Rules for Contributors

- **Never** call AI providers (Stability AI, OpenAI) directly from frontend — always via backend API
- **Always** check resource ownership before returning or mutating: `if (image.userId !== req.user.id) throw forbidden`
- **Always** sanitize and truncate prompts before passing to AI providers
- **Never** expose internal service hostnames, DB URLs, or Redis URLs in API responses
- **Never** store tokens, passwords, or secrets in `localStorage` or any client-accessible storage
- All SQL goes through Prisma — no raw `$queryRaw` without team review and an explaining comment
- Run `pnpm audit` before merging any PR touching `package.json`
- OWASP ZAP runs on every staging deploy — **zero high/critical findings** is the hard gate

---

_Last updated: 2025 · Maintained by: Platform Team_
_HLD reference: `/docs/HLD_v3_FINAL.docx` · Questions: `#architecture` Slack channel_
