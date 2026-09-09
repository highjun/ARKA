---
id: TASK-35
title: VRT를 실제로 강제하는 관문이 하나도 없다
status: To Do
assignee: []
created_date: '2026-09-09 01:47'
labels:
  - review
  - ops
dependencies: []
priority: high
ordinal: 35000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
FileTree 기준 이미지가 ade9e3a(밀도 토큰) 이후로 낡아 pnpm run vrt가 계속 빨간불이었는데 아무도 몰랐다. 이유가 셋이다 — check가 VRT를 포함하지 않고, 원격 저장소가 없어 CI의 vrt 잡이 한 번도 돈 적이 없고, pre-push 훅은 push할 곳이 없어 뜨지 않는다. E2E도 같은 처지다(check에 없고 CI에서만). 어디서 강제할지 정한다. check에 넣으면 매 커밋마다 Docker를 띄우게 되므로 그대로는 못 넣는다.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 VRT와 E2E가 사람 손을 거치지 않고 도는 자리가 정해져 있다
- [ ] #2 기준 이미지가 낡으면 병합 전에 드러난다
<!-- AC:END -->
