---
id: TASK-2
title: 서버 빌드·Dockerfile·docker-compose
status: To Do
assignee: []
created_date: '2026-09-08 15:40'
labels:
  - ops
  - release
dependencies: []
priority: high
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
서버는 지금 tsx로 소스를 실행한다. 빌드 산출물 하나(루트 dist/)로 묶고 이미지를 만든다. compose는 ~/.ade 볼륨, ADE_HOST=0.0.0.0, 헬스체크. Docker 경계 스모크: 볼륨 UID/GID, bind mount inotify, 재시작 후 데이터.
<!-- SECTION:DESCRIPTION:END -->
