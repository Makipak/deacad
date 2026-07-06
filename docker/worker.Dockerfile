# Build & run apps/worker. Base image beda dari api/web — butuh LibreOffice + Poppler terpasang
# di OS level, alasannya ada di ARCHITECTURE.md #3 (worker dipisah container karena dependency berat ini).
FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/database/package.json packages/database/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @deacad/database db:generate
RUN pnpm --filter @deacad/worker build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/apps/worker/dist ./apps/worker/dist
CMD ["node", "apps/worker/dist/index.js"]
