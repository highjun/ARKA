# ADR 0005: 병합 전 관문은 CI가 들고, `verify`는 손에 남는다

## 맥락:
안정적인 운영/DevOps를 위해서는 결국 CI가 필요하다.

## 결정:
- **병합 전 강제는 CI가 든다.** PR마다 필수 검사 하나가 돌고 그것이 통과해야 합친다. 무엇이 어느 Stage로 언제 도는지는 → [ADR 0013](0013-stage-and-trigger.md).
- **`main` 머지가 곧 배포다.** `needs`로 검사를 강제한다 — 그것만이 워크플로 안에서 통과를 보장한다. 배포의 모양은 → [ADR 0006](0006-deploy-shape.md).
- **CI에만 있는 검사를 만들지 않는다.** CI는 로컬에서 부를 수 있는 명령만 부른다 — 그래야 빨간불을 재현할 수 있다.
- **`verify`는 손에 남는다.** 내보내기 전 한 번 도는 느린 관문이고, CI가 그것을 대체하지 않는다.
- **검사는 지킬 것이 있을 때 켠다.** VRT는 기준 이미지가 검토에서 하나씩 쌓이는 구조라(→ CONVENTIONS의 테스트 절) 승인이 없는 동안은 켜도 전부 건너뛴다. 무시되는 관문은 없는 것만 못하다.
- **squash merge라 PR 제목이 곧 커밋 메시지다.** 그래서 커밋이 아니라 제목을 검사하고, 형식은 Conventional Commits + 한글 설명이다.

## 기각:
- **부분 검사(바뀐 패키지만)** — 전체가 20초라 아끼는 것이 10초 미만인데, 판단이 고장 나면 **조용히 덜 검사하면서 초록**이 된다. ADR 0001이 이미 재검토 기준을 적었다: 패키지 5개 이상 + CI 지연.
- **`pre-push` 훅만으로 관문을 삼기** — 훅은 `--no-verify`로 지나가고 남는 기록이 없다. 다만 룰셋을 못 거는 동안은 그것이 `main` 직접 푸시를 막는 유일한 장치다(→ `ops/hooks/prePush.ts`).

## 대가:
- **설정이 저장소 안에서 세 벌이 된다** — `ops/pipeline/`·`ops/deploy/`·`.github/workflows/`. 갈라지면 `ops/pipeline/check.ts`가 정본이다 — 워크플로는 그것을 부르기만 한다.
- **머지가 러너에 묶인다.** GitHub가 느리면 병합이 느리다.
- **`.github/`가 루트 항목을 하나 늘린다**(→ ADR 0002). 위치를 고를 수 없는 자리라 예외로 둔다.

## 강제:
- **워크플로** `.github/workflows/ci.yml` — 병합 전 관문의 자리. 잡 구성은 → [ADR 0013](0013-stage-and-trigger.md).
- **룰셋** `main` — PR 필수, 승인 1, 코드 오너 리뷰, **필수 검사 `check`**, 강제 push·삭제 금지
  (2026-09-13, 저장소를 공개로 바꾼 뒤에 걸 수 있게 됐다). 그래서 `check`라는 **이름이 계약이다.**
  `ops/hooks/prePush.ts`의 로컬 차단은 그 앞의 미끄럼 방지턱으로 남는다.
- **commitlint** `ops/commitlint.config.ts` — PR 제목의 타입·scope·길이. `check`의 한 단계다.
- **gitleaks** `ops/.gitleaksignore` — 새로 더해지는 커밋만 훑는다.
- **actionlint** `.github/actionlint.yaml` — 워크플로의 뜻(없는 `uses`·잘못된 `needs`·러너 라벨·셸 문법). 형태는 `yml/*`가 본다. 공식 이미지를 `docker run`으로 쓴다 — gitleaks와 같은 방식이다.
- **CODEOWNERS** `.github/CODEOWNERS` — 배치·설정·결정이 사는 자리에 리뷰가 자동으로 붙는다.

## 상태:
승인됨 (2026-09-10). 2026-09-13 개정 — 검사 잡을 `check` 하나로 모았다. 2026-09-14 개정 — 잡이 `pnpm --filter ops check`를 부르고 actionlint 단계가 붙었다. 2026-09-15 개정 — 죽은 미리보기 줄을 걷고 "언제 도나"를 ADR 0013으로 뗐다.
