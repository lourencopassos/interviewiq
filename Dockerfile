# syntax=docker/dockerfile:1
#
# Production image for InterviewIQ: one long-lived Node process serving the
# Next.js standalone build. See README "Run with Docker".
#
# Base: node:20.19-alpine. Prisma 6 ships a musl query engine
# (linux-musl-openssl-3.0.x) and picks it automatically when `prisma generate`
# runs on Alpine, as long as OpenSSL is installed. Generation happens in the
# build stage on the same base as the runner, so the engine matches. Next's
# optional `sharp` also has musl builds, and the app serves no optimised images.

ARG NODE_IMAGE=node:20.19-alpine

# ---------------------------------------------------------------------------
# base: Node + pnpm (version pinned by "packageManager" in package.json)
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS base
RUN apk add --no-cache openssl libc6-compat
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NEXT_TELEMETRY_DISABLED=1 \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo

# ---------------------------------------------------------------------------
# deps: install from manifests + lockfile only, so source edits keep this layer
# cached. The Prisma schema is copied too because @interviewiq/db runs
# `prisma generate` on postinstall.
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json apps/web/
COPY packages/ai/package.json packages/ai/
COPY packages/db/package.json packages/db/
COPY packages/types/package.json packages/types/
COPY packages/db/prisma/schema.prisma packages/db/prisma/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# migrate: one-shot schema push (`prisma db push`). Used by the `migrate`
# service in docker-compose.yml; needs DATABASE_URL at runtime.
# ---------------------------------------------------------------------------
FROM deps AS migrate
COPY packages/db/prisma packages/db/prisma
WORKDIR /repo/packages/db
USER node
# Call the Prisma CLI directly (not through pnpm) so the non-root user does not
# need corepack to fetch pnpm at runtime.
CMD ["node_modules/.bin/prisma", "db", "push", "--skip-generate"]

# ---------------------------------------------------------------------------
# build: generate the Prisma client and build the standalone Next.js output
# ---------------------------------------------------------------------------
FROM deps AS build
COPY . .
RUN pnpm --filter @interviewiq/db generate \
 && pnpm --filter @interviewiq/web build

# ---------------------------------------------------------------------------
# runner: only the standalone server, static assets and the Prisma engine
# ---------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    # Listen on all interfaces *inside* the container so the published port
    # works. Exposure is controlled by the host port mapping, which
    # docker-compose.yml restricts to 127.0.0.1.
    HOSTNAME=0.0.0.0

# outputFileTracingRoot is the repo root, so the standalone tree mirrors the
# monorepo and the server entry point is apps/web/server.js. It includes the
# traced node_modules, Prisma's generated client and its query engine.
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
# apps/web/public does not exist today; add a COPY line here if it is created.

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/" || exit 1
CMD ["node", "apps/web/server.js"]
