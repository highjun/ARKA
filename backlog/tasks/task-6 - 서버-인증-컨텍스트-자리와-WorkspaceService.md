---
id: TASK-6
title: 서버 인증 컨텍스트 자리와 WorkspaceService
status: Done
assignee: []
created_date: '2026-09-08 15:40'
updated_date: '2026-09-08 17:12'
labels:
  - server
  - design
dependencies: []
priority: medium
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
요청에 { userId: 'local' }이 흐르는 경로를 만든다 — 인증을 만드는 게 아니라 자리를 만드는 것. 워크스페이스 루트를 env 함수 대신 WorkspaceService로. 둘 다 '되돌리기 비싼 것'이라 먼저.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
core/requestContext.ts(c.get('user'), Cf-Access 이메일 헤더 → userId, 검증은 안 함), core/workspace.ts(IWorkspace root·name), 요청 로그에 user, /api/version에 workspaceName, 셸 브랜드 자리에 워크스페이스 이름.
<!-- SECTION:NOTES:END -->
