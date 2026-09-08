---
id: TASK-24
title: extensions/agent/ 미배선 컴포넌트 처리
status: Done
assignee: []
created_date: '2026-09-08 15:40'
updated_date: '2026-09-08 16:14'
labels:
  - agent
dependencies: []
priority: low
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
component/ 7개만 있고 외부 참조 0. 에이전트 계약이 생길 때까지 두거나 지운다 — 미배선으로 두면 '이미 있는 것'으로 오해된다.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
agent/component 7개가 ChatSessionsView·ChatTabView에 배선됐다.
<!-- SECTION:NOTES:END -->
