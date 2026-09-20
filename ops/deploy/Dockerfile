FROM node:26-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g "pnpm@$(node -p "require('./package.json').packageManager.split('@')[1]")"
COPY ops/package.json ops/
COPY packages/contracts/package.json packages/contracts/
COPY packages/client/package.json packages/client/
COPY packages/server/package.json packages/server/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM node:26-alpine
ENV NODE_ENV=production \
    ARKA_HOST=0.0.0.0 \
    ARKA_PORT=3000 \
    ARKA_WORKSPACE=/workspace \
    ARKA_CLIENT_ROOT=/app/dist/client
WORKDIR /app
COPY --from=build /app/.output/dist ./dist
ARG ARKA_GIT_SHA=""
ENV ARKA_GIT_SHA=$ARKA_GIT_SHA
VOLUME ["/workspace"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "dist/server/index.js"]
