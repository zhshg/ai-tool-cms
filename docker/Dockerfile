# Monorepo 应用通用镜像（待各 app 就绪后按需调整构建目标）
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG APP_NAME=api
RUN pnpm --filter @ai-tool-cms/${APP_NAME} build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser
USER appuser
COPY --from=builder --chown=appuser:nodejs /app/apps ./apps
COPY --from=builder --chown=appuser:nodejs /app/packages ./packages
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/package.json ./package.json
ARG APP_NAME=api
ENV APP_NAME=${APP_NAME}
EXPOSE 4000
CMD ["sh", "-c", "node apps/${APP_NAME}/dist/main.js"]
