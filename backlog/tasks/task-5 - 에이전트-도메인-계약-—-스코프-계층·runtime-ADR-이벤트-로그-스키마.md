---
id: TASK-5
title: '에이전트 도메인 계약 — 스코프 계층·runtime/ ADR, 이벤트 로그 스키마'
status: Done
assignee: []
created_date: '2026-09-08 15:40'
updated_date: '2026-09-08 16:14'
labels:
  - design
  - agent
dependencies: []
priority: high
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
App → Workspace → Session → Run 스코프와 services/ vs runtime/ 판별 기준(USER_NOTE)을 ADR로 고정한 뒤, 이벤트 로그 스키마를 계약 우선 리뷰로 제출한다. §15가 가장 중요하다고 한 지점. extensions/agent/의 미배선 컴포넌트는 계약이 생길 때 잇거나 지운다.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
ADR 0019, contracts/agent, 서버 features/agent(SQLite·RunManager·ScriptedRunner·SSE), 클라이언트 extensions/agent(ChatModel·ChatViewModel·세션 패널·대화 탭). 계약 스위트가 Mock과 실제 서버 양쪽 통과. 실제 LLM 실행기는 키가 있을 때(별도 태스크).
<!-- SECTION:NOTES:END -->
