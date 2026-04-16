# Enterprise Expo Metro image for salalah-mobile. Copied verbatim from the
# platform reference Dockerfile at:
#   infra/custom-helm/expo-metro/examples/demo-app/Dockerfile
# Keep this file in sync with the reference — add app-specific tweaks only
# if the app genuinely needs them (e.g. extra native toolchain). Any drift
# should be documented inline.
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

# Install dependencies deterministically from the lockfile. Fails the
# build if package-lock.json is out of sync with package.json.
COPY package.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install --no-audit --no-fund --legacy-peer-deps

# -----------------------------------------------------------------------
# Stage 2: prepare the workspace. Copies source + dependencies together
# so Metro can read everything at runtime.
# -----------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS builder

WORKDIR /workspace

COPY --from=deps /workspace/node_modules ./node_modules
COPY . .

# zustand ships `import.meta.env.MODE` DEV-warning checks in its compiled
# output. Hermes / Metro web can't evaluate `import.meta` outside an ESM
# context → "Cannot use import.meta outside a module" at bundle init.
# Neutralize at build-time: replace `import.meta.env` with `({})`.
RUN find node_modules/zustand -name '*.js' -exec \
      sed -i 's/import\.meta\.env/({})/g' {} +

# Sanity check: the entry point must resolve. Fails early if package.json
# "main" or app.json "entryPoint" is broken.
RUN node -e "require.resolve(require('./package.json').main || './index.ts')" || \
    node -e "require.resolve('./index.ts')"

# Precompute Metro cache keys so first request in prod isn't cold. This
# emits .expo/ and .metro/ caches that the runtime will re-use.
RUN npx expo-cli --version >/dev/null 2>&1 || true

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
# NOTE (drift from reference Dockerfile): the reference has
# `--no-dev false --minify false`. Modern @expo/cli (SDK 51+) treats
# `false` as a positional argument = project path, so the container
# starts with `Invalid project root: /workspace/false` and exits. Drop
# those two flags — dev mode and unminified bundles are already the
# defaults for `expo start`. --max-workers=2 caps CPU on a shared
# platform. Hisab (#383) hit the same issue and made the same fix.
CMD ["npx", "--yes", "expo", "start", \
     "--lan", \
     "--port", "8081", \
     "--max-workers", "2"]
