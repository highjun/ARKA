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
WORKDIR /app
COPY --from=build /app/.output/dist ./dist
VOLUME ["/workspace"]
EXPOSE 3000
CMD ["node", "dist/server/index.js"]
