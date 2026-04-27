FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile

FROM base AS builder
RUN pnpm --filter=@ai-platform/user-service exec prisma generate
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
# Copy Prisma engine binary — pnpm deploy copies package JS but not the generated binary
COPY --from=builder /repo/node_modules/.pnpm/@prisma+client@6.19.2_prisma@6.19.2_typescript@5.9.3__typescript@5.9.3/node_modules/.prisma \
    ./node_modules/.pnpm/@prisma+client@6.19.2_prisma@6.19.2_typescript@5.9.3__typescript@5.9.3/node_modules/.prisma
EXPOSE 3002
CMD ["node", "dist/index.js"]
