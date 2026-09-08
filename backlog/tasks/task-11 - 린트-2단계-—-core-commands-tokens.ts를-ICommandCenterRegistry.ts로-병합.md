---
id: TASK-11
title: 린트 2단계 — core/commands/tokens.ts를 ICommandCenterRegistry.ts로 병합
status: Done
assignee: []
created_date: '2026-09-08 15:40'
updated_date: '2026-09-08 16:26'
labels:
  - lint
dependencies: []
priority: medium
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
DI 토큰은 자기 계약 파일에(ADR 0005). 위반 1건. 병합하면 tokens.ts 금지 규칙을 예외 없이 켤 수 있다.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
tokens.ts를 ICommandCenterRegistry.ts로 병합, **/tokens.ts 금지 규칙.
<!-- SECTION:NOTES:END -->
