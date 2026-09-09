---
id: TASK-32
title: 검토 루프 선행 — axe.tsx가 인용하는 애드온이 실재하지 않는다
status: To Do
assignee: []
created_date: '2026-09-09 01:37'
labels:
  - review
  - a11y
dependencies: []
ordinal: 32000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
shared/utils/axe.tsx가 jsdom에서 color-contrast를 끄는 근거로 "@storybook/addon-a11y가 실제 브라우저에서 이미 맡고 있다"고 적었으나 그 애드온은 설치도 설정도 되어 있지 않다. 결과적으로 색대비를 아무도 검사하지 않는다. 애드온을 넣든 주석을 고치든 둘 중 하나.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 색대비를 실제로 검사하는 곳이 있거나, axe.tsx 주석이 검사하지 않는다는 사실을 정확히 적는다
<!-- AC:END -->
