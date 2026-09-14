# ADR 0011: 린트 규칙은 기성품을 쓰고 자작은 관례에 없을 때만 만든다

## 맥락:
"새 실수 패턴은 린트 규칙으로 만든다"는 절차를 따라 자작 규칙 일곱이 생겼고, 그중 여섯은 주인 ADR이
없어 2026-09-13에 껐다. 실측하니 여섯 중 다섯은 같은 일을 하는 플러그인이 npm에 있었다 — 우리가 만든
것은 규칙 본문이 아니라 `ruleTester`·테스트·유지 부담이었다.

## 결정:
- **규칙을 만들기 전에 npm에서 찾는다.** 관례에 있는 것을 만들지 않는다 — 이 저장소의 전반 원칙을 린트에도 적용한다.
- **프리셋은 그것을 낳은 결정이 하나일 때만 통째로 켠다.** `eslint-plugin-primer-react`의 recommended는 전부 "Primer를 잘못 쓰는 것"을 막으므로 결정 하나(→ [ADR 0009](0009-primer-first.md))에 달려 있다. 서로 다른 결정에 걸친 프리셋은 손으로 고른다.
- **대상을 다스리는 도구를 그 대상의 배포자에게서 받는다** — Primer 컴포넌트는 `eslint-plugin-primer-react`, Primer 토큰은 `@primer/stylelint-config`가 본다. 우리가 토큰 이름을 옮겨 적지 않는다.
- **자작 규칙은 관례에 없는 것 하나뿐이다** — `arka/max-comment-lines`. 주석의 줄 **수**를 재는 규칙이 어디에도 없다(있는 것은 줄 **너비**를 잰다).
- **규칙 하나를 켜는 순서는 측정 → 위반 0 → 켜기다.** 위반이 남아 있으면 같은 라운드에서 없애고, 못 없애면 켜지 않는다. 빨간 검사를 켜지 않는다(→ [ADR 0005](0005-ci-gate.md)).
- **인용하는 규칙 ID는 실재해야 한다.** 없는 규칙을 근거로 든 주석이 두 번 나왔다. 강제가 아직 없으면 규칙 ID 대신 ADR을 가리킨다.

## 기각:
- **껐던 `arka/*` 여섯을 되살리기** — 넷은 기성품(`primer-react`·`jsx-a11y`·`@eslint-react`·`import-x` zone)이 덮고, 둘(`test-names-korean`·`view-only-uses-view-model`)은 코어 `no-restricted-syntax` 선택자 넷이다. 되살리면 남의 코드 대신 우리 코드를 유지한다.
- **`eslint-plugin-boundaries`로 슬라이스 경계를 다스리기** — 캡처 변수(`{{from.slice}}`)로 "형제끼리만 금지"를 한 줄에 쓸 수 있어 골랐다가, v7에서 우리 배치에 걸리지 않아 걷었다(2026-09-14 실측). `import-x/no-restricted-paths`의 zone에 슬라이스를 열거하면 같은 경계가 되고, 다섯 줄이면 끝난다.
- **`eslint-plugin-project-structure`로 스토리 존재를 강제하기** — `folder-structure`가 트리 **전체**를 선언하게 만든다. 지금 정하려는 것은 컴포넌트 폴더 하나의 모양뿐이고, "옆에 파일이 있나"는 구문이 아니라 파일 시스템 질문이라 테스트가 더 맞는 자리다(`test/structure.test.ts`).
- **플러그인 없이 코어 규칙만 쓰기** — 폴더 구성과 슬라이스 경계는 선택자로 표현할 수 없다. 파일 시스템과 import 그래프를 읽어야 한다.

## 대가:
- **플러그인이 여섯 늘고 전이 의존성이 그만큼 딸려 온다.** 이 저장소는 이미 같은 이유로 넷을 들였다(→ [ADR 0004](0004-comment-rules.md)).
- **남의 규칙이라 메시지를 우리말로 바꾸거나 대안을 적어 넣을 수 없다.** 자작 규칙의 `message`가 하던 안내가 사라진다.
- **ESLint 메이저를 올릴 때 플러그인 여섯이 전부 따라와야 한다.** 하나가 늦으면 올림이 막힌다 — 지금 열린 TypeScript 메이저 PR이 같은 모양이다.

## 강제:
- **린트** `primer-react/*`·`jsx-a11y/*`·`@eslint-react/no-forward-ref`·`no-restricted-syntax`(한글 테스트 이름·`view/`의 훅)·`import-x/no-restricted-paths`(패키지·슬라이스)·`no-restricted-imports`(Primer `IconButton`)·`@typescript-eslint/no-restricted-imports`(`model/`의 상태 라이브러리).
- **stylelint** `@primer/stylelint-config` — 색·테두리·그림자·글꼴을 토큰으로만 쓰게 한다.
- **테스트** `packages/client/test/structure.test.ts` — 컴포넌트마다 스토리·테스트·배럴이 있는지, 그룹 배럴이 없는지.
- **파이프라인** `ops/pipeline/check.ts` — typecheck → lint → test → build 순서로 돌리고 앞에서 걸리면 뒤를 안 돌린다. CI의 `check` 잡이 이 파일을 부른다.
- **테스트** `ops/lint/rules/*.test.ts` — 자작 규칙에 valid/invalid를 둔다. 규칙이 하나니 파일도 하나다.
- **리뷰** — "이 규칙을 만들기 전에 찾아봤는가"와 프리셋을 통째로 켤지는 사람만 판정한다.

## 상태:
승인됨 (2026-09-14). 같은 날 적용하면서 두 도구를 바꿨다 — `boundaries`는 캡처가 안 걸려 `import-x` zone으로, `project-structure`는 트리 전체 선언을 요구해 구조 테스트로.
