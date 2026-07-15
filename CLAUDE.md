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

**Postgres host port is 5434, not 5432** (`docker-compose.yml`'s `postgres` service maps
`"5434:5432"`). This was changed from the default 5432 because dev machines frequently already have
something bound to 5432/5433 (a native `postgresql.service` install, or another project's own Docker
Postgres container) — Docker will silently fail to start (`port is already allocated`) or, worse,
you can end up creating the app's role/database inside a *different* project's Postgres container
without noticing, because `psql`/`prisma` happily connect to whatever answers on that port. Before
assuming a port is free on any given machine: `docker compose ps` (check for containers from *other*
compose projects too — `docker ps -a` across all projects) and `ss -tlnp | grep -E '543[0-9]'`. If
you must change the host port again, update both `docker-compose.yml`'s `ports:` mapping and
`DATABASE_URL` in `.env` (container-internal port stays 5432; only the host-side mapping changes).

### Linux (Pop!_OS/Ubuntu) dev machine setup

`./scripts/setup-linux.sh` installs nvm+Node 22, pnpm via corepack, Docker Engine + Compose plugin,
LibreOffice + poppler-utils (so `apps/worker` can run outside Docker), and postgresql-client/redis-tools.
Idempotent, safe to re-run.

## Known local dev gotchas

These were discovered/fixed by working through a real setup; re-check them if `pnpm dev`/`pnpm
db:migrate` breaks in a new environment rather than re-diagnosing from scratch.

