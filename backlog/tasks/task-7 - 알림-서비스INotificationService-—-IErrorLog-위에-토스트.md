---
id: TASK-7
title: 알림 서비스(INotificationService) — IErrorLog 위에 토스트
status: Done
assignee: []
created_date: '2026-09-08 15:40'
updated_date: '2026-09-08 16:26'
labels:
  - workbench
dependencies: []
priority: medium
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
VSCode의 INotificationService. IErrorLog에 기록된 오류를 Radix Toast로 보여준다. 이후 익스텐션이 사용자에게 알릴 때 쓰는 공용 서비스.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
INotificationService + NotificationService(중복 합침, 5개 상한), ErrorNotifier 기여(IErrorLog → 알림), NotificationList 컴포넌트, ShellViewModel.notifications.
<!-- SECTION:NOTES:END -->
