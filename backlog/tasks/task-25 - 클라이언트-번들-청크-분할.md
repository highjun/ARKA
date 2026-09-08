---
id: TASK-25
title: 클라이언트 번들 청크 분할
status: To Do
assignee: []
created_date: '2026-09-08 15:52'
labels:
  - client
  - perf
dependencies: []
priority: low
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
index 청크가 2.5MB. CodeMirror·Primer·Radix를 벤더 청크로 나눈다(build.rolldownOptions.output.codeSplitting). 그 뒤 vite.config의 maximumFileSizeToCacheInBytes를 기본값으로 되돌린다.
<!-- SECTION:DESCRIPTION:END -->
