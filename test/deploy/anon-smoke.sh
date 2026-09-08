#!/usr/bin/env bash
# 배포된 오리진에 **익명으로** 붙어 본다(→ ADR 0014, USER_NOTE "배포 전 반드시").
# 앱에는 인증이 0이므로 Cloudflare Access가 유일한 게이트다. 익명 요청이 200을 받으면 워크스페이스
# 전체가 공개된 것이다 — 그 경우 이 스크립트가 실패한다.
#
#   bash test/deploy/anon-smoke.sh https://arka.sangjun.dev
set -euo pipefail

ORIGIN="${1:?origin url required, e.g. https://arka.sangjun.dev}"
check() {
  local path="$1"
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' -H 'x-ade-protocol: 1' "${ORIGIN}${path}")"
  case "$code" in
    200) echo "FAIL ${path}: anonymous request got 200 — Access is not in front of the origin"; return 1 ;;
    302|401|403) echo "ok   ${path}: ${code}" ;;
    *) echo "FAIL ${path}: unexpected ${code}"; return 1 ;;
  esac
}
status=0
check "/api/files?path=" || status=1
check "/api/agent/sessions" || status=1
check "/" || status=1
exit "$status"
