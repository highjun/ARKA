# ADR 0004: 주석은 자리가 형태와 필수 여부를 정한다

## 맥락:
종류로 자르는 옛 규칙은 사람만 판정할 수 있어 강제가 붙지 못했다. 그 사이 "무엇을 하는지" 설명과
결정을 통째로 담은 파일 머리 블록이 자랐고, 정작 공개 면에는 문서가 없다. 자리로 정하면 기계가 판정한다.

## 결정:
- **공개 선언에는 `/** */`가 필수다** — export function·최상위 화살표 함수·export class·public 메서드·export interface/type/enum.
- 그중 `private`·`protected`·`#private`·constructor는 제외하고, 오버로드는 첫 시그니처에만 쓴다.
- **그 밖의 선언 위에도 `/** */`를 쓴다.** `//`·`/* */`가 붙어 있으면 전환한다.
- **`//`는 함수 본문 안에서만 쓴다** — 연속 4줄까지, 코드 줄 끝에는 달지 않는다.
- 블록은 TSDoc으로 쓰고 타입 표기(`@param {T}`)는 하지 않는다 — 시그니처가 이미 말한다.
- **한글로 쓴다.** 코드 식별자와 런타임 문자열만 영문이다.
- 주석 처리된 코드와 `TODO`·`FIXME`·`XXX`·`HACK`은 남기지 않는다. **미룬 일은 `docs/tasks/`에 적는다.**
- **지시문(`eslint-*`·`@ts-*`)으로 이 규칙들을 끄지 못한다.**

## 기각:
- 종류로 자르기(계약 / 왜 / 비자명한 로직 / 외부 사정) — 이 ADR의 이전 판이다. **사람만 판정할 수 있어 강제가 붙지 못했다.**
- 주석을 계약(`type`·`interface`·값 `const`)에만 허용하기 — 강제는 되지만 **공개 면에 문서가
  없는 것을 방치한다.** 실측으로 공개 선언 476곳에 문서가 없다.
- `flat/recommended-tsdoc` 프리셋 — `require-param` 등 30개 남짓을 함께 켠다. 규칙에는 그것을
  낳은 결정이 있어야 하므로 손으로 고른다.

## 대가:
- **공개 면을 늘릴 때마다 문서를 쓴다.** 지금 밀린 것이 476곳이다.
- 플러그인 넷(전이 의존성 33개)이 든다. 지금 `ops`의 eslint 관련 의존성은 5개다.

## 강제:
- **린트** `jsdoc/require-jsdoc`·`jsdoc/convert-to-jsdoc-comments`: 공개 선언에 주석을 `/** */`로 갖도록 한다.
- **린트** `jsdoc/require-description`·`informative-docs`·`no-blank-blocks`· `no-blank-block-descriptions`·`no-types`·`tsdoc/syntax`: 주석의 자명한 내용이 없도록 제한한다.
- **린트** `line-comment-position`·`arka/max-comment-lines` —  주석의 위치와 양을 제한한다.
- **린트** `sonarjs/no-commented-code`·`no-warning-comments` — 불필요한 내용(코드나 경고)를 주석으로 두지 않는다.
- **린트** `eslint-comments/require-description`·`no-unlimited-disable`· `disable-enable-pair`·`no-restricted-disable`·`@typescript-eslint/ban-ts-comment`: eslint-disable 등으로 우회할 수 없게 한다.

## 상태:
승인됨 (2026-09-10)
