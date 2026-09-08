---
id: TASK-8
title: 서버 요청 로깅 미들웨어
status: Done
assignee: []
created_date: '2026-09-08 15:40'
updated_date: '2026-09-08 16:17'
labels:
  - server
  - ops
dependencies: []
priority: medium
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
method·path·status·duration을 JSON 로그로. core/log.ts 위에 Hono 미들웨어 하나.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
core/requestLog.ts — method·path·status·ms, 4xx warn/5xx error, /api/health 제외.
<!-- SECTION:NOTES:END -->
