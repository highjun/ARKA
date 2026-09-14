# ADR 0008: 컴포넌트는 원소 위에 얇게 얹고 변형은 data 속성으로 싣는다

## 맥락:
컴포넌트 42개가 Primer 관례를 대체로 따르는데, 그 관례를 적어 둔 문서가 없어 어긋난 자리(닫힌 props,
한 파일에 부품 다섯, 31키 클래스맵)를 무엇에 비추어 어긋났다고 할 근거가 없었다. 바깥 관례와 항목마다
견주어 이점이 있는 쪽을 골랐고, 변경 비용은 판단에 넣지 않았다.

## 결정:
- **props는 원소 속성 위에 얹는다** — `ComponentPropsWithoutRef<'x'>`에 자기 것을 더하고, `className`·`style`·`aria-*`·`data-*`는 통과시킨다. 동적 값(들여쓰기·높이)의 자리는 `style`이다.
- **`ref`는 보통 prop이다. `forwardRef`를 쓰지 않는다** — React 19가 그렇게 바꿨고 우리는 18을 지원하지 않는다.
- **변형은 문자열 유니온 prop을 `data-<축>`으로 싣는다.** CSS는 루트 클래스 하나 안에서 `:where([data-x])`로 갈라 특이성을 한 겹으로 둔다. 클래스 이름 맵을 만들지 않는다.
- **`value`/`defaultValue`/`onChange` 삼종은 `useControllableState`가 중재한다** — 손으로 `useState`를 두지 않는다.
- **슬롯이 둘까지면 `ReactNode` prop(`leadingVisual` 식), 셋 이상이면 부품으로 가른다.** 예외는 남의 컴포넌트가 자식을 **참조 동일성**으로 골라내는 자리다 — 그 안에 우리 부품을 끼우면 부모가 못 알아본다(Primer `useSlots`). 그때는 슬롯이 셋을 넘어도 prop으로 받고 조립을 안쪽에 둔다.
- **compound는 `Object.assign(Root, { Item })`이다.** 부품이 없으면 그냥 내보낸다. props 타입은 `<Name>Props`·`<Name><Sub>Props`로 평평하게 둔다.
- **폴더 하나에 부품마다 파일 하나와 CSS 하나**를 둔다. 컨텍스트는 `<Name>Context.ts`로 뺀다.
- **아이콘만 있는 컨트롤은 `aria-label`과 `aria-labelledby` 중 하나를 타입으로 요구한다.** 못 쓰게 만들 때는 `disabled`보다 `inactive`를 쓴다 — 키보드로 발견할 수 있어야 한다.
- **클래스는 `clsx`로만 합친다.** 폐기할 것은 `@deprecated`에 대체를 적고, 탈출구에는 `unsafe` 접두를 붙인다.

## 기각:
- **`forwardRef` 유지** — Primer가 아직 쓰지만 그것은 React 18 호환 때문이다. 우리에겐 래퍼 한 겹과 `displayName` 손질만 남는다.
- **자작 `useControlledState`·`assembleCompound`·`mergeClassNames`** — 각각 Radix 훅·`Object.assign`·`clsx`가 같은 일을 한다. `assembleCompound`는 부품이 없는 17곳에서 `{}`를 넘기고 있었다.
- **`style`을 `Omit`으로 막기** — 인라인 style을 막으면 동적 값이 `classNames` 같은 탈출구 prop으로 새어 나간다.
- **타입 있는 다형 `as`** — 텍스트류는 Primer 것을 직접 쓰므로 이미 딸려 오고, 우리 컴포넌트는 낼 원소가 정해져 있다.
- **Primer의 상태 등급(draft/alpha/beta)과 `/experimental` 진입점** — 바깥 소비자가 없는 앱이라 얻는 것이 없다.

## 대가:
- **Primer 컴포넌트와 우리 것의 모양이 다르다** — 저쪽은 `forwardRef`, 이쪽은 prop이다. 섞어 쓰는 자리에서 ref 타입이 갈린다.
- **`data-*`는 문자열이라 CSS와 TS가 어긋나도 컴파일이 통과한다.** 변형을 더하고 CSS를 빼먹으면 아무도 알려주지 않는다 — 스토리가 그 자리다(→ [ADR 0010](0010-ui-verification.md)).

## 강제:
- **린트** `@eslint-react/no-forward-ref` — `forwardRef` 사용을 막는다.
- **린트** `primer/direct-slot-children`·`primer/spread-props-first` — 슬롯 감싸기와 props 덮어쓰기 순서를 막는다.
- **테스트** `packages/client/test/structure.test.ts` — 컴포넌트 폴더에 스토리·테스트·배럴이 있고 그룹 배럴이 없기를 요구한다.
- **타입** — `aria-label` XOR `aria-labelledby`, `<Name>Props`의 원소 속성 상속.
- **리뷰** — "이 슬롯이 둘인가 셋인가"와 "이 축이 변형인가 다른 컴포넌트인가"는 사람만 판정한다.

## 상태:
승인됨 (2026-09-14)
