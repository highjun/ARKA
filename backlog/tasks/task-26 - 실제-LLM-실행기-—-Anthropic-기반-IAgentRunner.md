---
id: TASK-26
title: 실제 LLM 실행기 — Anthropic 기반 IAgentRunner
status: Done
assignee: []
created_date: '2026-09-08 16:14'
updated_date: '2026-09-08 16:24'
labels:
  - agent
  - server
dependencies: []
priority: high
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
ScriptedRunner 자리에 Anthropic Messages API(streaming, tool use)를 쓰는 실행기. 키는 ADE_ANTHROPIC_API_KEY 환경변수(사용자가 준다 — USER_NOTE). 툴: 워크스페이스 읽기/쓰기/목록을 IWorkspaceFiles 계약 위에. 실행기 선택은 설정으로.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
infra/AnthropicRunner.ts(스트리밍 + 수동 툴 루프, adaptive thinking, ask_user → input.requested), workspaceTools(list/read/write/create), config ADE_ANTHROPIC_API_KEY/MODEL. 키 없이 가짜 스트림으로만 검증 — 실 API 검증은 사용자가 키를 넣은 뒤(USER_NOTE).
<!-- SECTION:NOTES:END -->
