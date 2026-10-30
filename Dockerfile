# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=26.5.1
ARG PNPM_VERSION=11.15.1

FROM node:${NODE_VERSION}-alpine3.24 AS build

RUN apk upgrade --no-cache \
    && apk add --no-cache bash

WORKDIR /app
COPY . .
RUN npm install --global pnpm@${PNPM_VERSION}
RUN pnpm install --frozen-lockfile
RUN pnpm run lint
RUN pnpm run build
RUN pnpm prune --prod
RUN node node_modules/prisma/build/index.js generate

FROM alpine:3.24 AS runtime

ARG ALPINE_NODE_VERSION=26.5.1-r0
ARG OPENSSL_VERSION=3.5.8-r0

# Use Alpine's dynamically linked Node.js package so the runtime receives the
# patched system OpenSSL libraries without carrying npm or Node.js headers.
RUN apk upgrade --no-cache \
    && apk add --no-cache \
        bash \
        "libcrypto3=${OPENSSL_VERSION}" \
        "libssl3=${OPENSSL_VERSION}" \
        "nodejs-current=${ALPINE_NODE_VERSION}" \
    && addgroup -S -g 10001 app \
    && adduser -S -D -H -h /app -u 10001 -G app app

ARG RESET_DB_ARG=false
ENV RESET_DB=$RESET_DB_ARG
ARG SEED_DATA_ARG=""
ENV SEED_DATA=$SEED_DATA_ARG
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x
ENV NODE_ENV=production

WORKDIR /app
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/prisma ./prisma
COPY --from=build --chown=app:app /app/package.json ./package.json
COPY --from=build --chown=app:app /app/appStartUp.sh ./appStartUp.sh
RUN chmod 0555 appStartUp.sh

USER app

CMD ["./appStartUp.sh"]
