---
id: TASK-38
title: ADR 0007 — 서버·contracts 최상위 폴더를 shared/·features/로 맞춘다
status: To Do
assignee: []
created_date: '2026-09-09 05:16'
labels:
  - review
  - adr
  - structure
dependencies: []
priority: medium
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
후보 E의 코드 작업. server/src에 shared/를 만들어 core/log.ts와 core/workspace.ts를 옮기고, contracts/src의 common/을 shared/로, agent·filesystem·git·search를 features/ 아래로 옮긴다. workspace.ts가 features/로 못 가는 이유는 arka/slices-are-siblings다 — 앱 수준 개념이라 어느 한 feature에 넣으면 나머지 넷이 import해야 한다. shared/가 아무것도 import하지 않는다는 zone도 서버·contracts에 더한다.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 server/src가 core/ features/ shared/ 셋이다
- [ ] #2 contracts/src가 shared/ features/ 둘이다
- [ ] #3 shared/가 아무것도 import하지 않는다는 zone이 서버·contracts에 걸려 있다
<!-- AC:END -->
