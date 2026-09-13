# ADR 0009: 기본 컴포넌트는 Primer에서 가져오고 없는 것만 만든다

## 맥락:
지금 컴포넌트 42개의 출처가 세 갈래로 섞여 있다 — Primer 12, Radix 5, 자작 24. 왜 어느 것을 골랐는지
기록이 없어 Primer에 같은 것이 있는데 만든 자리(헤딩·링크·토글·다이얼로그)와 라이브러리가 하던 일이
CSS 표준이 된 자리(스크롤 영역)를 가려낼 근거가 없었다.

## 결정:
- **모양이 있는 기본 컴포넌트는 Primer에서 가져온다.** 접근성 검토를 이미 통과한 것을 다시 만들지 않는다.
- **감싸는 것은 없는 축을 더할 때만이다.** 이름만 바꾸는 겹은 두지 않는다 — 색 축을 더하거나 우리 아이콘 id를 잇는 것은 감쌀 이유이고, `Heading`을 `Heading`으로 감싸는 것은 아니다.
- **감쌀 때는 슬롯 표식을 다시 붙인다**(`asSlot`). Primer 부모는 자식을 표식으로 찾으므로 중간 겹이 조용히 배치를 깨뜨린다.
- **헤드리스 상호작용이 필요한데 Primer에 없으면 Radix를 쓴다.** 둘 다 없으면 만든다.
- **예외 둘을 명시한다.** ① **메뉴는 Radix 한 체계다** — Primer에 우클릭 메뉴가 없어 좌·우클릭을 한 API로 두려면 dropdown과 context를 함께 감싸는 길뿐이다. ② **아이콘은 자작이다** — VS Code의 codicon이 Primer에 없다.
- **라이브러리가 하던 일이 CSS 표준이 되면 CSS로 내린다.** 스크롤 영역은 `scrollbar-width`·`scrollbar-color`가 덮는다.
- **토큰은 Primer 계층을 그대로 읽는다** — component → control → semantic → base. 원시값과 색 리터럴을 쓰지 않는다.

## 기각:
- **자체 디자인 시스템** — 토큰 두 겹(`--arka-*` → Primer)을 설계했다가 짓지 않았다. 겹을 두면 Primer가 값을 바꿀 때 우리 겹이 낡은 채 남는다. 밀도(`--arka-row-height`) 하나만 우리 것이다.
- **Radix + 자체 스타일로 통일** — 헤드리스는 모양이 없어서 자유롭지만, 그 자유의 값이 컴포넌트마다 CSS 한 벌이다. 우리가 필요한 것은 GitHub과 같은 모양이다.
- **`PageLayout`으로 셸을 세우기** — 문서 흐름 레이아웃(페이지가 스크롤한다)이라 뷰포트에 고정된 IDE 셸과 전제가 다르다.
- **Primer 컴포넌트를 전부 우리 이름으로 한 겹 감싸 교체 지점을 만들기** — 교체한 적이 없는데 42개 전부에 겹이 생기고, 슬롯 표식이 깨지는 위험을 매번 무릎쓴다.

## 대가:
- **디자인 언어가 GitHub의 것이다.** 토큰 이름부터 그쪽을 따르므로 다른 모양으로 가려면 그때 값을 치른다.
- **가져오는 것 대부분이 `alpha`이고 일부는 `draft`다**(`Blankslate`·`SkeletonText`는 `/experimental`에만 있다). 마이너 올림에서 props가 바뀔 수 있고, 그것을 알려주는 것은 타입 검사뿐이다.
- **Primer 문서(`components.json`)와 `.d.ts`가 어긋난다** — 실측으로 열 군데 이상 달랐다. 타입이 정본이라고 보고 쓴다.

## 강제:
- **린트** `primer/no-deprecated-props`·`no-deprecated-entrypoints`·`no-deprecated-experimental-components`·`use-deprecated-from-deprecated` — 폐기된 API와 진입점을 막는다.
- **린트** `no-restricted-imports` — Primer `IconButton` 직접 import를 막는다(우리 겹이 아이콘 id를 잇는다).
- **stylelint** `@primer/stylelint-config` — 색·간격·테두리·그림자·글꼴을 토큰으로만 쓰게 한다.
- **리뷰** — "이것을 감쌀 축이 있는가"와 예외를 더하는 판단은 사람만 한다. 예외는 이 ADR을 고쳐서 늘린다.

## 상태:
승인됨 (2026-09-14)
