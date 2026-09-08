# ADR 0020: 소스 제어는 서버가 `git` CLI를 워크스페이스에서 돌린다

## 결정:
- Git 상태·diff·스테이지·커밋은 서버 `features/git`이 `git -C <워크스페이스> …`를 **셸 없이**(`execFile`) 실행해 만든다. 클라이언트는 `/api/git/*`만 안다.
- 상태는 `status --porcelain=v1 -z`를 푼다. 워크스페이스가 저장소의 하위 디렉터리면 경로를 워크스페이스 기준으로 바꾸고 밖의 변경은 뺀다.
- 실행 이미지에 `git`을 넣는다(`apk add git`).
- 첫 범위는 VSCode 내장 git의 최소 집합이다 — 브랜치 표시, 변경 목록(스테이지/작업 트리), diff 보기, 스테이지/해제, 커밋. 브랜치 전환·푸시·풀·히스토리는 아직 없다.

## 기각:
- **isomorphic-git / nodegit** — 사용자의 실제 저장소에는 훅·서브모듈·LFS·전역 설정이 있고, CLI만이 그것을 전부 존중한다. nodegit은 네이티브 빌드가 필요하다.
- 클라이언트에서 직접 git 실행 — 브라우저다.
- 셸 문자열로 실행 — 경로에 공백·따옴표가 있으면 깨지고, 인젝션 자리다.

## 상태:
승인됨. 계약은 `contracts/src/git/api.ts`, 계약 스위트는 `extensions/git/model/gitService.contract.ts`(Mock과 실제 서버·실제 저장소 양쪽 통과).
