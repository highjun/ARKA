---
id: TASK-1
title: CI — GitHub Actions에서 check와 build를 돌린다
status: To Do
assignee: []
created_date: '2026-09-08 15:40'
labels:
  - ops
  - release
dependencies: []
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
typecheck → lint → lint:css → test → build → build-storybook. 앞에서 걸리면 뒤를 안 돌린다. VRT는 Docker라 CI에서 같은 이미지로 돈다.
<!-- SECTION:DESCRIPTION:END -->
