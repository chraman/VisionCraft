# AI Image Creation Platform

An AI-powered image generation platform built on a React + Node.js + FastAPI stack. Generate images from text prompts or existing images using Stability AI (SDXL), OpenAI (DALL-E 3), and HuggingFace models.

> Full architecture documentation: [CLAUDE.md](./CLAUDE.md)
> Implementation plan: [docs/IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md)

---

## Tech Stack

| Layer         | Technology                                                  |
| ------------- | ----------------------------------------------------------- |
| Frontend      | React 18 + TypeScript · Vite · S3 + CloudFront              |
| Backend       | Node.js microservices · Express 5 · ECS Fargate             |
| AI Service    | FastAPI (Python 3.11) · Stability AI · OpenAI · HuggingFace |
| Database      | PostgreSQL 16 (RDS)                                         |
| Cache / Queue | Redis 7 + BullMQ (ElastiCache)                              |
| Storage       | AWS S3 + CloudFront CDN                                     |
| Monorepo      | Turborepo + pnpm workspaces                                 |

---

## Prerequisites

| Tool                    | Version | Install                                                    |
| ----------------------- | ------- | ---------------------------------------------------------- |
| Node.js                 | 20 LTS  | [nodejs.org](https://nodejs.org)                           |
| pnpm                    | 9+      | `npm install -g pnpm`                                      |
| Docker + Docker Compose | Latest  | [docker.com](https://docker.com)                           |
| Python                  | 3.11    | [python.org](https://python.org) (for ai-service dev only) |

---

## Local Development Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-org/ai-image-platform.git
cd ai-image-platform
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env.local` in each service directory and fill in the values.

```bash
# Git Bash / macOS / Linux
cp .env.example .env.local
cp services/auth-service/.env.example services/auth-service/.env.local
cp services/image-service/.env.example services/image-service/.env.local
# ... repeat for each service

# Windows CMD / PowerShell (if not using Git Bash)
copy .env.example .env.local
copy services\auth-service\.env.example services\auth-service\.env.local
```

At minimum, you need valid values for:

- `DATABASE_URL` (provided by Docker Compose: `postgresql://postgres:postgres@localhost:5432/aiplatform`)
- `REDIS_URL` (provided by Docker Compose: `redis://localhost:6379`)

### 4. Start infrastructure (PostgreSQL + Redis + service stubs)

```bash
docker-compose up -d
```

Wait for all services to be healthy:

```bash
docker-compose ps
```

### 5. Run database migrations

```bash
cd services/image-service
pnpm prisma migrate dev
cd ../..
```

### 6. Seed the database with test data

```bash
cd infra/scripts
pnpm seed
cd ../..
```

### 7. Start development servers

```bash
# Start all services (Turborepo)
pnpm dev

# Or start individual services
pnpm dev --filter=web          # Frontend only (http://localhost:5173)
pnpm dev --filter=auth-service # Auth service only (http://localhost:3001)
```

---

## Test Accounts (after seeding)

| Role      | Email               | Password      |
| --------- | ------------------- | ------------- |
| Free tier | `alice@example.com` | `password123` |
| Pro tier  | `bob@example.com`   | `password123` |
| Admin     | `admin@example.com` | `password123` |

---

## Common Commands

```bash
# Development
pnpm dev                        # Start all services
pnpm dev --filter=web           # Frontend only

# Code quality
pnpm lint                       # ESLint all packages
pnpm typecheck                  # TypeScript check all packages
pnpm format                     # Prettier format

# Testing
pnpm test                       # All unit tests
pnpm test:e2e                   # Playwright E2E tests

# Database
pnpm prisma migrate dev --name <description>   # New migration (from services/image-service)
pnpm prisma studio                              # Visual DB editor

# Building
pnpm build                      # Build all packages (Turborepo cached)
pnpm turbo build --filter=web   # Build single app

# Docker
docker-compose up -d            # Start all infra
docker-compose down             # Stop all infra
docker-compose logs -f          # Tail all logs
```

---

## Repository Structure

```
ai-image-platform/
├── apps/
│   ├── web/          # Main React app (Vite) → S3 + CloudFront
│   └── admin/        # Admin dashboard (Phase 2, flag-gated)
├── packages/
│   ├── ui/           # Shared component library (shadcn/ui base)
│   ├── api-client/   # Typed Axios client
│   ├── store/        # Zustand state management
│   ├── types/        # Shared TypeScript types + DTOs
│   ├── feature-flags/# Flag client + React hooks
│   ├── utils/        # Logger, analytics, error helpers
│   └── config/       # Zod env schemas, shared constants
├── services/         # Node.js microservices → ECS Fargate
├── workers/          # BullMQ job workers → ECS Fargate
├── ai-service/       # FastAPI Python service → ECS Fargate
├── infra/            # Terraform modules, scripts
├── e2e/              # Playwright test suite
└── docs/             # Architecture docs, ADRs
```

See [CLAUDE.md](./CLAUDE.md) for the full architecture reference.

---

## Contributing

1. Read [CLAUDE.md](./CLAUDE.md) before writing any code
2. Create a feature flag before writing feature code (§5.3)
3. Run `pnpm lint && pnpm typecheck` before committing
4. Follow [Conventional Commits](https://www.conventionalcommits.org/)
5. All PRs require green CI before merge
