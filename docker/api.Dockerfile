# Build & run apps/api (NestJS). Dijalankan dari root context (lihat docker-compose.yml: context: .).
FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /repo

# --- Stage install: cache layer dependency terpisah dari source code ---
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/config/package.json packages/config/package.json
RUN pnpm install --frozen-lockfile

# --- Stage build: compile TypeScript jadi JS ---
FROM deps AS build
# Placeholder cuma buat resolve prisma.config.ts saat "prisma generate" (schema-only, tidak
# konek ke DB beneran) — DATABASE_URL asli datang dari env_file/environment saat container jalan.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
COPY . .
RUN pnpm --filter @deacad/database db:generate
RUN pnpm exec turbo run build --filter=@deacad/api

# --- Stage runtime: image final, tanpa devDependencies & source TypeScript ---
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/apps/api/node_modules ./apps/api/node_modules
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
