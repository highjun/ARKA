---
id: TASK-28
title: 검토 루프 선행 — view 13개의 시각 검토 대상 여부를 정하고 스토리를 붙인다
status: To Do
assignee: []
created_date: '2026-09-09 01:37'
labels:
  - review
  - storybook
dependencies: []
priority: high
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
시각 검토를 Storybook 개발 서버로 하기로 했는데 view/는 스토리가 0개다. .storybook/main.ts 주석은 "view/는 ViewModel에 묶여 있어 컨테이너 상태만 골라 쓴다"고 적었지만 실제 커버리지는 0이라 문서와 현실이 어긋나 있다. 13개 전부에 스토리를 붙이거나, ViewModel에 묶인 view는 시각 검토 대상에서 빼고 그 사실을 main.ts와 CONVENTIONS에 명시한다 — 둘 중 하나여야 한다.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 view의 시각 검토 방침이 .storybook/main.ts 주석과 실제 커버리지에서 일치한다
- [ ] #2 스토리를 붙이기로 한 view는 기본/빈/로딩/에러 최소 세트를 갖는다
- [ ] #3 pnpm run vrt가 새 스토리의 기준 이미지와 함께 초록이다
<!-- AC:END -->
