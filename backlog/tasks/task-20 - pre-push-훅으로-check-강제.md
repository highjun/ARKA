---
id: TASK-20
title: pre-push 훅으로 check 강제
status: Done
assignee: []
created_date: '2026-09-08 15:40'
updated_date: '2026-09-08 16:17'
labels:
  - tooling
dependencies: []
priority: low
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
simple-git-hooks 또는 lefthook. 커밋 훅은 무겁고 푸시 훅이 맞다.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
simple-git-hooks pre-push → pnpm run check. prepare 스크립트가 설치 때 훅을 건다.
<!-- SECTION:NOTES:END -->
