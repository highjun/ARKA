# ADR 0006: Radix는 상호작용, Primer는 기본 컴포넌트

## 결정:
- 상호작용 프리미티브(Dialog, DropdownMenu, ToggleGroup, ScrollArea 등 headless가 필요한 것)는 **Radix**를 쓴다.
- 기본 컴포넌트(Button, IconButton, ActionList, ActionMenu, SegmentedControl, CounterLabel 등 모양이 이미 있는 것)는 **`@primer/react`**를 그대로 쓴다.
- 디자인 토큰은 **`@primer/primitives`를 npm 의존성**으로 두고 `globals.css`에서 `@import`한다. 버전은 lockfile이 고정한다.
- 스타일은 **CSS Modules**로 쓰고, 값은 Primer 토큰 변수(`--base-size-16`, `--fgColor-*` 등)를 참조한다.
- Primer 컴포넌트는 `shared/components`의 배럴로 통과시키지 않는다. 쓰는 쪽이 `@primer/react`에서 직접 가져와, import 문만 보고 우리 것인지 Primer 것인지 알 수 있게 한다.

## 기각:
- Primer 컴포넌트를 걷어내고 Radix + 자체 스타일로 가기 — Radix는 headless라 `Button`·`IconButton`에 대응물이 아예 없어 모양을 처음부터 써야 한다. 흡수 대상 코드에서 Primer를 쓰는 파일이 24개고, 통과 중인 VRT 기준 이미지가 전부 무효화된다. "완성형 라이브러리는 자체 디자인 언어가 강해 IDE 밀도로 오버라이드가 힘들다"는 우려가 있었지만, 실물이 이미 폰(390×844)과 데스크톱(1280)에서 VSCode 모양으로 VRT를 통과하며 반증됐다.
- Primer 토큰을 값으로 복사해 두기 — "상류 업데이트가 UI를 바꾼다"는 위험 때문이었는데, lockfile이 이미 버전을 고정하므로 그 위험이 없다. 복사하면 상류 수정만 못 받는다.
- `export * from '@primer/react'`로 한 곳에 모으기 — 한 곳에서 import하는 편의는 있지만 Primer API 전체가 우리 공개 표면이 된다.
- Tailwind, MUI, Ant Design — 토큰을 CSS 변수로 직접 통제하려는 이유가 그대로 유효하다.

## 상태:
승인됨. ADE 문서 §8의 "Radix(headless) 채택, Primer 컴포넌트 기각, Primer 토큰 값 복사"를 대체한다.
