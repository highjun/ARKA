---
id: TASK-30
title: 검토 루프 선행 — 계약 없는 포트와 Mock을 메운다
status: In Progress
assignee: []
created_date: '2026-09-09 01:37'
updated_date: '2026-09-09 02:03'
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
- [ ] #1 IServerInfo에 계약 스위트가 있고 Mock과 HttpServerInfo 양쪽이 통과한다
- [ ] #2 IMarkdownSource에 계약 스위트가 있고 MockMarkdownSource가 통과한다
<!-- AC:END -->
