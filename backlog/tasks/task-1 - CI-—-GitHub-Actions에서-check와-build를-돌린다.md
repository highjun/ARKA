---
id: TASK-1
title: CI — GitHub Actions에서 check와 build를 돌린다
status: Done
assignee: []
created_date: '2026-09-08 15:40'
updated_date: '2026-09-08 15:41'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
ci.yml: check(check+build+build-storybook) → e2e, vrt. 원격 저장소가 없어 실제 실행은 사용자가 push한 뒤.
<!-- SECTION:NOTES:END -->
