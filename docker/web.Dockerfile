# Build & run apps/web (Next.js 16). Dijalankan dari root context (lihat docker-compose.yml).
FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/config/package.json packages/config/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
# Turbopack (default builder Next.js 16) — tidak perlu flag tambahan untuk production build.
RUN pnpm --filter web build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /repo/apps/web
COPY --from=build /repo/apps/web/.next ./.next
COPY --from=build /repo/apps/web/public ./public
COPY --from=build /repo/apps/web/package.json ./package.json
COPY --from=build /repo/node_modules /repo/node_modules
EXPOSE 3000
CMD ["pnpm", "start"]
