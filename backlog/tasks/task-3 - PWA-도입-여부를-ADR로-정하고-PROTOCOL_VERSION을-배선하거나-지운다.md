---
id: TASK-3
title: PWA 도입 여부를 ADR로 정하고 PROTOCOL_VERSION을 배선하거나 지운다
status: To Do
assignee: []
created_date: '2026-09-08 15:40'
labels:
  - design
  - release
dependencies: []
priority: high
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
ADR 0015는 'PWA가 폰에 캐시된다'를 전제로 하는데 manifest·service worker가 없다. 도입하면 0015 배선(모든 요청 스키마가 ProtocolVersioned 확장, 서버가 VersionMismatch 응답, /api/version에 protocolVersion)이 필수. 안 하면 contracts/common/version.ts를 지운다. 배포 전 결정.
<!-- SECTION:DESCRIPTION:END -->
