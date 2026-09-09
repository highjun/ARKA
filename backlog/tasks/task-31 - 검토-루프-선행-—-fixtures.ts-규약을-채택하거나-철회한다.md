---
id: TASK-31
title: 검토 루프 선행 — fixtures.ts 규약을 채택하거나 철회한다
status: To Do
assignee: []
created_date: '2026-09-09 01:37'
labels:
  - review
  - test
dependencies: []
ordinal: 31000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CONVENTIONS "Mock은 Mock<Name>.ts, fixture는 fixtures.ts로 테스트와 스토리가 공유한다"인데 리포 전체에 fixtures.ts가 0개다. 스토리와 테스트가 각자 데이터를 인라인으로 갖고 있다. 규약을 실제로 쓰거나 문장을 지운다 — 지키지 않는 규약은 다음 사람을 헷갈리게만 한다.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 fixtures.ts가 실제로 쓰이거나, CONVENTIONS에서 해당 문장이 사라진다
<!-- AC:END -->
