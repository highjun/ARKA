---
id: TASK-31
title: 검토 루프 선행 — fixtures.ts 규약을 채택하거나 철회한다
status: Done
assignee: []
created_date: '2026-09-09 01:37'
updated_date: '2026-09-09 02:20'
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
- [x] #1 fixtures.ts가 실제로 쓰이거나, CONVENTIONS에서 해당 문장이 사라진다
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
철회했다. 근거는 실측 — 48커밋 동안 채택률 0이고, FileTree를 보면 스토리는 그럴듯한 프로젝트 트리 하나를, 테스트는 단언마다 다른 최소 트리 셋(ITEMS·NESTED_ITEMS·TWO_ITEMS)을 쓴다. 같은 데이터가 아니고 같아서도 안 된다. CONVENTIONS의 문장을 "테스트와 스토리가 데이터를 공유하지 않는다"로 바꾸고 ADR 0008 상태에 개정을 기록했다. Mock<Name>.ts 명명은 실제로 쓰여(10개) 그대로 둔다.
<!-- SECTION:NOTES:END -->
