---
id: TASK-19
title: pnpm catalog와 engines
status: Done
assignee: []
created_date: '2026-09-08 15:40'
updated_date: '2026-09-08 17:04'
labels:
  - tooling
dependencies: []
priority: low
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Playwright 버전이 루트·client·Docker 태그 3곳. catalog:로 한 곳에. engines.node와 .nvmrc.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
catalog: (@playwright/test·vitest·typescript·zod). Docker 태그의 Playwright 버전은 아직 vrt 스크립트에 손으로 — 이미지 태그를 catalog에서 뽑는 건 pnpm이 지원하지 않는다.
<!-- SECTION:NOTES:END -->
