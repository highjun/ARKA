# 빌드 단계 — 의존성 설치와 번들. 산출물은 `.output/dist/` 하나다(client 정적 파일 + server 단일 번들).
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# corepack은 Node 25에서 빠지므로 직접 설치한다. **버전을 여기 적지 않는다** —
# `packageManager`에서 읽는다. 두 곳에 적으면 갈린다(실제로 갈렸다: 11.13.0 vs 11.13.1).
RUN npm install -g "pnpm@$(node -p "require('./package.json').packageManager.split('@')[1]")"
COPY packages/contracts/package.json packages/contracts/
COPY packages/client/package.json packages/client/
COPY packages/server/package.json packages/server/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# 실행 단계 — node_modules가 없다. 서버는 의존성까지 한 파일로 번들됐고 클라이언트는 정적 파일이다.
FROM node:24-alpine
# 소스 제어 기능이 git CLI를 워크스페이스에서 돌린다(features/git).
RUN apk add --no-cache git
ENV NODE_ENV=production \
    ADE_HOST=0.0.0.0 \
    ADE_PORT=3000 \
    ADE_WORKSPACE=/workspace \
    ADE_DATA_DIR=/data \
    ADE_CLIENT_ROOT=/app/dist/client
# 위 경로는 저장소의 `ops/output.json`과 다르다 — 아래 COPY가 `.output/dist`를 `dist`로 펴기 때문이다.
WORKDIR /app
# 저장소에서는 생성물을 `.output/` 아래로 숨기지만, 이미지 안에서는 숨길 이유가 없다.
COPY --from=build /app/.output/dist ./dist
# 워크스페이스와 데이터(SQLite)는 볼륨이다. compose가 호스트 UID로 실행하므로 여기서 사용자를 고정하지
# 않는다. /data는 어떤 UID로 돌아도 쓸 수 있어야 하므로 미리 만들고 열어 둔다.
RUN mkdir -p /data && chmod 777 /data
VOLUME ["/workspace", "/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "dist/server/index.js"]
