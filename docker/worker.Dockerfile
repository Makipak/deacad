# Build & run apps/worker. Worker dipisah dari api/web (proses background).
FROM node:22-bookworm-slim AS base
# Render PDF pakai mupdf (WASM, tanpa paket OS). LibreOffice hanya perlu kalau ALLOW_PPTX_UPLOAD=true:
# tambahkan build-arg WITH_LIBREOFFICE=1 → docker build --build-arg WITH_LIBREOFFICE=1 ...
ARG WITH_LIBREOFFICE=0
RUN if [ "$WITH_LIBREOFFICE" = "1" ]; then \
      apt-get update && apt-get install -y --no-install-recommends libreoffice && rm -rf /var/lib/apt/lists/*; \
    fi
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/database/package.json packages/database/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
# Placeholder cuma buat resolve prisma.config.ts saat "prisma generate" (schema-only, tidak
# konek ke DB beneran) — DATABASE_URL asli datang dari env_file/environment saat container jalan.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
COPY . .
RUN pnpm --filter @deacad/database db:generate
RUN pnpm exec turbo run build --filter=@deacad/worker

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/apps/worker/dist ./apps/worker/dist
COPY --from=build /repo/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=build /repo/apps/worker/package.json ./apps/worker/package.json
ENV WORKER_MODE=loop
CMD ["node", "apps/worker/dist/index.js"]
