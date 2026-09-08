---
id: TASK-15
title: storybook-static을 .output/으로 옮기고 vrt.config 경로를 맞춘다
status: Done
assignee: []
created_date: '2026-09-08 15:40'
updated_date: '2026-09-08 17:04'
labels:
  - tooling
dependencies: []
priority: low
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
packages/client/.output/storybook-static이 손으로 옮긴 잔재로 남아 있고 test/vrt/vrt.config.ts는 packages/client/storybook-static을 서빙한다. storybook build -o 로 출력 위치를 고정하고 설정을 한 곳에 맞춘다.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
storybook build -o .output/storybook-static, vrt.config·stories.spec이 그 경로를 본다.
<!-- SECTION:NOTES:END -->
