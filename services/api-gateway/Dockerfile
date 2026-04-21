FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile

FROM base AS builder
RUN pnpm turbo build --filter=@ai-platform/api-gateway

FROM node:20-alpine AS deployer
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /repo
COPY --from=builder /repo .
RUN pnpm deploy --filter=@ai-platform/api-gateway --prod /app

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=deployer /app .
EXPOSE 3000
CMD ["node", "dist/index.js"]
