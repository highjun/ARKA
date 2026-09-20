/**
 * 세트마다 **설명 한 줄과 prop 표**. 시트가 여기서 읽는다. 플러그인 안에서 돈다.
 *
 *     (0, eval)(await (await fetch("http://localhost:9230/tool/meta.js")).text());
 *     await globalThis.__arka.meta.apply();   // 설명을 Figma 에 써 넣는다
 *     globalThis.__arka.meta.audit();         // 표에 빠진 축·속성을 센다
 *
 * **설명은 `<위치> · <역할 한 줄>`.** 위치가 곧 출처다 — 라이브러리를 그대로 쓰면 라이브러리
 * 이름을, 우리가 변형하면 **코드에서 살 자리**(이미 있으면 현재 자리, 없으면 예상 자리)를 적는다.
 *
 * **분류는 두 층이다.**
 *
 *     1. React Props   바깥에서 넣는 것
 *        enum · string · number · boolean · object · action · slot
 *     2. CSS-State     prop 이 아니다. CSS 선택자로만 갈린다 (`:hover` `[data-disabled]` …)
 *
 * **Figma 의 속성 타입을 그대로 쓰면 거짓말이 된다.** `leadingVisual`·`description`·`action` 은
 * Figma 에선 BOOLEAN 이지만 코드에선 `ReactNode` — `slot` 이다. 그래서 갈래를 손으로 적는다.
 *
 * **무엇을 적는가 — 보이는 것이나 뜻을 바꾸는 prop 만.** 상속한 DOM 속성과 순수 a11y 통과
 * (`aria-*`·`role`·`alt`)는 안 적는다 — 단 보이는 글자가 되면(`IconButton` 의 `aria-label` 은
 * 툴팁이 된다) 적는다. `ButtonGroup.role` 처럼 키보드 이동 방식만 바꾸는 것도 안 적는다.
 * **가로채 뜻을 바꾼 것**(`Menu.Item.onSelect`, `ModeToggle.value`)은 적는다.
 *
 * 키는 **Figma 의 축·속성 이름**이다. 코드의 prop 이름이 다르면 `n` 에 적는다 —
 * 표엔 `n` 이, 견본 블록엔 키가 선다.
 *
 * **Compound 는 시트 머리 하나 + 부품마다 한 항목이다.** 머리 항목 `X` 는 `설명`·`부품`·(있으면)
 * `계층` 만 갖고 **`props` 가 없다.** `부품` 의 첫 줄은 언제나 **`X/Root`** — 전체에 속하는 prop
 * (갈래를 정하는 것 · 제어 짝 · `children`)만 든다. Figma 에 몸이 있으면 세트 이름도 `X/Root`,
 * 없으면 `가상: true` — 표만 서고 `apply()`·`audit()` 은 건너뛴다.
 *
 * **prop 은 한 표에만 산다.** 부품이 드는 것을 루트가 되풀이하지 않는다(`Panel.title` 은
 * `Panel/Header` 의 것이다). Figma 의 기계 속성(머리를 갈아 끼우는 INSTANCE_SWAP)은 Figma 이름을
 * 키로 두고 `n` 으로 React 이름(`children`)을 가리킨다. `audit()` 의 `루트에겹친prop` 이 이것을 센다.
 * 같은 키가 두 표에 서야 할 때는 **`겹침: "<이유>"`** 를 달아 검사에서 뺀다 — Figma 축이 부품에
 * 걸려 루트 prop 을 거울처럼 비추는 것(`Menu/Content.kind`), 루트가 부품에 내려 주는 것
 * (`Tab/Root.chrome`), 이름만 같고 뜻이 다른 것(`Select/Item.value`).
 *
 * 예외 — 라이브러리를 그대로 쓰는 루트(`Banner`·`Dialog`)의 `title` 같은 줄임 prop 은 남긴다.
 * 라이브러리 API 를 적는 표라서다. `d` 에 「`.Title` 의 줄임」이라고 적는다.
 */
globalThis.__arka = globalThis.__arka ?? {};

