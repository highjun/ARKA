---
id: TASK-34
title: 주석이 존재하지 않는 린트 규칙을 인용한다 — arka/external-import-allowlist
status: To Do
assignee: []
created_date: '2026-09-09 01:44'
labels:
  - review
  - lint
dependencies: []
priority: medium
ordinal: 34000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
IDirectoryTreeViewModel.ts:36과 CommandCenterRegistry.test.ts:6이 `arka/external-import-allowlist`가 import를 막는다고 적었지만 그런 규칙은 없다. tooling/eslint-rules에 있는 것은 fileNames·modelIsStateLibraryFree·slicesAreSiblings·viewOnlyUsesViewModel·testNamesKorean 다섯뿐이다. axe.tsx가 설치되지 않은 애드온을 인용한 것(TASK-32)과 같은 부류 — 주석이 존재하지 않는 강제 장치를 근거로 든다. 규칙을 만들거나 주석을 고친다. 되풀이되는 실수라 린트로 잡는 편이 낫다: 주석 안의 `arka/<이름>` 인용이 플러그인에 실재하는지 검사하는 규칙은 값이 싸다.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 주석의 `arka/*` 인용이 전부 실재하는 규칙을 가리킨다
- [ ] #2 인용이 실재하는지 검사하는 린트 규칙이 있고 tooling/eslint-rules/*.test.ts에 valid/invalid fixture가 있다
<!-- AC:END -->
