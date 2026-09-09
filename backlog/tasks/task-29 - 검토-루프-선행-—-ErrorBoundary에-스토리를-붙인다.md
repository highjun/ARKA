---
id: TASK-29
title: 검토 루프 선행 — ErrorBoundary에 스토리를 붙인다
status: Done
assignee: []
created_date: '2026-09-09 01:37'
updated_date: '2026-09-09 02:03'
labels:
  - review
  - storybook
dependencies: []
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
workbench/component/ErrorBoundary는 스토리가 없는 유일한 컴포넌트다. .module.css도 없다.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ErrorBoundary에 스토리가 있고 VRT 기준 이미지가 생성된다
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
스토리 둘 — Default(자식이 그대로), Caught(자식이 던져 fallback으로 바뀜). 이 컴포넌트는 자기 모양이 없어 스토리가 보여 주는 것은 "경계가 실제로 잡는가"다. 앱이 쓰는 fallback의 생김새는 CrashScreen 스토리에 있어 중복하지 않았다. 렌더는 Docker에서 확인했고 기준 이미지는 Accept 시점에 만든다.
<!-- SECTION:NOTES:END -->
