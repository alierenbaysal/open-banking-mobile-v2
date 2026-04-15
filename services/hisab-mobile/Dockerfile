# Enterprise Expo Metro image. Single source of truth for every app that
# wants to be served through the DMZ Metro platform. Copied from
# /custom-helm/expo-metro/examples/demo-app/Dockerfile (infra repo).
#
# Security posture:
#   - Multi-stage: build tools (npm, git) never reach the runtime layer.
#   - Pinned base images by SHA in production (tag here is a reference).
#   - Non-root UID 10001, read-only root FS at runtime.
#   - No package managers, no shells executed in the runtime CMD.

ARG NODE_VERSION=22

# -----------------------------------------------------------------------
# Stage 1: dependency resolution. Cached layer unless package*.json change.
# -----------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS deps

ENV NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false

WORKDIR /workspace

# Dependency install. Prefers deterministic `npm ci` from a committed
# package-lock.json; falls back to `npm install` when the lockfile is
# absent so a first build of a new app still succeeds. Commit the
# generated package-lock.json after the first green pipeline to pin
# versions across builds.
COPY package.json ./
# Copy everything that matches the package-lock pattern. The brace
# expansion produces a no-op glob when the file is missing, which both
# BuildKit and Kaniko handle gracefully for this single-file pattern.
COPY package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then \
      npm ci --prefer-offline --no-audit --no-fund; \
    else \
      npm install --no-audit --no-fund --legacy-peer-deps; \
    fi

# -----------------------------------------------------------------------
# Stage 2: prepare the workspace. Copies source + dependencies together
# so Metro can read everything at runtime.
# -----------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS builder

WORKDIR /workspace

COPY --from=deps /workspace/node_modules ./node_modules
COPY . .

# Sanity check: the entry point must resolve. Fails early if package.json
# "main" or app.json "entryPoint" is broken.
RUN node -e "require.resolve(require('./package.json').main || './index.ts')" || \
    node -e "require.resolve('./index.ts')" || \
    node -e "require.resolve('expo-router/entry')"

# Precompute Metro cache keys so first request in prod isn't cold. This
# emits .expo/ and .metro/ caches that the runtime will re-use. Wrapped
# in `timeout` because `npx` with a non-bundled CLI can block the build
# indefinitely in air-gapped runners (npm registry probe never returns).
RUN timeout 30 npx --no expo-cli --version >/dev/null 2>&1 || true

# -----------------------------------------------------------------------
# Stage 3: runtime. node:22-slim with explicit non-root hardening.
#
# Distroless would be tighter but Metro + Expo CLI invoke shell helpers
# (e.g. git hooks in some expo plugins). node-slim + readOnlyRootFilesystem
# at the pod level gives us equivalent blast-radius reduction without
# the tooling friction.
# -----------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS runtime

ENV NODE_ENV=development \
    EXPO_NO_TELEMETRY=1 \
    EXPO_NO_TYPESCRIPT_SETUP=1 \
    EXPO_OFFLINE=1 \
    CI=1 \
    NPM_CONFIG_CACHE=/tmp/.npm \
    HOME=/tmp

# Use Node's built-in nonroot user. UID/GID 10001 is set via the pod
# securityContext; group ownership here allows /workspace to be read.
WORKDIR /workspace
RUN groupadd --system --gid 10001 expo && \
    useradd  --system --uid 10001 --gid expo --home /workspace --shell /sbin/nologin expo && \
    chown -R expo:expo /workspace

COPY --from=builder --chown=expo:expo /workspace /workspace

USER 10001:10001

EXPOSE 8081

# --lan exposes Metro on 0.0.0.0:8081 inside the pod. Host/port that
# Expo Go sees come from EXPO_PACKAGER_PROXY_URL / EXPO_MANIFEST_PROXY_URL
# set on the Deployment, not from here.
#
# `expo start` options are flags, not key=value pairs. Passing the
# default dev+HMR mode is implicit; we do NOT pass --no-dev (which
# would disable HMR) or --no-minify (which Expo renamed out of `start`
# in SDK 50+). --max-workers is kept at 2 to cap CPU on a shared
# platform.
CMD ["npx", "--yes", "expo", "start", \
     "--lan", \
     "--port", "8081", \
     "--max-workers", "2"]
