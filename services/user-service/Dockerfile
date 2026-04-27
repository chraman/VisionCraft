FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile

FROM base AS builder
RUN pnpm turbo build --filter=@ai-platform/user-service

FROM node:20-alpine AS deployer
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /repo
COPY --from=builder /repo .
RUN pnpm deploy --legacy --filter=@ai-platform/user-service --prod /app

FROM node:20-alpine AS runner
RUN apk add --no-cache curl
WORKDIR /app
COPY --from=deployer /app .
EXPOSE 3002
CMD ["node", "dist/index.js"]
