FROM node:24.21.0-alpine3.24 AS deps
WORKDIR /app
# better-sqlite3 compiles its native binding when no prebuilt one matches Node 24 on musl.
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24.21.0-alpine3.24 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 SKIP_ENV_VALIDATION=1
RUN npm run build

FROM node:24.21.0-alpine3.24
WORKDIR /app
# The health check runs curl inside the container.
RUN apk add --no-cache curl
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    LOCKBOX_DATA_DIR=/data
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
# openDb applies these at startup, from the working directory.
COPY --chown=node:node drizzle ./drizzle
COPY --chown=node:node scripts/backup.mjs ./scripts/backup.mjs
# A named volume mounted here takes this directory's owner, so the app can write to it.
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD ["curl", "-fsS", "http://127.0.0.1:3000/api/healthz"]
CMD ["node", "server.js"]
