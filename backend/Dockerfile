# =============================================================================
# Multi-stage Dockerfile for the Express + Prisma backend.
#
# Stage 1 (deps):     installs all deps including dev, used for build only.
# Stage 2 (build):    compiles TS to JS and generates the Prisma client.
# Stage 3 (runtime):  slim image with prod deps and the compiled output.
#
# The runtime stage runs `prisma migrate deploy` + the seed via an entrypoint,
# then exec's `node dist/server.js` — NOT `tsx watch` or `nodemon`. The earlier
# iteration of this project shipped a dev server inside Docker; that is fixed.
# =============================================================================

# ---------- Stage 1: deps ----------
FROM node:20-alpine AS deps
WORKDIR /app

# Prisma's query engine needs OpenSSL at runtime on Alpine. libc6-compat
# pulls in glibc compatibility for the engine binary.
RUN apk add --no-cache openssl libc6-compat

COPY package.json package-lock.json* ./
# package-lock.json is optional on first build; npm install handles both cases.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# ---------- Stage 2: build ----------
FROM node:20-alpine AS build
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate the Prisma client (matches the schema) and compile TS.
RUN npx prisma generate
RUN npm run build

# Prune dev deps so they aren't copied into the runtime image.
RUN npm prune --omit=dev

# ---------- Stage 3: runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production

# Non-root user for the container.
RUN addgroup -S app && adduser -S app -G app

# Only ship what production needs.
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/prisma ./prisma
COPY --from=build --chown=app:app /app/package.json ./package.json
COPY --chown=app:app docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:8000/api/v1/health || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]