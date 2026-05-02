# Multi-stage Dockerfile for FDC Agent Frontend.
#
#   deps    -> install pnpm + node_modules from frozen lockfile
#   builder -> produce Next.js standalone output via `pnpm build`
#   runner  -> minimal runtime image (alpine + non-root + standalone)
#
# Node version pinned to .nvmrc (22.22.2). pnpm version pinned via the
# `packageManager` field in package.json (corepack reads it). Compatible
# with both legacy docker builder and BuildKit/buildx.

ARG NODE_VERSION=22.22.2
ARG PNPM_VERSION=10.33.2

# ────────────────────────────────────────────────────────────────────────
# Base — corepack + pnpm
# ────────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS base
ARG PNPM_VERSION
ENV CI=1
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# ────────────────────────────────────────────────────────────────────────
# deps — install dependencies from frozen lockfile
# ────────────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ────────────────────────────────────────────────────────────────────────
# builder — compile Next.js with standalone output
# ────────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ────────────────────────────────────────────────────────────────────────
# runner — minimal runtime
# ────────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Run as non-root.
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Standalone output already includes minimal node_modules + server.js.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
