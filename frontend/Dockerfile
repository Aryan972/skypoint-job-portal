# =============================================================================
# Multi-stage Dockerfile for the React + Vite frontend.
#
# Stage 1 (build):   installs deps, runs `vite build`, produces /app/dist.
# Stage 2 (runtime): nginx:alpine serving the static bundle. No Node, no dev
#                    server — only static files plus an SPA history fallback.
#
# Build-time arg `VITE_API_BASE_URL` is forwarded to the build stage so the
# API host is baked in. To target a different backend, rebuild with a new arg.
# =============================================================================

# ---------- Stage 1: build ----------
FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN npm run build

# ---------- Stage 2: runtime ----------
FROM nginx:1.27-alpine AS runtime

# nginx default site config: serve the SPA with history fallback.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static assets from the build stage.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1

# nginx:alpine default CMD starts the daemon in the foreground; we keep it.
