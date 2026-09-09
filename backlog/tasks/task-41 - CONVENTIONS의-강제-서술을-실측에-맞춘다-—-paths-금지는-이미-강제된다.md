---
id: TASK-41
title: CONVENTIONS의 강제 서술을 실측에 맞춘다 — paths 금지는 이미 강제된다
status: To Do
assignee: []
created_date: '2026-09-09 05:24'
labels:
  - review
  - docs
dependencies: []
ordinal: 41000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CONVENTIONS.md:75가 "셋째 줄(패키지명 import·paths 금지)은 아직 강제되지 않는다 — 리뷰로 본다"고 적었는데 tsconfig paths 금지는 package.json의 lint:config가 grep으로 막고 check에 물려 있다. 강제되지 않는 것은 "패키지명으로 가져온다" 하나뿐이고, 그것도 TASK-40이 켜면 사라진다. ADR 0001 재검토에서 나왔다.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 CONVENTIONS의 강제 서술이 실제 강제 장치와 일치한다
<!-- AC:END -->
