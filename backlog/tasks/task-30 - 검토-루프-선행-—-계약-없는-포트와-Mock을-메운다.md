---
id: TASK-30
title: 검토 루프 선행 — 계약 없는 포트와 Mock을 메운다
status: Done
assignee: []
created_date: '2026-09-09 01:37'
updated_date: '2026-09-09 02:20'
labels:
  - review
  - test
dependencies: []
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
IServerInfo/HttpServerInfo는 어댑터가 있는데 계약 스위트가 없고 Mock도 없다 — 유일한 "계약 없는 포트"다. MockMarkdownSource(IMarkdownSource)는 테스트도 계약도 없어 Mock과 실물의 짝이 아무것에도 묶여 있지 않다.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 IServerInfo에 계약 스위트가 있고 Mock과 HttpServerInfo 양쪽이 통과한다
- [x] #2 IMarkdownSource에 계약 스위트가 있고 MockMarkdownSource가 통과한다
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
IServerInfo: serverInfo.contract.ts + MockServerInfo, Mock과 HttpServerInfo 양쪽에서 실행. IMarkdownSource: markdownSource.contract.ts + MockMarkdownSource 실행, 그리고 실물을 registerServices.tsx의 인라인 객체에서 extensions/markdown/infra/WorkspaceMarkdownSource.ts로 꺼내 같은 스위트를 돌린다. 의존은 구조 타입으로 선언해 filesystem 슬라이스를 import하지 않는다.
<!-- SECTION:NOTES:END -->
