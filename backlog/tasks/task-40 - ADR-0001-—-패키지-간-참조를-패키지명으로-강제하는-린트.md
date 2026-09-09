---
id: TASK-40
title: ADR 0001 — 패키지 간 참조를 패키지명으로 강제하는 린트
status: To Do
assignee: []
created_date: '2026-09-09 05:24'
labels:
  - review
  - adr
  - lint
dependencies: []
priority: medium
ordinal: 40000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
ADR 0001이 "패키지 간 참조는 workspace 패키지명(from \"contracts\")으로 한다"고 정했는데 아무것도 강제하지 않는다. eslint.config.ts의 zone은 client↔server·contracts↛둘의 방향만 막고, 상대경로 ../../../contracts/src/...는 그대로 통과한다. 실측 결과 지금 위반이 0곳(패키지명 54곳, 상대경로 0곳)이라 "위반 0에서 켠다"는 원칙에 맞는 상태다. 규칙이 죽어 있어도 초록이므로 켤 때 일부러 깨뜨려 무는지 확인한다.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 패키지 경계를 넘는 상대경로 import가 린트에 걸린다
- [ ] #2 tooling/eslint-rules/*.test.ts에 valid/invalid fixture가 있다
- [ ] #3 일부러 깨뜨려 규칙이 실제로 무는 것을 확인했다
<!-- AC:END -->
