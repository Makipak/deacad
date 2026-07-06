# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Deacad is a monorepo (Turborepo + pnpm workspaces) for an academic document-sharing platform
(PDF/PPTX upload, slideshow-style preview, per-upload/per-download monetization via Midtrans).
Full product and architecture rationale lives in [ARCHITECTURE.md](./ARCHITECTURE.md) — read it
before making design-level changes; this file only covers commands and structural orientation.

Stack: Next.js 16 (`apps/web`) · NestJS 11 (`apps/api`) · BullMQ worker (`apps/worker`) ·
PostgreSQL 17 + Prisma ORM 7 (`packages/database`) · Zod 4 (`packages/shared-types`) · Redis 8.

## Commands

Run everything from the repo root; pnpm workspaces + Turborepo resolve to the right package.

```bash
pnpm install                          # install all workspace deps

pnpm dev                              # run web + api + worker together (Turborepo)
pnpm dev:web                          # run only apps/web (works standalone, uses mock data)

pnpm build                            # build all apps
pnpm lint                             # eslint across all apps/packages
pnpm typecheck                        # tsc --noEmit across all apps/packages

pnpm db:generate                      # regenerate Prisma client (packages/database)
pnpm db:migrate                       # prisma migrate dev
pnpm db:seed                          # seed categories/settings/admin user
pnpm db:studio                        # open Prisma Studio
```

To target a single package directly, use pnpm's `--filter` (package names are `web`, `@deacad/api`,
`@deacad/worker`, `@deacad/database`, `@deacad/shared-types`, `@deacad/config`):

```bash
pnpm --filter @deacad/api dev
pnpm --filter @deacad/database db:migrate
```

No test runner is configured yet in this repo — there is no `test` script in any package.json.

### Local infra (Postgres/Redis/MinIO)

```bash
cp .env.example .env                  # fill DATABASE_URL, JWT secrets, Midtrans keys, etc.
docker compose up -d postgres redis storage
```

Full Docker build (web+api+worker+db+redis+nginx): `docker compose up -d --build`.

### Linux (Pop!_OS/Ubuntu) dev machine setup

`./scripts/setup-linux.sh` installs nvm+Node 22, pnpm via corepack, Docker Engine + Compose plugin,
LibreOffice + poppler-utils (so `apps/worker` can run outside Docker), and postgresql-client/redis-tools.
Idempotent, safe to re-run.

## Architecture notes (cross-file context)

**apps/web is currently disconnected from apps/api.** All data in `apps/web/lib/mock-data.ts` is
mocked — there is no `fetch()` to the NestJS API anywhere in `apps/web` yet. When wiring it up,
follow the existing Zod types in `@deacad/shared-types` for both request and response shapes; don't
invent new shapes.

**Auth**: access token is a short-lived JWT returned in the login/refresh JSON body (verified by
`apps/api/src/common/guards/jwt-auth.guard.ts`, which is registered globally in `app.module.ts` and
is fail-secure — new endpoints are protected by default unless annotated `@Public()`). The refresh
token is an opaque random string stored as an httpOnly cookie; only its SHA-256 hash is persisted
(`RefreshToken` model, `packages/database/prisma/schema.prisma`). Rotation + reuse detection (revoke
whole token family on reuse) lives in `apps/api/src/auth/auth.service.ts`.

**Validation**: this repo uses Zod (not class-validator) for request DTOs. Schemas live in
`packages/shared-types/src` and are shared between `apps/web` (forms) and `apps/api` (via
`ZodValidationPipe` in `apps/api/src/common/pipes/zod-validation.pipe.ts`, applied per-parameter with
`@Body(new ZodValidationPipe(someSchema))`, not as a global pipe).

**Upload → convert → publish pipeline** spans three places that must stay consistent:
1. `apps/api/src/documents/documents.service.ts` uploads the file to storage and creates the
   `Document` row (`status: processing`).
2. Whether the convert job is enqueued immediately or deferred depends on
   `SettingsService.get().uploadPaymentEnabled` — if payment is required, the convert job is only
   enqueued from `apps/api/src/transactions/transactions.service.ts` (`syncStatus`) after a Midtrans
   webhook confirms payment, not at upload time.
3. `apps/worker/src/convert.processor.ts` consumes the same queue (`document-convert`) and must keep
   its `ConvertJobData` shape in sync with `apps/api/src/queue/convert-queue.service.ts` — the two are
   not shared via an import, they're duplicated by design (worker and api are separate deployables).

**Payment/webhook flow**: `SettingsService` (`apps/api/src/settings`) caches the monetization toggle
in memory (refreshed on startup/update — not yet pub/sub'd across instances, see its own comments for
the multi-instance caveat). `TransactionsService.syncStatus()` is the single place that applies a
Midtrans status transition; it's called from both the webhook controller (real-time) and
`ReconciliationCron` (polling every 5 minutes for stale pending transactions) — don't duplicate that
transition logic elsewhere.

**IDOR pattern**: all resource IDs are `cuid()`, not auto-increment. Ownership checks scope the query
itself (`where: { id, userId }`), never "find by id then check owner after". A resource that exists
but isn't owned/visible to the caller returns 404, not 403 (see `DocumentsService.findOne` /
`assertOwnership`) — preserve this when adding new resource endpoints.

**Prisma 7 specifics**: the client is generated to `packages/database/src/generated/prisma` (not
`node_modules`), imported only from `packages/database/src/index.ts` (the single PrismaClient
singleton, using the `@prisma/adapter-pg` driver adapter). `DATABASE_URL` is read in
`prisma.config.ts`, not in `schema.prisma`. Run `pnpm db:generate` after any `schema.prisma` change.
The full-text search generated column (`search_vector`) isn't managed by Prisma migrations directly —
see `packages/database/prisma/sql/search-vector.sql` for the manual migration step.
