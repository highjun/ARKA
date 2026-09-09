---
id: TASK-33
title: 검토 루프 선행 — Storybook 커버리지·인터페이스별 계약을 린트로 켤 수 있는지 다시 본다
status: Done
assignee: []
created_date: '2026-09-09 01:37'
updated_date: '2026-09-09 02:14'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Storybook 커버리지는 규칙으로 켰다(arka/components-have-stories, 위반 0, fixture 8개). 인터페이스마다 .contract.ts는 규칙으로 만들지 않기로 했다 — 이유가 "위반이 많아서"에서 "파일 이름으로 판정할 수 없어서"로 바뀌었다. MockAgentBackend가 IAgentApi와 IAgentEvents 둘을 구현해 이름이 1:1이 아니고, 서버는 Memory* 관행이라 Mock*이 없다. 실제 커버리지는 Mock 8개 전부 계약에 덮여 있다. 서버 이름 관행은 ADR_CANDIDATE로 보냈다. lint-plan.md에 전부 기록.
<!-- SECTION:NOTES:END -->
