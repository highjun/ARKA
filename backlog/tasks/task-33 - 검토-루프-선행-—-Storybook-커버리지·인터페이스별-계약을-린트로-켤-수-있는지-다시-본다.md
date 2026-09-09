---
id: TASK-33
title: 검토 루프 선행 — Storybook 커버리지·인터페이스별 계약을 린트로 켤 수 있는지 다시 본다
status: To Do
assignee: []
created_date: '2026-09-09 01:37'
labels:
  - review
  - lint
dependencies: []
ordinal: 33000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
lint-plan.md가 이 둘을 "규칙으로 만들지 않는 것"으로 분류한 근거는 당시 전건 위반(스토리 3개, 계약 0개)이었다. 지금은 스토리 137개, 계약 6개다. 선행 정리가 끝나면 위반이 0이 되는지 실측하고, 되면 규칙을 켠다.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 두 규칙의 현재 위반 수가 실측되어 lint-plan.md에 기록된다
- [ ] #2 위반이 0인 규칙은 켜지고 tooling/eslint-rules/*.test.ts에 fixture가 있다
<!-- AC:END -->
