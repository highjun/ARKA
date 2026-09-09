---
id: TASK-28
title: 검토 루프 선행 — view 13개의 시각 검토 대상 여부를 정하고 스토리를 붙인다
status: Done
assignee: []
created_date: '2026-09-09 01:37'
updated_date: '2026-09-09 02:20'
labels:
  - review
  - storybook
dependencies: []
priority: high
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
시각 검토를 Storybook 개발 서버로 하기로 했는데 view/는 스토리가 0개다. .storybook/main.ts 주석은 "view/는 ViewModel에 묶여 있어 컨테이너 상태만 골라 쓴다"고 적었지만 실제 커버리지는 0이라 문서와 현실이 어긋나 있다. 13개 전부에 스토리를 붙이거나, ViewModel에 묶인 view는 시각 검토 대상에서 빼고 그 사실을 main.ts와 CONVENTIONS에 명시한다 — 둘 중 하나여야 한다.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 view의 시각 검토 방침이 .storybook/main.ts 주석과 실제 커버리지에서 일치한다
- [x] #2 대상 view는 그 ViewModel에 실제로 있는 상태를 스토리로 갖는다 — 없는 상태는 지어내지 않는다
- [x] #3 스토리가 오류 오버레이 없이 렌더된다
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
방침: 조합이 드러나는 view 여섯만 대상(.storybook/main.ts에 목록과 사유). 스토리 6개 파일 33개 — SearchView 5, SourceControlView 6, SettingsTabView 3, ChatTabView 6, DirectoryTreeView 7, ShellView 8. 인수 조건 3("새 스토리의 기준 이미지와 함께 초록")은 기준 이미지 정책이 바뀌어(Accept 시점 생성) 폐기했다. 대신 33개를 Docker에서 한 번 찍어 렌더를 눈으로 확인하고 기준은 지웠다. 찍는 과정에서 TASK-36(모델 선택기 미배선)·TASK-37(Shell 헤더 잘림)을 발견했다.
<!-- SECTION:NOTES:END -->
