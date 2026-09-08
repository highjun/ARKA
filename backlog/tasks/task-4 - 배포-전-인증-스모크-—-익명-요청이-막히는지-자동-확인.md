---
id: TASK-4
title: 배포 전 인증 스모크 — 익명 요청이 막히는지 자동 확인
status: Done
assignee: []
created_date: '2026-09-08 15:40'
updated_date: '2026-09-08 16:17'
labels:
  - security
  - release
dependencies: []
priority: high
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
curl https://arka.sangjun.dev/api/files 가 인증 없이 200이면 실패하는 스모크를 릴리스 잡에 넣는다. Cloudflare Access·Tunnel 콘솔 설정은 사용자만 가능(USER_NOTE). 선택: Cf-Access-Jwt-Assertion 검증 미들웨어.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
test/deploy/anon-smoke.sh + deploy-smoke.yml(workflow_dispatch). Cloudflare 설정은 사용자(USER_NOTE).
<!-- SECTION:NOTES:END -->
