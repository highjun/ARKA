#!/usr/bin/env bash
# Docker 경계 스모크 — 컨테이너 안은 이미지가 고정이라 매트릭스 테스트가 필요 없고, 경계에서만
# 깨진다(USER_NOTE §12): ① 볼륨 마운트 권한(호스트 UID/GID), ② bind mount에서 파일 watch(inotify),
# ③ 재시작 후 데이터 유지. 이 셋만 본다.
set -euo pipefail

IMAGE="${IMAGE:-ade:smoke}"
# /api/*는 프로토콜 헤더가 있어야 통과한다(→ ADR 0017).
H='x-ade-protocol: 1'
PORT="${PORT:-3997}"
NAME="ade-smoke-$$"
WORKSPACE="$(mktemp -d)"
DATA="$(mktemp -d)"
cleanup() {
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  rm -rf "$WORKSPACE" "$DATA"
}
trap cleanup EXIT

echo "# build"
docker build -q -f deploy/Dockerfile -t "$IMAGE" . >/dev/null

run() {
  docker run -d --name "$NAME" --user "$(id -u):$(id -g)" \
    -p "127.0.0.1:${PORT}:3000" -v "$WORKSPACE:/workspace" -v "$DATA:/data" "$IMAGE" >/dev/null
  for _ in $(seq 1 30); do
    if curl -sf "http://127.0.0.1:${PORT}/api/health" >/dev/null; then return 0; fi
    sleep 0.5
  done
  echo "server did not become healthy"; docker logs "$NAME"; exit 1
}

echo "# ① 볼륨 권한 — 컨테이너가 만든 파일을 호스트 사용자가 소유한다"
run
curl -sf -X POST -H "$H" -H 'content-type: application/json' \
  -d '{"path":"from-container.txt","type":"file"}' "http://127.0.0.1:${PORT}/api/files" >/dev/null
[ "$(stat -c %u "$WORKSPACE/from-container.txt")" = "$(id -u)" ] || { echo "owner mismatch"; exit 1; }
curl -sf -X PUT -H "$H" -H 'content-type: application/json' \
  -d '{"path":"from-container.txt","content":"hello"}' "http://127.0.0.1:${PORT}/api/files/content" >/dev/null
[ "$(cat "$WORKSPACE/from-container.txt")" = "hello" ] || { echo "content mismatch"; exit 1; }

echo "# ② bind mount에서 watch — 호스트가 바꾸면 SSE가 알린다"
SSE="$(mktemp)"
curl -sN --max-time 8 -H "$H" "http://127.0.0.1:${PORT}/api/files/watch?path=" > "$SSE" &
SSE_PID=$!
sleep 1
echo "changed" > "$WORKSPACE/from-host.txt"
wait "$SSE_PID" || true
# 비재귀 감시라 바뀐 파일이 아니라 감시한 디렉터리(루트 = "")를 알린다. 하트비트(빈 배열)가 아닌
# 프레임이 하나라도 오면 inotify가 bind mount를 통과한 것이다.
grep 'data:' "$SSE" | grep -v '"paths":\[\]' | grep -q 'paths' || { echo "watch did not fire"; cat "$SSE"; exit 1; }
rm -f "$SSE"

echo "# ③ 재시작 후 데이터 유지 — 워크스페이스 파일과 SQLite의 세션"
SESSION_ID="$(curl -sf -X POST -H "$H" -H 'content-type: application/json' -d '{"title":"smoke"}' \
  "http://127.0.0.1:${PORT}/api/agent/sessions" | sed -E 's/.*"id":"([^"]+)".*/\1/')"
[ -n "$SESSION_ID" ] || { echo "session not created"; exit 1; }
[ -f "$DATA/data.db" ] || { echo "data.db missing on host volume"; ls -la "$DATA"; exit 1; }
docker restart "$NAME" >/dev/null
for _ in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${PORT}/api/health" >/dev/null; then break; fi
  sleep 0.5
done
curl -sf -H "$H" "http://127.0.0.1:${PORT}/api/files/content?path=from-container.txt" | grep -q '"hello"' || { echo "data lost"; exit 1; }
curl -sf -H "$H" "http://127.0.0.1:${PORT}/api/agent/sessions/${SESSION_ID}" | grep -q '"smoke"' || { echo "session lost after restart"; exit 1; }

echo "# ④ 정적 클라이언트가 같은 오리진에서 나온다"
curl -sf "http://127.0.0.1:${PORT}/" | grep -q '<div id="root">' || { echo "client not served"; exit 1; }

echo "ok"