- **Workspace packages that `extends` `@deacad/config/typescript/*.json` in their `tsconfig.json`
  must also declare `@deacad/config` as a `devDependency`.** pnpm only symlinks a workspace package
  into another's `node_modules` if it's an actual declared dependency — a bare `extends` reference in
  tsconfig isn't enough, and TypeScript will fail with `File '@deacad/config/typescript/base.json' not
  found` otherwise. All of `apps/api`, `apps/worker`, `packages/database`, `packages/shared-types` need
  this (already fixed); keep it in mind if you add a new package.
- **`packages/database/prisma.config.ts` loads `.env` from its own file location** (via
  `import.meta.url`), not `process.cwd()` — because it's routinely invoked through `pnpm --filter
  @deacad/database <script>` from the repo root, which makes `dotenv/config`'s default cwd-relative
  lookup miss the root `.env` entirely. `packages/database` also needs `dotenv` as an explicit
  `devDependency` of its own (it's only used by this config file, not by `src/`), not just relying on
  it being hoisted transitively from `prisma`'s own dependency tree.
- **`apps/api/tsconfig.json` must explicitly set `"outDir": "./dist"`.** TypeScript resolves relative
  `compilerOptions` paths from an `extends`-ed base config relative to *that base config's own
  directory*, not the extending project's directory — so without an explicit override, `apps/api`
  silently inherited `outDir: "./dist"` from `packages/config/typescript/nestjs.json` and emitted its
  build into `packages/config/typescript/dist/` instead of `apps/api/dist/`. Every package that
  extends a shared tsconfig and emits output must set its own `outDir` (and `rootDir`) explicitly —
  `packages/database`, `packages/shared-types`, `apps/worker` already do.
- **`turbo.json`'s `dev` task needs `"dependsOn": ["^build"]`.** Without it, `pnpm dev` starts every
  package's `dev` script in parallel with no ordering — `apps/api`/`apps/worker` race ahead and crash
  (`Cannot find module '@deacad/database/dist/index.js'`) before `packages/database`/`shared-types`'s
  own `tsc --watch` has finished its first compile. The `dependsOn` gate runs each dependency's
  one-shot `build` script first; their persistent `dev` (watch) scripts then run alongside consumers
  for live-reload on further edits.
- **`search_vector` (full-text search column, see `prisma/sql/search-vector.sql`) makes `prisma
  migrate dev` unsafe to run directly.** Postgres stores a `GENERATED ALWAYS AS (...) STORED` column's
  expression via `pg_attrdef`, and Prisma's schema-diff engine always misreads that as an unmanaged
  "default" it wants to strip — every future migration will spuriously include `ALTER TABLE
  "documents" ALTER COLUMN "search_vector" DROP DEFAULT;`, which Postgres rejects (`DROP DEFAULT` is
  illegal on a generated column; the migration fails partway, potentially after other statements in
  the same file already ran). Always run `prisma migrate dev --create-only --name <name>` first,
  delete that line from the generated `migration.sql`, then run `prisma migrate dev` to apply.
- **Local dev database is intentionally empty of demo data** (see `packages/database/prisma/seed.ts`
  for what a fresh `pnpm db:seed` creates: one admin `admin@deacad.example` / `ChangeMe123!`, default
  settings with payment off, and 6 categories). On this particular dev machine the seeded categories
  were deleted afterward on purpose, to test the real category-creation flow end to end — that's a
  local DB state choice, not a change to `seed.ts` itself, so a fresh clone/seed elsewhere still gets
  the 6 default categories.
- **The MinIO bucket is not auto-created.** `docker compose up -d storage` only starts the MinIO
  server — the `deacad` bucket itself (name from `STORAGE_BUCKET`) has to be created once by hand, or
  every upload fails with `NoSuchBucket`. Create it and make it publicly readable (required because
  `StorageService.upload()` in `apps/api/src/common/storage/storage.service.ts` returns a plain public
  URL, not a presigned one):
  ```bash
  docker exec deacad-storage-1 mc alias set local http://localhost:9000 minioadmin minioadmin
  docker exec deacad-storage-1 mc mb local/deacad
  docker exec deacad-storage-1 mc anonymous set download local/deacad
  ```
- **`EMAIL_PROVIDER_API_KEY` should be left empty (`""`) in local `.env`, not a placeholder string
  like `"re_xxxxxxxxxxxx"`.** `EmailService.sendVerificationEmail()` (`apps/api/src/auth/email.service.ts`)
  only takes its graceful dev path (log the verification link to the console instead of calling
  Resend) when the key is falsy — a non-empty placeholder string is truthy, so it still fires a real
  request to Resend's API, gets a 401, and just logs an error with no way to find the actual
  verification link. Empty string is the correct "not configured yet" value here, not a fake key.
- **`apps/web`'s `dev`/`build`/`start` scripts must load the root `.env` via `dotenv-cli`** (already
  wired: `"dev": "dotenv -e ../../.env -- next dev"`, same devDependency pattern for `build`/`start`).
  Next.js inlines `NEXT_PUBLIC_*` vars into the client bundle at its own build/dev-server startup by
  reading `.env*` files from `apps/web`'s own directory — a `dotenv.config()` side-effect import
  (the trick used in `apps/api`/`apps/worker`'s `load-env.ts`) only affects `process.env` for code
  running *after* it, in the same Node process; it can't retroactively fix a client bundle Next.js
  already inlined during its own startup. Don't remove the `dotenv-cli` prefix or move
  `NEXT_PUBLIC_API_URL` out of the root `.env` without re-solving this.

## Architecture notes (cross-file context)

**apps/web ↔ apps/api wiring status.** Real, not mock: login/register/logout (`lib/auth-context.tsx`
— `AuthProvider`, access token kept in React state/memory, restored on mount via `POST
/auth/refresh` using the httpOnly cookie), document upload (`app/upload/page.tsx`), and the public
document browse/detail pages (`app/page.tsx`, `app/documents/[id]/page.tsx`, both Server Components
fetching `apps/api` directly). Still mock (`apps/web/lib/mock-data.ts`): the `/admin/*` panel's own
data views (reports/documents/transactions/settings tables — only the *access gate* to `/admin` is
real, via `AuthProvider`'s `user.role`), the download-payment simulation (`download-button.tsx`), and
the report-submission form (`report-button.tsx`). When wiring any of these up for real, follow the
existing Zod types in `@deacad/shared-types` for both request and response shapes — don't invent new
ones. `apps/api/src/auth/auth.service.ts`'s `register()` does not check `emailVerified` on `login()`,
so `AuthProvider.register()` deliberately calls `login()` right after `register()` succeeds — a new
user is usable immediately, verification is soft/best-effort (see the email gotcha above).

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