globalThis.__arka.meta = (() => {
  /** `t` 갈래. `n` 코드 이름(다를 때만). `d` 한 줄 설명. */
  const M = {
    // ── 01 Shared · 글자와 아이콘 ────────────────────────────────────────────
    Text: {
      설명: "shared/component/Text · 본문 글자",
      props: {
        // `variant`(body | caption) 는 뺐다 — 제품 17곳 중 명시한 곳 0, caption 은 렌더된 적이 없다(2026-09-18).
        size: { t: "enum", d: "small | medium | large. 기본 medium" },
        tone: { t: "enum", d: "default | muted | danger. 기본 default" },
        children: { t: "slot", d: "적을 말" },
      },
    },
    Icon: {
      설명: "shared/component/Icon · 이름으로 부르는 글리프 하나",
      props: {
        size: { t: "enum", d: "sm 16 | md 20 | lg 24. 기본 md" },
        iconId: { t: "enum", d: "`data/icons.json` 의 키. 지금 50개" },
      },
    },
    IconButton: {
      설명: "shared/component/IconButton · 아이콘만 있는 단추. 이름은 aria-label 로 읽힌다",
      props: {
        variant: { t: "enum", d: "default | primary | invisible | danger. 기본 default" },
        size: { t: "enum", d: "small | medium | large. 기본 medium" },
        disabled: { t: "boolean", d: "누를 수 없게 한다" },
        icon: { t: "slot", d: "글리프를 돌려주는 함수 — `() => <Icon iconId=… />`" },
        "aria-label": { t: "string", d: "필수. 툴팁 글도 이것이다" },
        onClick: { t: "action", d: "눌렀을 때" },
      },
      css: { state: "`:hover` `:active` `:focus-visible`. `@media (pointer: coarse)` 에서 터치 자리를 넓힌다" },
    },
    Button: {
      설명: "@primer/react Button · 누르면 일이 일어나는 단추",
      props: {
        variant: { t: "enum", d: "default | primary | danger | invisible. 기본 default" },
        size: { t: "enum", d: "small | medium | large. 기본 medium" },
        disabled: { t: "boolean", d: "누를 수 없게 한다" },
        leadingVisual: { t: "slot", d: "글자 앞에 붙는 아이콘" },
        children: { t: "slot", d: "단추에 적히는 말" },
        onClick: { t: "action", d: "눌렀을 때" },
      },
      css: { state: "`:hover` `:active` `:focus-visible`" },
    },
    Kbd: {
      설명: "shared/component/Kbd · 키 하나를 그린 키캡",
      props: {
        tone: { t: "enum", d: "default | onEmphasis. 어두운 면 위에 놓이면 onEmphasis" },
        children: { t: "slot", d: "키 이름 — `⌘` `K`" },
      },
    },

    // ── 01 Shared · 입력 ────────────────────────────────────────────────────
    TextInput: {
      설명: "@primer/react TextInput · 한 줄 입력칸",
      props: {
        disabled: { t: "boolean", d: "고칠 수 없게 한다" },
        validation: { t: "enum", n: "validationStatus", d: "none | error | success. 테두리 색이 갈린다" },
        leadingVisual: { t: "slot", d: "칸 안 왼쪽에 놓이는 것. 보통 아이콘" },
        leadingIcon: { t: "slot", d: "leadingVisual 에 꽂을 글리프 — Figma 에서 갈아 끼운다" },
        trailingAction: { t: "slot", d: "칸 안 오른쪽 단추. `TextInput.Action` 만 받는다" },
        block: { t: "boolean", d: "부모 폭을 다 쓴다. 우리 코드는 늘 켠다" },
        placeholder: { t: "string", d: '비었을 때의 흐린 글 — "찾을 내용"' },
        value: { t: "string", d: '적힌 값 — "src/index.ts"' },
        onChange: { t: "action", d: "글자가 바뀔 때" },
      },
      css: { state: "`:focus-visible` 이 테두리를 accent 로 바꾸고 바깥 고리를 그린다" },
    },
    Textarea: {
      설명: "@primer/react Textarea · 여러 줄 입력칸. 커밋 메시지가 이것이다",
      props: {
        disabled: { t: "boolean", d: "고칠 수 없게 한다" },
        validation: { t: "enum", n: "validationStatus", d: "none | error | success" },
        resize: { t: "enum", d: "none | both | horizontal | vertical. 오른쪽 아래 손잡이" },
        block: { t: "boolean", d: "부모 폭을 다 쓴다" },
        autoSize: { t: "boolean", d: "내용에 맞춰 키가 자란다" },
        characterLimit: { t: "number", d: "넘으면 아래 글자 수가 경고로 바뀐다 — 500" },
        value: { t: "string", d: "적힌 값" },
        onChange: { t: "action", d: "글자가 바뀔 때" },
      },
      css: { state: "`:focus-visible`" },
    },
    Checkbox: {
      설명: "@primer/react Checkbox · 여럿을 켜고 끄는 네모. 면을 accent 로 채운다",
      props: {
        checked: { t: "enum", d: "no | yes | mixed. mixed 는 자식이 반만 켜진 꼴이다(`indeterminate`)" },
        disabled: { t: "boolean", d: "고를 수 없게 한다" },
        required: { t: "boolean", d: "제출 전에 반드시 켜야 한다" },
        value: { t: "string", d: "제출 값. name 도 같은 값이 된다" },
        onChange: { t: "action", d: "켜고 끌 때" },
      },
      css: { state: "`:hover` 가 테두리를 짙게 하고 `:focus-visible` 이 링을 두른다" },
    },
    Radio: {
      설명: "@primer/react Radio · 여럿 중 하나만 고르는 동그라미. 획만 accent 로 두르고 속은 흰색이다",
      props: {
        checked: { t: "enum", d: "no | yes. 한 무리에서 하나만 yes 다" },
        disabled: { t: "boolean", d: "고를 수 없게 한다" },
        onChange: { t: "action", d: "고를 때" },
      },
      css: { state: "`:hover` 가 테두리를 짙게 하고 `:focus-visible` 이 링을 두른다" },
    },
    ToggleSwitch: {
      설명: "@primer/react ToggleSwitch · 바로 먹히는 켜짐/꺼짐. ARKA 는 알약으로 그린다",
      props: {
        checked: { t: "boolean", d: "off | on" },
        disabled: { t: "boolean", d: "돌릴 수 없게 한다" },
        loading: { t: "boolean", d: "서버를 기다리는 동안 스피너로 바뀐다" },
        onChange: { t: "action", d: "돌릴 때" },
      },
      css: { state: "`:hover` 가 테두리를 짙게 하고 `:focus-visible` 이 링을 두른다" },
    },
    FormControl: {
      설명: "@primer/react FormControl · 라벨·입력·설명을 한 덩어리로 묶는다",
      부품: [
        "FormControl/Root",
        "FormControl/Label",
        "FormControl/Caption",
        "FormControl/Validation",
        "FormControl/LeadingVisual",
      ],
    },
    "FormControl/Root": {
      설명: "@primer/react FormControl · FormControl.Root · 라벨·입력·설명을 세로로 쌓는 그릇",
      props: {
        required: { t: "boolean", d: "라벨 옆에 * 가 붙는다" },
        validation: { t: "enum", d: "Figma 축 — none | error. 코드에선 `FormControl.Validation` 을 넣고 빼는 것이다" },
        caption: { t: "slot", d: "Figma 속성 — `FormControl.Caption` 이 있나" },
        disabled: { t: "boolean", d: "안의 컨트롤을 다 잠근다" },
        layout: { t: "enum", d: "vertical | horizontal. 체크박스·라디오는 horizontal" },
        children: { t: "slot", d: "`.Label` + 컨트롤 + `.Caption`/`.Validation`" },
      },
    },
    "FormControl/Label": {
      가상: true,
      설명: "컨트롤 위 라벨",
      props: {
        visuallyHidden: { t: "boolean", d: "눈엔 안 보이고 읽어 주기만" },
        children: { t: "slot", d: "라벨 글" },
      },
    },
    "FormControl/Caption": {
      가상: true,
      설명: "컨트롤 아래 한 줄 설명",
      props: { children: { t: "slot", d: "설명 글" } },
    },
    "FormControl/Validation": {
      가상: true,
      설명: "값이 틀렸을 때 아래에 붉게 서는 줄",
      props: { variant: { t: "enum", d: "error | success | warning" }, children: { t: "slot", d: "알릴 말" } },
    },
    "FormControl/LeadingVisual": {
      가상: true,
      설명: "체크박스·라디오 라벨 앞 아이콘",
      props: { children: { t: "slot", d: "아이콘" } },
    },
    SegmentedControl: {
      설명: "@primer/react SegmentedControl · 칸을 나눠 하나만 고르는 띠",
      부품: ["SegmentedControl/Root", "SegmentedControl/Button", "SegmentedControl/IconButton"],
    },
    "SegmentedControl/Root": {
      설명: "@primer/react SegmentedControl · SegmentedControl.Root · 칸들을 한 줄에 붙이는 띠",
      props: {
        count: { t: "slot", n: "children", d: "`SegmentedControl.Button`·`.IconButton` 들. 지금 두셋" },
        // Figma 축이 루트 세트에 걸려 있어 여기 남긴다 — 세트를 다시 지어야 옮길 수 있다(2026-09-20).
        selected: {
          t: "boolean",
          겹침: "Figma 축이 루트 세트에 걸려 있다",
          d: "Figma 축 — 어느 칸이 골라졌나. 코드에선 `SegmentedControl.Button` 의 prop 이다",
        },
        size: { t: "enum", d: "small | medium" },
        fullWidth: { t: "boolean", d: "부모 폭을 다 쓴다" },
        onChange: { t: "action", d: "고를 때. 값이 아니라 인덱스를 준다" },
      },
    },
    "SegmentedControl/Button": {
      가상: true,
      설명: "칸 하나",
      props: {
        selected: { t: "boolean", d: "이 칸이 골라졌다" },
        leadingVisual: { t: "slot", d: "글자 앞 아이콘" },
        children: { t: "slot", d: "칸 이름" },
      },
    },
    "SegmentedControl/IconButton": {
      가상: true,
      설명: "아이콘만 있는 칸",
      props: {
        selected: { t: "boolean", d: "이 칸이 골라졌다" },
        icon: { t: "slot", d: "글리프" },
        "aria-label": { t: "string", d: "필수. 툴팁 글이 된다" },
      },
    },

    // ── 01 Shared · 표식 ────────────────────────────────────────────────────
    CounterLabel: {
      설명: "@primer/react CounterLabel · 숫자 하나를 담는 알약. 안 읽은 수",
      props: {
        tone: { t: "enum", n: "variant", d: "default | primary | secondary" },
        children: { t: "slot", d: "숫자 — 3" },
      },
    },
    Label: {
      설명: "@primer/react Label · 테두리만 있는 작은 알약. 분류·상태 표식",
      props: {
        tone: { t: "enum", n: "variant", d: "default | accent | success | attention | danger 등 열 가지" },
        size: { t: "enum", d: "small | large" },
        children: { t: "slot", d: "표식 글" },
      },
    },
    Avatar: {
      설명: "@primer/react Avatar · 동그랗게 잘린 사람. 조직은 네모다",
      props: {
        size: { t: "number", d: "픽셀 — 20 | 32 | 48. 기본 20" },
        shape: { t: "boolean", n: "square", d: "네모로 만든다. 기본은 동그라미" },
        src: { t: "string", d: "필수. 그림 주소" },
      },
    },
    Link: {
      설명: "@primer/react Link · 색으로만 구분하는 본문 링크. 밑줄은 올렸을 때만",
      props: {
        tone: { t: "boolean", n: "muted", d: "accent | muted. muted 는 평소엔 본문색이다" },
        inline: { t: "boolean", d: "글줄 안에 섞일 때 켠다 — 늘 밑줄이 있다" },
        href: { t: "string", d: '갈 곳 — "https://…"' },
        children: { t: "slot", d: "눌리는 말" },
      },
      css: { state: "`:hover` 가 밑줄을 그린다" },
    },
    ProgressBar: {
      설명: "@primer/react ProgressBar · 긴 일이 얼마나 갔는지 알리는 막대",
      props: {
        progress: { t: "number", d: "0~100 퍼센트 — 0 | 50 | 100" },
        barSize: { t: "enum", d: "small 5px | default 8px | large 10px" },
        inline: { t: "boolean", d: "글줄 안에 놓는다" },
        animated: { t: "boolean", d: "끝을 흐르게 한다" },
      },
    },
    Spinner: {
      설명: "@primer/react Spinner · 얼마나 걸릴지 모를 때 도는 고리",
      props: {
        size: { t: "enum", d: "small 16 | medium 32 | large 64. 기본 medium" },
        delay: { t: "boolean", d: "짧은 일에 깜빡이지 않게 늦춘다 — true·short·long·밀리초" },
      },
    },

    // ── 01 Shared · 담는 것 ─────────────────────────────────────────────────
    Container: {
      설명: "shared/component/Container · 넘치는 것을 스크롤로 받아 내는 그릇",
      props: {
        chrome: { t: "enum", d: "visible | none. visible 이면 테두리와 면을 그린다. 기본 visible" },
        scroll: { t: "enum", d: "auto | vertical | horizontal | none. 기본 auto" },
        children: { t: "slot", d: "담을 것" },
      },
    },
    ButtonGroup: {
      설명: "@primer/react ButtonGroup · 단추가 틈 없이 붙어 바깥 모서리만 둥근 줄",
      props: {
        // `role` 은 뺐다 — "toolbar" 일 때만 화살표 순회를 켜는 스위치라 디자인 인터페이스가 아니다.
        count: { t: "slot", n: "children", d: "붙일 Button·IconButton 들. 지금 둘셋" },
      },
    },
    // `ActionBar` 는 2026-09-18 에 버렸다 — IconButton 여럿 + 구분선일 뿐이고 Primer 가 더하는 건
    // 좁아질 때 넘침 메뉴로 접는 것 하나. 제품 import 0건.
    UnderlineNav: {
      설명: "@primer/react UnderlineNav · 밑줄로 지금 자리를 알리는 탭 줄. 아래 독과 설정 범위가 이것이다",
      부품: ["UnderlineNav/Root", "UnderlineNav/Item"],
    },
    "UnderlineNav/Root": {
      설명: "@primer/react UnderlineNav · UnderlineNav.Root · 칸들을 가로로 늘어놓고 아래 줄을 긋는다",
      props: {
        variant: { t: "enum", d: "inset | flush. flush 면 항목의 좌우 여백을 없앤다" },
        children: { t: "slot", d: "`.Item` 들" },
      },
    },
    "UnderlineNav/Item": {
      설명: "@primer/react UnderlineNav.Item · 탭 한 칸. 지금 것만 밑줄이 있다",
      props: {
        active: { t: "boolean", n: "aria-current", d: "지금 보고 있는 탭" },
        counter: { t: "number", d: "오른쪽 숫자 배지 — 12" },
        icon: { t: "slot", d: "글자 앞 아이콘" },
        children: { t: "slot", d: "탭 이름" },
      },
      css: { state: "`:hover` 가 면을 밝힌다" },
    },
    NavList: {
      설명: "@primer/react NavList · 세로 이동 목록. 설정 범주 트리가 이것이다",
      부품: ["NavList/Root", "NavList/Item", "NavList/Group"],
    },
    "NavList/Root": {
      설명: "@primer/react NavList · NavList.Root · 줄들을 세로로 쌓는 목록",
      props: {
        children: { t: "slot", d: "`.Item`·`.Group`·`.Divider`" },
      },
    },
    "NavList/Group": {
      가상: true,
      설명: "줄들을 묶는 머리말 있는 묶음",
      props: { title: { t: "string", d: "묶음 이름" }, children: { t: "slot", d: "`.Item` 들" } },
    },
    "NavList/Item": {
      설명: "@primer/react NavList.Item · 목록 한 줄. 지금 줄은 면이 밝다",
      props: {
        current: { t: "enum", n: "aria-current", d: "page | false. 지금 보고 있는 줄" },
        href: { t: "string", d: "갈 곳" },
        defaultOpen: { t: "boolean", d: "하위 목록을 펼친 채 연다" },
        children: { t: "slot", d: "줄 이름. `NavList.LeadingVisual` 도 여기 넣는다" },
      },
      css: { state: "`:hover`" },
    },
    DataTable: {
      설명: "@primer/react DataTable · 머리 줄과 본문 줄의 키가 다른 표. 단축키 표의 뼈대",
      부품: ["DataTable/Root", "DataTable/Row"],
    },
    "DataTable/Root": {
      설명: "@primer/react DataTable · DataTable.Root · 열 정의와 행 데이터로 표를 그린다",
      props: {
        columns: { t: "object", d: "열 정의 배열 — `[{ header, field, rowHeader }]`" },
        data: { t: "object", d: "행 데이터 배열" },
        cellPadding: { t: "enum", d: "condensed | normal | spacious" },
        gridTemplateColumns: { t: "string", d: '열 폭 — "auto 1fr auto"' },
      },
    },
    "DataTable/Row": {
      설명: "@primer/react DataTable · 표의 한 줄. 머리 줄은 더 얕고 굵다",
      props: {
        kind: { t: "enum", d: "header | body. 머리 줄인가 본문 줄인가" },
      },
      css: { state: "`:hover` 가 본문 줄만 밝힌다" },
    },

    // ── 01 Shared · 떠 있는 것과 알리는 것 ──────────────────────────────────
    Tooltip: {
      설명: "@primer/react Tooltip · 올리면 anchor 옆에 뜨는 짧은 말. 꼬리가 없다",
      props: {
        text: { t: "string", d: '띄울 말 — "닫기"' },
        direction: { t: "enum", d: "n | ne | e | se | s | sw | w | nw. 어느 쪽에 뜨나" },
        noDelay: { t: "boolean", d: "기다리지 않고 바로 띄운다" },
      },
    },
    Toast: {
      설명: "shared/component/Toast (예상 자리) · 스스로 알리고 사라진다. 앱을 막지 않는다",
      부품: ["Toast/Root", "Toast/Item"],
    },
    "Toast/Root": {
      설명: "shared/component/Toast (예상 자리) · Toast.Root · 화면 구석에 쌓는 자리. 새것이 아래에 붙는다",
      props: {
        children: { t: "slot", d: "`.Item` 들. 커널이 `INotifications` 를 걸러 넣는다" },
        placement: { t: "enum", d: "bottom-right | bottom-left. 기본 bottom-right" },
      },
    },
    "Toast/Item": {
      설명: "shared/component/Toast (예상 자리) · Toast.Item · 알림 하나. 색은 아이콘에만 싣는다",
      props: {
        severity: { t: "enum", d: "info | warning | error. `INotifications` 의 것과 같다" },
        message: { t: "string", d: "알릴 말. 한 줄을 넘으면 접지 않고 늘어난다" },
        action: { t: "slot", d: "아래 오른쪽 단추. 명령 id 로 가리킨다 — `MenuItem` 과 같은 꼴" },
        timeout: { t: "number", d: "밀리초. 주면 스스로 사라진다. 없으면 × 로만 닫힌다" },
        onDismiss: { t: "action", d: "× 를 누르거나 시간이 다 됐을 때" },
      },
      css: { state: "`:hover` 동안 사라지는 시계를 멈춘다" },
    },
    Dialog: {
      설명: "@primer/react Dialog · ConfirmationDialog · 앱을 막고 답을 받아 내는 창",
      부품: [
        "Dialog/Root",
        "Dialog/Header",
        "Dialog/Title",
        "Dialog/Subtitle",
        "Dialog/Body",
        "Dialog/Footer",
        "Dialog/Buttons",
        "ConfirmationDialog",
      ],
    },
    "Dialog/Root": {
      설명: "@primer/react Dialog · Dialog.Root · 화면을 덮고 가운데 창을 띄운다",
      props: {
        kind: {
          t: "enum",
          d: "Figma 축 — dialog | confirmation. confirmation 은 별개 컴포넌트 `ConfirmationDialog` 다(× 가 없고 400)",
        },
        tone: { t: "enum", d: "Figma 축 — default | danger. `ConfirmationDialog.confirmButtonType` 이다" },
        title: { t: "slot", d: "창 제목. `.Title` 의 줄임 — Primer 가 둘 다 받는다" },
        subtitle: { t: "slot", d: "제목 아래 한 줄. `.Subtitle` 의 줄임" },
        width: { t: "enum", d: "small | medium | large | xlarge" },
        position: { t: "enum", d: "center | left | right" },
        footerButtons: { t: "object", d: "아래 단추들 — `[{ content, buttonType, onClick }]`. `.Buttons` 의 줄임" },
        children: { t: "slot", d: "몸통" },
        onClose: { t: "action", d: "닫을 때. 무엇으로 닫았는지를 준다" },
      },
    },
    "Dialog/Header": { 가상: true, 설명: "머리 — 제목과 ×", props: { children: { t: "slot", d: "" } } },
    "Dialog/Title": { 가상: true, 설명: "제목 글", props: { children: { t: "slot", d: "" } } },
    "Dialog/Subtitle": { 가상: true, 설명: "제목 아래 흐린 한 줄", props: { children: { t: "slot", d: "" } } },
    "Dialog/Body": { 가상: true, 설명: "몸통. 넘치면 안에서 스크롤", props: { children: { t: "slot", d: "" } } },
    "Dialog/Footer": { 가상: true, 설명: "아래 단추 줄", props: { children: { t: "slot", d: "" } } },
    "Dialog/Buttons": {
      가상: true,
      설명: "단추들을 데이터로 그린다",
      props: { buttons: { t: "object", d: "`[{ content, buttonType, onClick }]`" } },
    },
    ConfirmationDialog: {
      가상: true,
      설명: "@primer/react ConfirmationDialog · 예/아니오 하나만 받는 창",
      props: {
        title: { t: "string", d: "" },
        confirmButtonType: { t: "enum", d: "default | danger" },
        confirmButtonContent: { t: "string", d: '기본 "OK"' },
        cancelButtonContent: { t: "string", d: '기본 "Cancel"' },
        children: { t: "slot", d: "물음 본문" },
        onClose: { t: "action", d: "confirm 인지 아닌지를 준다" },
      },
    },
    Banner: {
      설명: "@primer/react Banner · 화면 안에 흐르는 알림 띠. 오버레이가 아니다",
      부품: ["Banner/Root", "Banner/Title", "Banner/Description", "Banner/PrimaryAction", "Banner/SecondaryAction"],
    },
    "Banner/Root": {
      설명: "@primer/react Banner · Banner.Root · 아이콘 · 글 · 단추를 한 띠에 놓는다",
      props: {
        severity: {
          t: "enum",
          n: "variant",
          d: "info | warning | error | success. 코드는 error 를 critical 이라 부른다",
        },
        flush: { t: "boolean", d: "좁은 자리에 꽉 채운다 — 좌우 테두리와 모서리만 없앤다" },
        layout: { t: "enum", d: "default | compact. 우리 코드는 네 곳 다 compact" },
        title: { t: "slot", d: "굵은 첫 줄. `.Title` 의 줄임 — Primer 가 둘 다 받는다" },
        description: { t: "slot", d: "아래 흐린 설명. `.Description` 의 줄임" },
        action: { t: "slot", n: "primaryAction", d: "오른쪽 단추. `.PrimaryAction` 의 줄임" },
        onDismiss: { t: "action", d: "주면 오른쪽 위에 × 가 생긴다" },
      },
    },
    "Banner/Title": {
      가상: true,
      설명: "굵은 첫 줄. `title` prop 대신 이렇게도 짠다",
      props: { children: { t: "slot", d: "" } },
    },
    "Banner/Description": { 가상: true, 설명: "아래 설명", props: { children: { t: "slot", d: "" } } },
    "Banner/PrimaryAction": {
      가상: true,
      설명: "첫 단추",
      props: { children: { t: "slot", d: "" }, onClick: { t: "action", d: "" } },
    },
    "Banner/SecondaryAction": {
      가상: true,
      설명: "둘째 단추",
      props: { children: { t: "slot", d: "" }, onClick: { t: "action", d: "" } },
    },
    Blankslate: {
      설명: "@primer/react Blankslate · 아무것도 없을 때 무엇을 하면 되는지 알리는 자리",
      부품: [
        "Blankslate/Root",
        "Blankslate/Visual",
        "Blankslate/Heading",
        "Blankslate/Description",
        "Blankslate/PrimaryAction",
        "Blankslate/SecondaryAction",
      ],
    },
    "Blankslate/Root": {
      설명: "@primer/react Blankslate · Blankslate.Root · 부품들을 가운데 세로로 쌓는 자리",
      props: {
        size: { t: "enum", d: "Figma 축 — narrow | default | spacious. 코드에선 `narrow`·`spacious` 두 boolean 이다" },
        border: { t: "boolean", d: "둘레에 테두리를 그린다" },
        children: { t: "slot", d: "아래 부품들" },
      },
    },
    "Blankslate/Visual": { 가상: true, 설명: "맨 위 그림이나 아이콘", props: { children: { t: "slot", d: "" } } },
    "Blankslate/Heading": {
      가상: true,
      설명: "제목",
      props: { as: { t: "enum", d: "h2 | h3 | h4 | h5 | h6" }, children: { t: "slot", d: "" } },
    },
    "Blankslate/Description": { 가상: true, 설명: "설명 한두 줄", props: { children: { t: "slot", d: "" } } },
    "Blankslate/PrimaryAction": {
      가상: true,
      설명: "첫 단추",
      props: { href: { t: "string", d: "" }, children: { t: "slot", d: "" } },
    },
    "Blankslate/SecondaryAction": {
      가상: true,
      설명: "둘째 링크",
      props: { href: { t: "string", d: "" }, children: { t: "slot", d: "" } },
    },

    // ── 01 Shared · 메뉴와 고르기 ───────────────────────────────────────────
    // 컴파운드 시트의 머리말. 세트가 아니라 묶음이라 `apply()` 는 건너뛴다.
    Menu: {
      가상: true,
      설명: "shared/component/Menu · 눌러서 여는 할 일 목록",
      부품: ["Menu/Root", "Menu/Trigger", "Menu/Content", "Menu/Item", "Menu/Label", "Menu/Separator"],
    },
    "Menu/Root": {
      가상: true,
      설명: "shared/component/Menu · Menu.Root · 열림 상태를 쥔다. 그릴 것은 없다",
      props: {
        kind: { t: "enum", d: "dropdown | context. Content 의 최소 폭이 갈린다(180 | 220)" },
        open: { t: "boolean", d: "열려 있다. 제어할 때만 준다" },
        defaultOpen: { t: "boolean", d: "비제어일 때 처음 열림. 기본 false" },
        children: { t: "slot", d: "`.Trigger` + `.Content`" },
        onOpenChange: { t: "action", d: "열고 닫을 때" },
      },
    },
    "Menu/Trigger": {
      가상: true,
      설명: "누르면 메뉴가 열리는 것",
      props: {
        asChild: { t: "boolean", d: "자식을 그대로 트리거로 쓴다" },
        disabled: { t: "boolean", d: "" },
        children: { t: "slot", d: "" },
      },
    },
    Select: {
      가상: true,
      설명: "shared/component/Select · 값 하나를 고르는 목록",
      부품: ["Select/Root", "Select/Trigger", "Select/Content", "Select/Item"],
    },
    "Select/Root": {
      가상: true,
      설명: "shared/component/Select · Select.Root · 값과 열림 상태를 쥔다. 그릴 것은 없다",
      props: {
        value: { t: "string", d: "지금 값" },
        defaultValue: { t: "string", d: "비제어일 때 처음 값. `value` 와 짝" },
        open: { t: "boolean", d: "열려 있다. 제어할 때만 준다" },
        defaultOpen: { t: "boolean", d: "비제어일 때 처음 열림. 기본 false" },
        children: { t: "slot", d: "`.Trigger` + `.Content`" },
        onValueChange: { t: "action", d: "고를 때" },
        onOpenChange: { t: "action", d: "열고 닫을 때" },
      },
    },
    Tab: {
      가상: true,
      설명: "workbench/component/Tab · 편집 자리 한 벌 — 안에 `Split` 하나거나 `Group` 하나",
      부품: ["Tab/Root", "Tab/Header", "Tab/Actions", "Tab/Strip", "Tab/Panel", "Tab/Group", "Tab/Split"],
      /**
       * **네 겹이다.** 부품이 여섯이라 그냥 늘어놓으면 무엇이 무엇 안에 있는지가 안 보인다.
       * 시트의 부품 목록이 이 값을 「계층」 칸으로 세운다 — 루트가 L1 이다.
       */
      계층: {
        "Tab/Root": "L1",
        "Tab/Header": "L4",
        "Tab/Actions": "L4",
        "Tab/Strip": "L3",
        "Tab/Panel": "L3",
        "Tab/Group": "L2",
        "Tab/Split": "L2",
      },
    },
    "Tab/Root": {
      가상: true,
      설명: "workbench/component/Tab · Tab.Root · (L1) 갈래를 정한다. 제 DOM 이 없다",
      props: {
        tree: {
          t: "object",
          겹침: "`Split` 에 그대로 내려 준다",
          d: "주면 `Tab.Split`, 없으면 `Tab.Group` 이 선다. 갈래를 정하는 것이 이 하나다",
        },
        chrome: {
          t: "enum",
          겹침: "`Group` 에 그대로 내려 준다",
          d: "bordered | none. none 이면 테두리를 안 그린다. 기본 bordered",
        },
      },
    },

    "Menu/Content": {
      설명: "shared/component/Menu · Menu.Content · 할 일들이 뜨는 면",
      props: {
        kind: {
          t: "enum",
          겹침: "Figma 축이 여기 걸려 루트 prop 을 비춘다",
          d: "Figma 축 — dropdown 180 | context 220. 코드에선 `Menu` 루트의 prop 이다",
        },
        children: { t: "slot", d: "`.Item`·`.Label`·`.Separator`" },
      },
    },
    "Menu/Item": {
      설명: "shared/component/Menu · Menu.Item · 누르면 일이 일어나는 한 줄",
      props: {
        disabled: { t: "boolean", d: "고를 수 없게 한다" },
        shortcut: { t: "slot", d: "오른쪽 키캡 — `⌘K`" },
        onSelect: { t: "action", d: "고를 때. 표준 `onSelect` 를 가로챈다" },
        children: { t: "slot", d: "줄에 적히는 말" },
      },
      css: {
        state: "`:hover` 만 있다. Radix 가 붙이는 `[data-highlighted]` 를 CSS 가 안 받아 키보드 이동이 안 보인다",
      },
    },
    "Menu/Label": {
      설명: "shared/component/Menu · Menu.Label · 줄들을 묶는 작은 머리말",
      props: { children: { t: "slot", d: "묶음 이름" } },
    },
    "Menu/Separator": {
      설명: "shared/component/Menu · Menu.Separator · 줄 사이를 가르는 가는 선",
      props: {},
    },
    "Select/Trigger": {
      설명: "shared/component/Select · Select.Trigger · 값 고르기를 여는 단추. 지금 값이 적혀 있다",
      props: {
        open: {
          t: "boolean",
          겹침: "Figma 축이 여기 걸려 루트 prop 을 비춘다",
          d: "Figma 축 — 열려 있는 동안의 모양. 코드에선 `Select` 루트의 prop 이다",
        },
        disabled: { t: "boolean", d: "열 수 없게 한다" },
        visual: { t: "slot", d: "값 앞 아이콘" },
        value: {
          t: "string",
          겹침: "생략하면 루트의 값을 쓴다 — 덮어쓰기용",
          d: '적히는 지금 값 — "Claude Opus 5". 생략하면 루트가 든 값',
        },
      },
      css: { state: "`:hover`. 열리면 Radix 가 `[data-state=open]` 을 붙인다" },
    },
    "Select/Content": {
      설명: "shared/component/Select · Select.Content · 고를 수 있는 줄들을 담는 면",
      props: { children: { t: "slot", d: "`Select/Item` 들" } },
    },
    "Select/Item": {
      설명: "shared/component/Select · Select.Item · 값 한 줄. 고른 것엔 체크가 선다",
      props: {
        selected: { t: "boolean", d: "고른 줄. 생략하면 루트가 든 값과 같은지로 정한다" },
        disabled: { t: "boolean", d: "고를 수 없게 한다" },
        value: { t: "string", 겹침: "줄 제 값이다. 루트의 지금 값과 다른 것", d: "고르면 올라갈 값" },
        children: { t: "slot", d: "줄에 적히는 말" },
      },
      css: { state: "`:hover`" },
    },

    // ── 01 Shared · 글 ─────────────────────────────────────────────────────
    ModeToggle: {
      설명: "shared/component/ModeToggle · 두 값 사이를 오가는 아이콘 단추. 밝게/어둡게가 이것이다",
      props: {
        mode: { t: "string", n: "value", d: '지금 값 — "light" | "dark". 값은 쓰는 쪽이 정한다' },
        defaultValue: { t: "string", d: "비제어일 때 처음 값. 기본은 `values[0]`" },
        disabled: { t: "boolean", d: "돌릴 수 없게 한다" },
        values: { t: "object", d: '오갈 두 값 — `["light", "dark"]`. 고정 길이 둘' },
        labels: { t: "object", d: '값마다 읽어 줄 말 — `["밝게", "어둡게"]`' },
        children: { t: "slot", d: "값마다 그릴 것. 고정 길이 둘" },
        onValueChange: { t: "action", d: "돌릴 때" },
      },
      css: { state: "`:hover` `:active`. `@media (pointer: coarse)` 에서 터치 자리를 넓힌다" },
    },
    Markdown: {
      설명: "shared/component/Markdown · 마크다운을 우리 타이포로 그린다",
      props: {
        source: { t: "string", d: "마크다운 원문" },
      },
    },
    CodeBlock: {
      설명: "shared/component/CodeBlock · 줄 번호와 복사 단추가 있는 코드 덩어리",
      props: {
        // 셋만(사용자 결정 2026-09-18). `title`·`showFileName`·`hasContent`·`copyLabel`·`copiedLabel`·`copied` 는 뺐다.
        content: { t: "string", d: "코드 원문" },
        language: { t: "string", d: '말머리에 적히는 언어 — "typescript"' },
        fileName: { t: "string", d: '언어 옆 파일 이름 — "index.ts"' },
      },
      css: { token: "`[data-token=keyword|string|comment|number|function]` 이 색을 가른다" },
    },

    // ── 02 Workbench · 줄들 ────────────────────────────────────────────────
    Shell: {
      설명: "workbench/component/Shell · 위 부품을 다 품는 창 한 장",
      props: {
        colorMode: { t: "enum", d: "light | dark" },
        activityItems: { t: "object", d: "왼쪽 레일 항목들. 없으면 사이드바가 통째로 안 뜬다" },
        panelContent: { t: "slot", d: "사이드바 본문. 비면 레일만 남기고 48px 로 접힌다" },
        panelTitle: { t: "string", d: '사이드바 제목 — "탐색기"' },
        panelActions: { t: "slot", d: "사이드바 제목 줄 오른쪽. 없으면 `…` 단추가 안 생긴다" },
        brand: { t: "slot", d: "왼쪽 위 이름 자리" },
        actions: { t: "slot", d: "오른쪽 위 단추들" },
        overlays: { t: "slot", d: "위에 겹쳐 뜰 것 — 팔레트·토스트" },
        panelInlineActions: { t: "slot", d: "제목 줄 오른쪽. `panelActions` 와 달리 `…` 로 안 접힌다" },
        sidebarOpen: { t: "boolean", d: "사이드바가 열려 있다. `defaultSidebarOpen` 과 짝" },
        sidebarResizable: { t: "boolean", d: "경계를 끌 수 있게 한다" },
        sidebarMinWidth: { t: "string", d: '끌어 줄일 수 있는 바닥 — 기본 "240px". 천장은 480px 고정' },
        children: { t: "slot", d: "가운데 편집 자리" },
        onActivitySelect: { t: "action", d: "레일에서 고를 때" },
        onSidebarOpenChange: { t: "action", d: "사이드바를 여닫을 때" },
      },
    },
    TitleBar: {
      설명: "workbench/component/TitleBar (예상 자리) · 창 맨 위 35px. 왼쪽 이름 · 가운데 명령 칸 · 오른쪽 빌드·알림·테마",
      부품: ["TitleBar/Root", "CommandCenter"],
    },
    "TitleBar/Root": {
      설명: "workbench/component/TitleBar (예상 자리) · TitleBar.Root · 왼쪽 · 가운데 · 오른쪽 세 자리를 낸다",
      props: {
        brand: { t: "slot", d: "왼쪽 — 마크 20×20 과 작업 공간 이름" },
        center: { t: "slot", d: "가운데 — `CommandCenter`. 누르면 팔레트가 열린다" },
        actions: {
          t: "slot",
          d: "오른쪽 — 빌드 표시 · 알림 종 · `ModeToggle` 셋뿐이다. 빌드는 `2026-09-20 11:18(a1b2c3d)` 꼴",
        },
      },
    },
    CommandCenter: {
      설명: "workbench/component/CommandCenter (예상 자리) · 제목 줄 가운데 칸. 누르면 팔레트가 열린다",
      props: {
        value: { t: "string", d: "적힌 말 — 보통 프로젝트 이름" },
        onClick: { t: "action", d: "누르면 `CommandPalette` 를 연다" },
      },
      css: { state: "`:hover` 가 면을 밝힌다" },
    },
    ActivityBar: {
      설명: "workbench/component/ActivityBar · 왼쪽 48px 레일. 위 묶음과 아래 묶음이 별개다",
      부품: ["ActivityBar/Root", "ActivityBar/Item", "ActivityBar/Top", "ActivityBar/Bottom"],
    },
    "ActivityBar/Root": {
      설명: "workbench/component/ActivityBar · ActivityBar.Root · 레일. `.Top` 과 `.Bottom` 사이를 빈 칸이 민다",
      props: {
        children: { t: "slot", d: "`.Top` + `.Bottom`. 사이는 늘어나는 빈 칸이 민다" },
      },
    },
    "ActivityBar/Top": {
      설명: "workbench/component/ActivityBar · 위 묶음 — 기능들. 넘치면 여기만 스크롤된다",
      props: {
        items: { t: "object", d: "기능들 — `[{ id, iconId, label }]`" },
        activeId: { t: "string", d: '지금 자리 — "explorer". **활성은 위 묶음만 든다**' },
        renderItemContextMenu: { t: "slot", n: "renderItemMenu", d: "주면 우클릭 메뉴가 생긴다" },
        onSelect: { t: "action", d: "고를 때. 표준 `onSelect` 를 가로챈다" },
      },
    },
    "ActivityBar/Bottom": {
      설명: "workbench/component/ActivityBar · 아래 묶음 — 계정·설정. 위가 넘쳐도 밀리지 않는다",
      props: {
        items: { t: "object", d: "계정·설정" },
        onSelect: { t: "action", d: "고를 때" },
      },
      css: { state: "**활성이 없다** — 사이드바가 아니라서 「지금 여기」가 없다" },
    },
    "ActivityBar/Item": {
      설명: "workbench/component/ActivityBar · 레일의 아이콘 한 칸 48×48",
      props: {
        active: { t: "boolean", d: "지금 자리. 왼쪽에 밝은 막대가 선다" },
        badge: { t: "slot", d: "오른쪽 위 숫자 알약" },
        iconId: { t: "enum", d: "`data/icons.json` 의 키" },
        label: { t: "string", d: '읽어 줄 말 — "탐색기"' },
      },
      css: { state: "`:hover` `:active` `:focus-visible`" },
    },
    // `Panel` 이라 부르던 것이다 — 실은 사이드바만 맡는다. 아래 창은 `Bottom` 이 따로다(2026-09-20 사용자 정정).
    Sidebar: {
      설명: "workbench/component/Sidebar (지금 코드는 Panel) · 레일 오른쪽 사이드바. 머리와 내용 둘뿐인 그릇",
      부품: ["Sidebar/Root", "Sidebar/Header"],
    },
    "Sidebar/Root": {
      설명: "workbench/component/Sidebar (지금 코드는 Panel) · Sidebar.Root · 머리와 내용을 세로로 쌓는 그릇",
      props: {
        // `title`·`actions` 는 `Sidebar/Header` 의 것이다 — 루트가 되풀이하지 않는다.
        density: { t: "enum", d: "comfortable | compact. compact 면 머리가 얕고 제목이 대문자가 된다" },
        header: { t: "slot", n: "children", d: "`.Header` + 내용. Figma 에선 머리를 INSTANCE_SWAP 으로 갈아 끼운다" },
      },
    },
    "Sidebar/Header": {
      설명: "workbench/component/Sidebar (지금 코드는 Panel) · Sidebar.Header · 제목과 오른쪽 동작. 둘 다 없으면 안 선다",
      props: {
        title: { t: "slot", d: "왼쪽. 아이콘을 섞을 수 있어 글자가 아니다" },
        actions: { t: "slot", d: "오른쪽 아이콘들" },
      },
    },
    Bottom: {
      설명: "workbench/component/Bottom (예상 자리) · 편집 자리 아래 창. 확장의 `BottomDescriptor` 가 탭 하나씩 꽂힌다 — 터미널이 여기다",
      부품: ["Bottom/Root", "Bottom/Header", "Bottom/Panel"],
    },
    "Bottom/Root": {
      설명: "workbench/component/Bottom (예상 자리) · Bottom.Root · 머리와 본문을 세로로 쌓는 독",
      props: { children: { t: "slot", d: "`.Header` + `.Panel`" } },
    },
    "Bottom/Header": {
      설명: "workbench/component/Bottom (예상 자리) · Bottom.Header · 아래 창들의 탭 줄(`UnderlineNav`)과 오른쪽 동작",
      props: {
        tabs: { t: "object", d: "`BottomRow[]` — `[{ id, title, iconId, isActive }]`" },
        actions: { t: "slot", d: "오른쪽 — 더하기 · 키우기 · 넘침 · 닫기" },
        onSelect: { t: "action", d: "탭을 고를 때. 같은 것을 다시 고르면 닫힌다" },
      },
    },
    "Bottom/Panel": {
      설명: "workbench/component/Bottom (예상 자리) · Bottom.Panel · 고른 아래 창의 `Content` 가 서는 자리",
      props: { children: { t: "slot", d: "고른 `BottomDescriptor.Content`" } },
    },
    "Tab/Panel": {
      설명: "workbench/component/Tab · (L3) 고른 탭의 본문이 서는 자리. 확장의 편집기가 여기 꽂힌다. 띠보다 어둡다(`bgColor/inset`) — 활성 탭만 같은 색으로 본문에 붙는다",
      props: {
        children: { t: "slot", d: "고른 탭의 내용. 코드에선 `Container` 가 감싼 `role=tabpanel` 이다" },
        emptyMessage: { t: "slot", d: '고른 탭이 없을 때 — 기본 "No selected tab"' },
      },
    },
    "Tab/Strip": {
      설명: "workbench/component/Tab · Tab.Strip · (L3) `Header` 여럿과 오른쪽 `Actions` 로 된 띠 한 겹. `Header` 높이만큼만 선다",
      props: {
        tabItems: { t: "object", d: "탭들 — `[{ id, title, iconId, isDirty, isPreview }]`" },
        activeTab: { t: "string", d: "지금 탭의 id" },
        stripEmptyLabel: { t: "slot", d: '탭이 없을 때의 말 — 기본 "No open tabs"' },
        renderTabContextMenu: { t: "slot", d: "주면 탭마다 우클릭 메뉴가 생긴다" },
        overlay: { t: "slot", d: "띠 오른쪽 끝에 얹을 것 — `Tab/Actions`" },
        onTabClick: { t: "action", d: "탭을 누를 때" },
        onMenuClick: { t: "action", d: "필수. 오른쪽 넘침 단추를 누를 때" },
        onTabClose: { t: "action", d: "주면 닫기 × 가 생긴다" },
        onTabReorder: { t: "action", d: "주면 끌어 옮기기가 켜진다" },
        onTabPin: { t: "action", d: "주면 미리보기 탭을 더블클릭해 고정할 수 있다" },
      },
    },
    "Tab/Header": {
      설명: "workbench/component/Tab · Tab.Header · (L4) 탭 하나. 아이콘 · 이름 · 닫기",
      props: {
        active: { t: "boolean", n: "isActive", d: "지금 보는 탭. 닫기 단추가 자리를 차지한다" },
        dirty: { t: "boolean", n: "isDirty", d: "안 저장됨. 닫기 자리에 점이 뜬다" },
        preview: { t: "boolean", n: "isPreview", d: "미리보기. 이름이 기울어진다" },
        title: { t: "string", d: '탭 이름 — "ThemeModel.ts"' },
        iconId: { t: "enum", d: "파일 종류 아이콘" },
        icon: { t: "slot", d: "주면 `iconId` 를 덮어쓴다" },
        onClose: { t: "action", d: "닫기를 누를 때" },
      },
      css: { state: "`:hover` 가 비활성 탭의 이름을 밝힌다" },
    },
    "Tab/Group": {
      설명: "workbench/component/Tab · Tab.Group · (L2) `Strip` 하나 + `Panel` 하나. 편집 자리 한 칸",
      props: {
        tabItems: { t: "object", d: "탭들 — `[{ id, title, iconId, isDirty, isPreview, content }]`" },
        activeTab: { t: "string", d: "지금 탭의 id. `defaultActiveTab` 과 짝" },
        renderPanel: { t: "slot", d: "탭마다 아래에 그릴 것. 없으면 `content` 를 그린다" },
        emptyMessage: { t: "slot", d: '고른 탭이 없을 때 — 기본 "No selected tab"' },
        chrome: { t: "enum", d: "bordered | none. 기본 bordered" },
        onTabClick: { t: "action", d: "탭을 누를 때" },
        onMenuClick: { t: "action", d: "필수. 오른쪽 넘침 단추를 누를 때" },
        onTabClose: { t: "action", d: "주면 닫기 × 가 생긴다" },
      },
    },
    "Tab/Split": {
      설명: "workbench/component/Tab · Tab.Split · (L2) `Group` 둘 이상을 `Sash` 로 가른다",
      props: {
        tree: { t: "object", d: "가름을 담은 재귀 트리 — leaf 이거나 split 이다" },
        activeLeaf: { t: "string", d: "지금 자리의 id. 그 그룹의 탭만 밝다" },
        onTabMove: { t: "action", d: "탭을 다른 그룹으로 떨어뜨릴 때" },
        onTabSplit: { t: "action", d: "탭을 가장자리에 떨어뜨려 가를 때" },
        onNodeResize: { t: "action", d: "경계를 끌 때" },
      },
    },
    "Tab/Actions": {
      설명: "workbench/component/Tab · (L4) 띠 오른쪽 끝. 넘침 `…` 단추 하나뿐이다",
      props: { actions: { t: "slot", d: "넘침 `…` `IconButton` 하나. 더 놓지 않는다(2026-09-20 사용자 결정)" } },
    },
    Sash: {
      설명: "workbench/component/Sash (예상 자리) · 구역 사이의 끌 수 있는 경계",
      props: {
        orientation: { t: "enum", d: "vertical | horizontal" },
        onResize: { t: "action", d: "끌 때" },
      },
      css: {
        state:
          "평소엔 1px 줄. `:hover` 에 얇고 둥근 손잡이(4×48)가 가운데 뜬다. `:active` 동안 손잡이가 accent. `:focus-visible` 은 손잡이 accent + 고리",
      },
    },
    CommandPalette: {
      설명: "workbench/component/CommandPalette · 가운데 뜨는 명령 찾기. 파일 찾기도 같은 위젯이다",
      부품: ["CommandPalette/Root", "CommandPalette/Item"],
    },
    "CommandPalette/Root": {
      설명: "workbench/component/CommandPalette · CommandPalette.Root · 입력칸과 결과 줄들을 담는 창",
      props: {
        mode: { t: "enum", d: "Figma 축 — command `>` | quickOpen 파일 | empty. 코드는 `items` 로만 갈린다" },
        items: { t: "object", d: "결과들 — `[{ id, label, shortcut }]`" },
        open: { t: "boolean", d: "열려 있다. `defaultOpen` 과 짝" },
        defaultOpen: { t: "boolean", d: "비제어일 때 처음 열림. 기본 false" },
        placeholder: { t: "string", d: '흐린 안내 — 기본 "커맨드 검색..."' },
        emptyMessage: { t: "slot", d: '결과가 없을 때 — 기본 "결과가 없다."' },
        onSelect: { t: "action", d: "필수. 고를 때" },
        onOpenChange: { t: "action", d: "여닫을 때" },
      },
    },
    "CommandPalette/Item": {
      설명: "workbench/component/CommandPalette · 결과 한 줄",
      props: {
        shortcut: { t: "object", d: '오른쪽 키캡들 — `["⌘", "K"]`. 비면 묶음이 안 그려진다' },
        label: { t: "string", d: "명령 이름" },
      },
      // 짚인 줄은 cmdk 가 정한다 — 소비자가 넘기는 값이 아니라 CSS-State 다.
      css: { selected: "`[cmdk-item][data-selected=true]` 를 cmdk 가 붙인다. 마우스와 키보드 둘 다 이것을 움직인다" },
    },
    // 알림도 확장처럼 꽂힌다 — **탭 하나**다(2026-09-20 사용자 결정). 제목 줄의 종이 트리거라
    // 레일에는 칸을 두지 않는다. 설정은 톱니가 레일 아래에, 알림은 종이 제목 줄에 있다.
    Notifications: {
      설명: "workbench/view/NotificationsTabView (예상 자리) · 쌓인 알림을 열어 보는 탭. 제목 줄의 종이 연다",
      부품: ["Notifications/Root", "Notifications/TabHeader", "Notifications/TabPanel", "Notifications/Row"],
    },
    "Notifications/Root": {
      가상: true,
      설명: "workbench/view/NotificationsTabView (예상 자리) · 커널이 신고하는 것. 그릴 것은 없다",
      props: {
        uri: { t: "string", d: "`arka:notifications`. 탭이 이 좌표로 열린다" },
        title: { t: "string", d: '"알림". 탭 이름과 종의 툴팁' },
        iconId: { t: "enum", d: "bell. 종과 탭 머리가 같은 글리프를 쓴다" },
      },
    },
    "Notifications/TabHeader": {
      설명: "workbench/view/NotificationsTabView (예상 자리) · Notifications.TabHeader · 탭 머리. 종과 「알림」",
      props: {},
    },
    "Notifications/TabPanel": {
      설명: "workbench/view/NotificationsTabView (예상 자리) · Notifications.TabPanel · 줄들과 도구 줄. 비면 `Blankslate` 가 선다",
      props: {
        state: { t: "enum", d: "Figma 축 — list | empty. 코드는 `items` 로만 갈린다" },
        items: { t: "object", d: "알림들 — `[{ id, severity, message, at, isRead }]`" },
        unreadCount: { t: "number", d: "안 읽은 수. 종의 배지와 같은 값이다" },
        onMarkAllRead: { t: "action", d: "「모두 읽음」. 탭을 열 때도 이것이 돈다" },
        onClearAll: { t: "action", d: "「모두 지우기」" },
        onDismiss: { t: "action", d: "줄 하나를 지울 때" },
      },
    },
    "Notifications/Row": {
      설명: "workbench/view/NotificationsTabView (예상 자리) · Notifications.Row · 알림 한 줄. 심각도 · 말 · 시각 · 동작",
      props: {
        severity: { t: "enum", d: "info | warning | error. 색은 아이콘에만 싣는다" },
        read: { t: "boolean", n: "isRead", d: "읽었나. 안 읽은 것은 면이 밝고 앞에 점이 선다" },
        message: { t: "string", d: "알릴 말" },
        at: { t: "number", d: "온 때. 줄에는 「3분 전」으로 적는다" },
        action: { t: "slot", d: "오른쪽 단추. 명령 id 로 가리킨다" },
        onDismiss: { t: "action", d: "× 를 누를 때" },
      },
      css: { state: "`:hover` 가 면을 밝힌다" },
    },
    // 설정은 확장이다 — 세 자리(레일 아래 묶음의 칸 · 탭 머리 · 탭 본문)가 각각 별개의 UI 라 부품도 각각이다
    // (2026-09-20 사용자 결정).
    Settings: {
      설명: "extensions/settings (예상 자리) · 설정 확장. 레일 아래 묶음의 칸 · 탭 머리 · 탭 본문 세 자리에 꽂힌다",
      부품: [
        "Settings/Root",
        "Settings/ActivityItem",
        "Settings/TabHeader",
        "Settings/TabPanel",
        "Settings/Row",
        "Settings/Keybinding",
      ],
    },
    "Settings/Root": {
      가상: true,
      설명: "extensions/settings (예상 자리) · 확장이 신고하는 것. 그릴 것은 없다",
      props: {
        uri: { t: "string", d: "`arka:settings`. 탭이 이 좌표로 열린다(`TabProviderDescriptor`)" },
        title: { t: "string", d: '"설정". 레일 칸의 툴팁과 탭 이름' },
        iconId: { t: "enum", d: "settingsGear. 레일 칸과 탭 머리가 같은 글리프를 쓴다" },
      },
    },
    "Settings/ActivityItem": {
      설명: "extensions/settings (예상 자리) · Settings.ActivityItem · 레일 아래 묶음의 칸. `ActivityBar/Item` 에 톱니를 꽂은 것",
      props: {},
    },
    "Settings/TabHeader": {
      설명: "extensions/settings (예상 자리) · Settings.TabHeader · 탭 머리. `Tab/Header` 에 톱니와 「설정」",
      props: {},
    },
    "Settings/TabPanel": {
      설명: "workbench/view/SettingsTabView · Settings.TabPanel · 탭 본문. 맨 위 찾기 칸과 범주별 줄들",
      props: {
        sections: {
          t: "object",
          d: "범주와 줄들 — `[{ title, rows }]`. **단축키도 한 범주다** — 제 그릇을 갖지 않는다",
        },
        query: {
          t: "string",
          d: "찾을 말. **화면에 하나뿐이다** — 범주마다 제 검색창을 두면 같은 일을 두 곳에서 한다",
        },
        recordingId: {
          t: "string",
          d: "지금 재지정 중인 단축키 줄의 id. **한 번에 하나다** — 줄이 아니라 여기가 드는 까닭이다",
        },
        onChange: { t: "action", d: "줄에서 값을 바꿀 때" },
        onQueryChange: { t: "action", d: "찾을 말이 바뀔 때" },
        onRecordingChange: { t: "action", d: "재지정을 열고 닫을 때. `null` 이면 닫는다" },
        onRebind: { t: "action", d: "새 조합을 받았을 때 — `(id, keys)`" },
      },
    },
    "Settings/Keybinding": {
      설명: "workbench/view/SettingsTabView · Settings.Keybinding · 단축키 한 줄. 설정 줄과 같은 기하다 — 왼쪽 이름, 오른쪽 컨트롤",
      props: {
        label: { t: "string", d: '명령 이름 — "파일 찾기"' },
        commandId: { t: "string", d: '아래 흐린 줄 — "workbench.action.quickOpen"' },
        keys: { t: "object", d: '키캡들 — `["Ctrl", "Shift", "P"]`. 비면 「없음」이 선다' },
        recording: { t: "boolean", d: "재지정 중. 오른쪽이 키를 기다리는 칸이 된다. 값은 `Keybindings` 가 쥔다" },
        onRecordingChange: { t: "action", d: "연필을 누르거나 취소할 때" },
        onRebind: { t: "action", d: "새 조합을 받았을 때" },
      },
      css: { state: "`:hover` 가 면을 밝히고 **연필을 띄운다** — 평소엔 없다. `:focus-visible` 도 같다" },
    },
    "Settings/Row": {
      설명: "workbench/view/SettingsTabView · Settings.Row · 설정 한 줄. 이름·설명 왼쪽, 컨트롤 오른쪽",
      props: {
        label: { t: "string", d: '설정 이름 — "테마"' },
        description: { t: "string", d: "아래 흐린 한 줄. 없으면 안 그린다" },
        control: { t: "slot", d: "오른쪽 컨트롤 — `ModeToggle`·`ToggleSwitch`·`TextInput` 무엇이든" },
        onChange: { t: "action", 겹침: "줄 하나의 것. 루트는 모든 줄의 것을 모은다", d: "값을 바꿀 때" },
      },
    },

    // ── 03~09 · 기능 페이지 (아직 훑기 전이라 얇다) ─────────────────────────
    FileIcon: {
      설명: "extensions/filesystem/component/FileIcon · 확장자로 고르는 파일 아이콘",
      props: {
        size: { t: "enum", d: "sm | md | lg" },
        fileName: { t: "string", d: '확장자를 뽑을 이름 — "index.ts"' },
      },
    },
    FileTreeRow: {
      설명: "extensions/filesystem/component/FileTree · 트리 한 줄. 깊이만큼 들여쓴다",
      props: {
        type: { t: "enum", d: "folder | file" },
        expanded: { t: "boolean", d: "폴더가 펼쳐져 있다" },
        name: { t: "string", d: "파일·폴더 이름" },
        depth: { t: "number", d: "들여쓰기 깊이 — 0 | 1 | 2" },
      },
      css: { state: "`:hover` `[aria-selected]` `:focus-visible`, 끌어 온 것이 위에 있으면 drop" },
    },
    TextEditor: {
      설명: "extensions/filesystem/component/TextEditor · CodeMirror 를 감싼 편집 자리",
      props: {
        chrome: { t: "enum", d: "bordered | none" },
        mode: { t: "enum", n: "readOnly", d: "readOnly | editable" },
        value: { t: "string", d: "글 원문" },
        onChange: { t: "action", d: "고칠 때" },
      },
    },
  };

  const 이름 = (k, p) => p.n ?? k;

  /**
   * 페이지의 시트 묶음. `layout()` 이 읽어 오토레이아웃 프레임으로 쌓는다.
   *
   * **묶음 이름은 영어다** — 레이어 이름이 되고 목차 표의 「묶음」 칸에도 같은 말이 선다.
   * 보이는 글은 한글이지만 이것은 이름이라 식별자 쪽이다.
   */
  const 묶음 = {
    "01 Shared": [
      ["Typography", ["Text", "Kbd", "Link", "Markdown", "CodeBlock"]],
      ["Actions", ["Button", "IconButton", "ButtonGroup", "SegmentedControl", "ModeToggle"]],
      ["Forms", ["TextInput", "Textarea", "Checkbox", "Radio", "ToggleSwitch", "FormControl"]],
      ["Navigation", ["NavList", "UnderlineNav"]],
      ["Display", ["Icon", "Label", "CounterLabel", "Avatar", "DataTable"]],
      ["Feedback", ["Banner", "Blankslate", "Spinner", "ProgressBar"]],
      ["Overlays", ["Menu", "Select", "Dialog", "Tooltip", "Toast"]],
      ["Layout", ["Container"]],
    ],
    // VS Code 의 창 구역 이름을 따른다 — 어디에 무엇이 있는지가 곧 이름이 되게.
    // **차례는 작은 것부터다** — 원자에서 시작해 구역을 거쳐 창 한 장으로 끝난다.
    "02 Workbench": [
      ["Activity Bar", ["ActivityBar"]],
      ["Sidebar", ["Sidebar"]],
      ["Editor", ["Tab"]],
      ["Bottom", ["Bottom"]],
      ["Overlays", ["CommandPalette"]],
      ["Extension", ["Notifications", "Settings"]],
      ["Window", ["Sash", "TitleBar", "Shell"]],
    ],
  };

  /** `묶음` 을 편 차례표 — `이름 → { 페이지, 묶음, 번호 }`. 한 번만 만든다. */
  const 자리표 = (() => {
    const 표 = {};
    for (const [페이지, 묶음들] of Object.entries(묶음)) {
      let n = 0;
      const 총 = 묶음들.reduce((a, [, 이름들]) => a + 이름들.length, 0);
      for (const [묶음이름, 이름들] of 묶음들) {
        for (const 이름 of 이름들) 표[이름] = { 페이지, 묶음: 묶음이름, 번호: (n += 1), 총 };
      }
    }
    return 표;
  })();

  return {
    M,
    묶음,
    /**
     * 시트가 페이지 몇 번째인가 — `{ 페이지, 묶음, 번호, 총 }`. `묶음` 에 없으면 `null`.
     *
     * **이 번호가 곧 시트 제목의 `N` 이다**(`28. Menu`). 절은 `N.1`·`N.2`, 항은 `N.2.1` 로
     * 이어진다 — 차례와 본문이 글자로 맞물리게 하는 것이 번호를 두는 까닭이다.
     */
    자리(setName) {
      return 자리표[setName] ?? null;
    },
    /** 세트 하나의 `{ 설명, props, css }`. 없으면 `null`. */
    of(setName) {
      return M[setName] ?? null;
    },
    /** 축·속성 하나의 갈래 낱말. `props` 에 없으면 `null` — 시트는 아무것도 안 적는다. */
    kind(setName, key) {
      return M[setName]?.props?.[key]?.t ?? null;
    },
    /** 그 키가 CSS-State 인가. */
    isCss(setName, key) {
      return Boolean(M[setName]?.css?.[key]);
    },
    /** 표에 실을 줄들 — `[{ name, type, desc }]`. 정의 순서를 지킨다. */
    rows(setName) {
      const e = M[setName];
      if (!e) return [];
      return Object.entries(e.props ?? {}).map(([k, p]) => ({ name: 이름(k, p), type: p.t, desc: p.d }));
    },

    /** 표의 `설명` 을 각 세트의 Figma description 에 써 넣는다. */
    async apply() {
      await figma.loadAllPagesAsync();
      // **이름 색인을 한 번만 만든다.** 이름마다 `findOne` 을 돌리면 열 페이지를 82번 훑어
      // 30초를 넘긴다(2026-09-17 에 그렇게 두 번 끊겼다).
      const byName = new Map();
      for (const p of figma.root.children) {
        for (const n of p.findAll(
          (x) => x.type === "COMPONENT_SET" || (x.type === "COMPONENT" && x.parent?.type !== "COMPONENT_SET"),
        )) {
          if (!byName.has(n.name)) byName.set(n.name, n);
        }
      }
      const 씀 = [],
        못찾음 = [];
      for (const [name, e] of Object.entries(M)) {
        if (e.가상 || e.부품) continue; // Figma 노드가 없는 항목 · 컴파운드 머리(노드는 `X/Root` 가 든다)
        const node = byName.get(name);
        if (!node) {
          못찾음.push(name);
          continue;
        }
        node.description = e.설명;
        씀.push(name);
      }
      return { 씀: 씀.length, 못찾음 };
    },

    /**
     * 표에 **빠진 축·속성**을 센다. 파일에 있는데 여기 없으면 시트가 그 줄을 안 그린다 —
     * 조용히 사라지지 않게 여기서 잡는다.
     *
     * 컴파운드 규칙도 여기서 센다 — `루트없는컴파운드`(머리에 `props` 가 있거나 `부품` 첫 줄이
     * `X/Root` 가 아니다) · `루트에겹친prop`(루트와 부품이 같은 키를 든다. `children` 은 뺀다).
     */
    async audit() {
      await figma.loadAllPagesAsync();
      const 빠짐 = [],
        세트없음 = [],
        루트없는컴파운드 = [],
        루트에겹친prop = [];
      for (const [name, e] of Object.entries(M)) {
        if (!e.부품) continue;
        const root = `${name}/Root`;
        if (e.props || e.부품[0] !== root || !M[root]) 루트없는컴파운드.push(name);
        const rootProps = M[root]?.props ?? {};
        // `X/` 로 시작하지 않는 부품은 형제 컴포넌트다(`ConfirmationDialog`·`CommandCenter`) — 안 잰다.
        for (const part of e.부품.slice(1).filter((p) => p.startsWith(`${name}/`))) {
          for (const [k, p] of Object.entries(M[part]?.props ?? {})) {
            if (k === "children" || !rootProps[k] || p.겹침 || rootProps[k].겹침) continue;
            루트에겹친prop.push(`${root}.${k} = ${part}.${k}`);
          }
        }
      }
      for (const p of figma.root.children) {
        for (const n of p.findAll(
          (x) => x.type === "COMPONENT_SET" || (x.type === "COMPONENT" && x.parent?.type !== "COMPONENT_SET"),
        )) {
          if (/^Icon\//.test(n.name)) continue; // Foundation 의 글리프는 표 밖이다
          const defs = n.componentPropertyDefinitions ?? {};
          const keys = Object.keys(defs).map((k) => k.split("#")[0]);
          const e = M[n.name];
          if (!e) {
            if (keys.length) 세트없음.push(n.name);
            continue;
          }
          for (const k of keys) {
            if (!e.props?.[k] && !e.css?.[k]) 빠짐.push(`${n.name}.${k}`);
          }
        }
      }
      return {
        표에없는키: 빠짐,
        표에없는세트: 세트없음,
        루트없는컴파운드,
        루트에겹친prop,
        표: Object.keys(M).length,
      };
    },
  };
})();
