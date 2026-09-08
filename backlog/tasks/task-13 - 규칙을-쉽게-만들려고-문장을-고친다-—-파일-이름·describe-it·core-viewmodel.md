---
id: TASK-13
title: 규칙을 쉽게 만들려고 문장을 고친다 — 파일 이름·describe/it·core/viewmodel
status: Done
assignee: []
created_date: '2026-09-08 15:40'
updated_date: '2026-09-08 17:16'
labels:
  - lint
  - docs
dependencies: []
priority: low
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
파일 이름: '클래스 PascalCase / 함수 모듈 camelCase / 계약 I<Name>.ts'로 실측에 맞춘다(위반 55→0). describe/it 규칙 분리(137→0). core/view-model/ → core/viewmodel/. 그 뒤 파일명 규칙을 린트로.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
core/view-model → core/viewmodel, arka/file-names 규칙(클래스/컴포넌트/계약 PascalCase, 함수 모듈 camelCase, 폴더 camel/Pascal, 하이픈·밑줄 금지) 켬. describe/it 분리는 test-names-korean이 it만 봄으로써 해소.
<!-- SECTION:NOTES:END -->
