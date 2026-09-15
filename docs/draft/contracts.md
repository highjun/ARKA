# v1.0 커널 계약과 화면 — 판정 초안

**이 폴더는 초안이다.** 판정은 사용자가 한다. 승인되기 전까지 `packages/*/src/`·ADR·`CONVENTIONS.md`는 건드리지 않는다. 승인된 뒤 계약 PR이 열리고 이 파일은 지운다.

무엇이 커널인지는 [concept.md](../concept.md)의 `#### v1.0`이 정했다 — **커널은 "확장이 꽂힐 자리"를 가진 것이고 나머지는 전부 확장이다.**

## 읽는 법

아래 계약 대부분은 이미 `packages/client/src/`에 있다. 그런데 그것들은 **컨셉이 서기 전에** 쓰였다. "있으니 그대로"로 넘기지 않고 하나씩 다시 판정한다.

항목마다 네 줄이다.

- **지금** — 현재 시그니처. 없으면 `없다`
- **컨셉** — `concept.md`가 이 자리에 요구하는 것
- **의심** — 둘이 어긋나 보이는 지점. 없으면 `없다`
- **판정** — 빈칸. 사용자가 채운다

판정 어휘는 넷이다.

- `그대로` — 지금 모양 그대로 간다
- `고침` — 축·이름·범위를 바꾼다. 무엇을 왜 바꾸는지 함께 적는다
- `버림` — 커널에서 뺀다. 확장으로 내리거나 아예 없앤다
- `새로` — 지금 없다. 만든다

---

## 1. 컨셉과 어긋난 자리 아홉

빈자리를 채우는 것보다 이쪽이 크다. 아래 각각은 2절 이후에서 해당 계약과 함께 다시 나온다.

- **① 커널이 파일을 안다** — `SidebarSlotProps`가 파일 콜백 셋을 들어 사이드바에 기여하는 **모든** 확장에게 내민다
- **② 파일 → 탭 종류 판정이 없다** — `FILE_TAB_KIND`가 조립부 로컬 상수이고 export도 안 된다
- **③ `kind`가 그냥 문자열이다** — 확장의 상수와 조립부가 문자열로만 이어진다
- **④ 탭 상태가 `localStorage`다** — 컨셉은 "서버가 적는다"
- **⑤ 설정 스키마가 두 칸 고정이다** — 컨셉은 "확장이 기여한다". 그 두 칸 중 하나가 v1.0에 없는 에이전트의 것이다
- **⑥ 확장↔셸 교차가 조립부 클로저다** — `IPinTab`·`ITabDirtyState`
- **⑦ 같은 Registry 계약이 네 번 복붙돼 있다** — 린트 규칙 하나 때문이다
- **⑧ 명령 계약에 별칭 겹이 하나 더 있다** — 이유가 설계가 아니라 린트다
- **⑨ 이벤트 버스가 없다** — 컨셉은 커널에 적었는데 실제로는 Model마다 `Emitter` 하나다

그 밖에 **컨셉이 `URI`로 가리키라고 했는데 코드는 전부 `string`**이고, 안 쓰는 `URI` 클래스가 `contracts`에 놓여 있다(→ 7-1).

---

## 2. 지지대 — 확장이 꽂히는 장치 자체

### 2-1. 기여 지점 일반화

- **지금**

  ```ts
  export interface Descriptor {
    readonly id: string;
  }

  export type DescriptorMatch<TDescriptor> = {
    readonly descriptor: TDescriptor;
    readonly params: Readonly<Record<string, string>>;
  };

  export interface Registry<TDescriptor extends Descriptor> {
    add(descriptor: TDescriptor): void;
    get(id: string): TDescriptor;
    tryGet(id: string): TDescriptor | undefined;
    list(): TDescriptor[];
    match(id: string): DescriptorMatch<TDescriptor>[];
  }
  ```

  id에 `:`나 `*`가 있으면 등록 시점에 `path-to-regexp`로 컴파일하고 `match`가 자리표시자 값을 함께 준다. 중복 id는 던진다.

- **컨셉** — "확장이 꽂힐 자리"의 바탕
- **의심** — **`match`의 패턴 기능을 지금 아무도 안 쓴다.** 쓸 자리가 생길 곳도 v1.0 목록에 없다. 안 쓰는 기능이 계약에 있으면 구현마다 따라온다
- **판정** —

### 2-2. 같은 Registry 계약이 네 번 복붙돼 있다 (⑦)

- **지금** — `ITabContentRegistry`·`IActivityBarRegistry`·`ISidebarContentRegistry`·`IWorkbenchStartupRegistry` 넷이 위 다섯 메서드를 **글자 그대로 옮겨 적는다.** `interface X extends Registry<D> {}`가 `@typescript-eslint/no-empty-object-type`에 걸려서다
- **컨셉** — 기여 지점은 하나의 장치여야 한다. 지점이 늘 때마다 계약이 복제되면 장치가 아니다
- **의심** — **린트 규칙 하나 때문에 계약이 넷으로 갈렸다.** 길이 셋이다
  - `type X = Registry<D>` 별칭으로 — 인터페이스가 아니어도 되는지가 물음
  - 그 자리만 `eslint-disable`에 사유를 적는다
  - 지금처럼 복붙을 유지하고 규칙을 지킨다
- **판정** —

### 2-3. DI

- **지금**

  ```ts
  /** phantom 타입 — `description`이 아니라 **참조**로 비교된다. */
  export interface Token<T> {
    readonly description: string;
    readonly [TOKEN_TYPE]: T;
  }

  export interface Disposable {
    /** 동기다 — `Promise<void>`가 아니다. */
    dispose(): void;
  }

  export type Lifetime = "singleton" | "scoped" | "transient";

  export interface Provider<T> {
    readonly lifetime: Lifetime;
    create(container: Container): T;
  }

  export interface Container {
    register<T>(token: Token<T>, provider: Provider<T>): void;
    resolve<T>(token: Token<T>): T;
    createScope(name: string): Container;
    dispose(): Promise<void>;
  }
  ```

  수명 셋의 차이 — `singleton`은 **등록한** 스코프에, `scoped`는 **조회한** 스코프에 붙잡고, `transient`는 아무 데도 안 붙잡아 `dispose`도 안 부른다.

- **컨셉** — 커널의 "DI 컨테이너". 확장끼리는 토큰으로만 만난다
- **의심** — 없다
- **판정** —

### 2-4. 이벤트 — 컨셉이 적은 "이벤트 버스"가 실제로는 없다 (⑨)

- **지금**

  ```ts
  export type Listener<T> = (value: T) => void;

  export class Emitter<T = void> {
    readonly event: (listener: Listener<T>) => Disposable;
    fire(value: T): void;
    dispose(): void;
  }
  ```

  Model이 자기 것을 쥐고 `onDidChange(listener: () => void): Disposable`로 내놓는 관례다. **전역 pub/sub 버스는 없다.**

- **컨셉** — 커널에 "DI 컨테이너 · 이벤트 버스 · extension host"라고 적었다
- **의심** — **버스가 정말 필요한가.** 지금 확장끼리의 소통은 전부 DI 토큰으로 끝난다. 버스를 들이면 "누가 이 이벤트를 듣는가"를 정적으로 못 찾게 되는 값을 문다. 컨셉의 그 낱말이 실측 없이 쓰인 것일 수 있다
- **판정** —

---

## 3. 확장 등록 — 지금 통째로 없다

### 3-1. `register(api)`

- **지금** — **없다.** 조립부(`registerServices.tsx`)가 손으로 `TabContentRegistry.add(...)`, `ActivityBarRegistry.add(...)`를 부른다. 확장이 자족적이지 않고, 확장을 더하면 조립부를 고쳐야 한다
- **컨셉** — "확장은 매니페스트 없이 코드로 신고한다. 확장마다 `register(api)` 하나에서 뷰·명령·여는 파일 종류·설정 스키마를 전부 등록한다"
- **의심** — `container`를 통째로 주면 확장이 커널 내부 토큰까지 볼 수 있다. 좁힌 면만 줄지가 물음
- **판정** —

```ts
/** 확장 하나가 켜질 때 커널이 건네는 것. 확장은 이것 말고 커널을 모른다. */
export type ExtensionApi = {
  readonly contributeActivity: (d: ActivityBarDescriptor) => void;
  readonly contributeSidebar: (d: SidebarContentDescriptor) => void;
  readonly contributeTab: (d: TabContentDescriptor) => void;
  readonly contributeEditor: (d: EditorContribution) => void;
  readonly contributeStatusBarItem: (d: StatusBarItemDescriptor) => void;
  readonly contributeCommand: (d: ActionDescriptor) => void;
  readonly contributeKeybinding: (d: KeybindingDescriptor) => void;
  readonly contributeMenuItem: (d: MenuItemDescriptor) => void;
  readonly contributeSettings: (d: SettingsSchemaDescriptor) => void;
  /** 확장이 자기 서비스를 등록하고 남의 것을 꺼내는 자리. 확장끼리는 토큰으로만 만난다. */
  readonly container: Container;
};

/** 확장 모듈이 내보내는 모양. 배럴의 기본 내보내기가 이것이다. */
export type ExtensionModule = {
  readonly id: string;
  readonly register: (api: ExtensionApi) => void;
};
```

**`register`가 `Disposable`을 돌려주나.** 컨셉은 "확장이 번들에 정적으로 들어 있고 셸이 뜨면 전부 켜진다"라 끌 일이 없다. 그러면 `void`가 맞고, 끌 수 있게 하려면 `Disposable`이다. 되돌리기 비싼 쪽은 나중에 빼는 것이다.

- **판정** —

### 3-2. 어느 확장이 어느 파일을 여는가 (②③)

- **지금** — **없다.** `ITabContentRegistry`는 `kind → 컴포넌트`만 안다. `파일 → kind` 판정이 어디에도 없어서 `FILE_TAB_KIND`가 `registerServices.tsx`의 **로컬 상수**이고 export도 안 된다. 그래서 "텍스트 에디터도 확장"이라는 대칭이 코드에 없다
- **컨셉** — "어느 확장이 어느 파일을 여는지는 확장이 신고한다. 켜질 때 자기가 여는 것과 우선순위를 커널에 내고, 커널은 그 목록만 보고 고른다 — **확장 이름을 모른다**"
- **의심** — `opens`가 보는 것이 `path`와 `isText` 둘로 충분한가. 크기 상한은 커널이 먼저 거르므로 여기 없어도 되지만, "이 확장은 10MB까지"를 표현할 자리가 사라진다
- **판정** —

```ts
/** 확장이 "나는 이런 파일을 연다"고 커널에 내는 신고. */
export type EditorContribution = {
  readonly id: string;
  /** `ITabContentRegistry`에 같은 id로 등록된 것과 맞물린다. */
  readonly tabKind: string;
  /** 열 수 있으면 우선순위(클수록 먼저), 못 열면 `false`. */
  readonly opens: (file: { readonly path: string; readonly isText: boolean }) => number | false;
};
```

**패턴이 아니라 함수인 이유.** 텍스트 에디터는 "텍스트면 전부"라 확장자 목록으로 표현할 수 없다. 모델 규칙이 이미 "텍스트냐 아니냐가 무엇으로 열지를 정한다"로 그 축을 정해 놨다.

### 3-3. 확장이 기여하는 설정 스키마 (⑤)

- **지금** — **없다.** `ISettingsModel`의 `Settings`가 `{ density: Density; agentConfirmWrites: boolean }`으로 고정이다. 확장이 설정을 더하려면 커널 타입을 고쳐야 한다
- **컨셉** — "설정 저장소 — **확장이 자기 설정 스키마를 기여한다.** `settings.json`을 커널이 든다"
- **의심** — 값의 타입을 무엇으로 좁히나. `contracts`가 zod를 쓰므로 스키마를 zod로 받는 길이 있는데, 그러면 커널이 zod를 알게 된다
- **판정** —

```ts
export type SettingsSchemaDescriptor = {
  readonly id: string;
  readonly title: string;
  readonly type: "boolean" | "number" | "string" | "enum";
  readonly default: unknown;
  /** `type`이 `enum`일 때만. */
  readonly options?: readonly string[];
  /** 화면 폭에 따라 갈라지는 값인가 — 설정에 "기기" 개념을 두지 않기로 한 결정의 대응물이다. */
  readonly byViewportWidth?: boolean;
};
```

---

## 4. 화면 뼈대 기여 지점

### 4-1. 활동 바

- **지금**

  ```ts
  export type ActivityBarDescriptor = {
    readonly id: string;
    readonly title: string;
    readonly iconId: string;
    /** 이 활동을 여는 단축키(`ctrl+shift+e` 형태). */
    readonly keybinding?: string;
  };
  ```

- **컨셉** — "화면 뼈대 — 확장이 꽂히는 자리 그 자체다. 액티비티 바, 사이드바와 보조 사이드바"
- **의심** — `iconId`가 `string`이다. 아이콘 집합은 닫혀 있는데(`Icon`의 `IconId`) 여기서 풀린다 — 없는 아이콘을 적어도 아무도 안 알려준다
- **판정** —

### 4-2. 사이드바 — **커널이 파일을 안다** (①)

- **지금**

  ```ts
  /** 사이드바 본문·액션이 커널에게서 받는 것. 셋 다 `IShellViewModel`의 얇은 통로다. */
  export type SidebarSlotProps = {
    readonly onFileOpen: (path: string, position?: { readonly line: number; readonly column: number }) => void;
    readonly onFileMove: (oldPath: string, newPath: string) => void;
    readonly onFilePin: (path: string) => void;
    readonly onOpenTab: (tab: { readonly id: string; readonly kind: string; readonly title: string }) => void;
  };

  export type SidebarContentDescriptor = {
    readonly id: string;
    /** 머리 오른쪽에 그대로 놓이는 아이콘 버튼들. */
    readonly InlineActions?: ComponentType<SidebarSlotProps>;
    /** `'...'` 뒤에 접히는 메뉴 항목들. */
    readonly MenuActions?: ComponentType<SidebarSlotProps>;
    /** 패널 **본문**만 그린다 — 크롬은 커널이 두른다. */
    readonly ContentComponent: ComponentType<SidebarSlotProps>;
  };
  ```

- **컨셉** — "커널은 그 목록만 보고 고른다 — **확장 이름을 모른다**." 그리고 "파일 시스템은 확장"이다
- **의심** — **정면으로 어긋난다.** 커널이 "파일"이라는 확장의 어휘를 계약에 박아 뒀고, 그것을 **사이드바에 기여하는 모든 확장**에게 내민다 — 검색에도 설정에도 간다. 길이 둘이다
  - 슬롯이 아무것도 안 받는다. 확장은 DI로 자기가 필요한 것을 꺼낸다
  - 슬롯이 `onOpenTab` 하나만 받는다 — 탭은 커널 어휘라 남아도 된다

  어느 쪽이든 `onFileOpen`·`onFileMove`·`onFilePin`은 탐색기 확장 안으로 들어간다
- **판정** —

### 4-3. 탭 내용

- **지금**

  ```ts
  /** 탭 안의 특정 위치를 보여 달라는 요청. 줄·열은 1부터, `seq`는 같은 위치를 다시 요청해도 구분되게. */
  type TabReveal = { readonly line: number; readonly column: number; readonly seq: number };

  /** `id`는 탭의 `kind`와 맞물린다 — 셸이 이 id로 무엇을 그릴지 찾는다. */
  export type TabContentDescriptor = {
    readonly id: string;
    readonly iconId: string;
    readonly TabComponent: ComponentType<{ readonly tabId: string; readonly reveal?: TabReveal | null }>;
  };
  ```

- **컨셉** — "커널은 탭 안의 `URI`와 더티 여부만 안다. 텍스트·PDF·`.db`가 전부 이 하나로 꽂힌다 — VSCode의 '사용자 지정 편집기'와 '웹뷰'가 우리에게는 기본 모양이다"
- **의심** — `reveal`이 `{ line, column, seq }`다. **줄·열은 텍스트의 어휘다.** PDF는 쪽이고 `.db`는 표·행이다. 텍스트만 특별한 자리가 여기 남아 있다
- **판정** —

### 4-4. 셸이 뜰 때 켜지는 것

- **지금**

  ```ts
  export type WorkbenchStartupDescriptor = {
    readonly id: string;
    readonly token: Token<IWorkbenchStartup>;
  };

  export interface IWorkbenchStartup {
    start(): void;
    stop(): void;
  }
  ```

  descriptor가 함수가 아니라 **토큰**을 담는다. Registry는 singleton이라 루트에서 등록되는데 켤 대상은 `scoped`라, 루트에서 미리 resolve하면 화면이 보는 것과 다른 인스턴스를 켜게 되기 때문이다.

- **컨셉** — "확장은 번들에 정적으로 들어 있고 셸이 뜨면 전부 켜진다"
- **의심** — `register(api)`가 생기면 이 자리가 그것과 겹친다. 확장의 `register`가 곧 활성화라면, 별도 스타트업 기여 지점이 남을 이유는 "확장이 아닌 커널 자신의 초기화"뿐이다
- **판정** —

---

## 5. 탭

### 5-1. 열린 탭 — `kind`가 그냥 문자열이다 (③)

- **지금**

  ```ts
  /** 직렬화 가능한 것만 담는다 — `ReactNode`를 담으면 이 계약이 React를 알게 된다. */
  export type OpenTab = {
    /** 파일은 워크스페이스 루트 기준 경로다. */
    readonly id: string;
    readonly kind: string;
    readonly title: string;
  };

  export type PaneId = string;
  export type TabSplitOrientation = "horizontal" | "vertical";

  export interface TabPaneLeaf {
    readonly kind: "leaf";
    readonly id: PaneId;
    readonly tabs: readonly OpenTab[];
    readonly activeTabId: string | null;
    readonly size?: number;
  }
  ```

  확장이 자기 파일에 `export const X_TAB_KIND = "..."`를 두고 조립부가 같은 문자열로 잇는다. 닫힌 유니온이 없다.

- **컨셉** — 텍스트·PDF·`.db`가 같은 모양으로 꽂힌다
- **의심** — **컴파일 타임 보장이 0이다.** 문자열이 어긋나면 런타임에 탭이 빈다. 다만 닫힌 집합으로 두면 "확장을 더해도 커널을 안 고친다"가 깨진다 — 열린 채로 두는 것이 값일 수도 있다. `EditorContribution.tabKind`가 생기면 **신고와 등록을 같은 자리에서 내므로** 어긋날 여지가 줄어든다
- **판정** —

### 5-2. 탭 상태가 어디 사나 — **`localStorage`다** (④)

- **지금** — `TabsModel`이 `workbench.tabTree`·`workbench.activeLeafId`·`workbench.previewTabId`를 브라우저에 적는다

  ```ts
  export interface ITabsModel {
    readonly tree: TabPaneNode;
    setTree(tree: TabPaneNode): void;
    readonly activeLeafId: PaneId;
    setActiveLeafId(id: PaneId): void;
    /** 지금 미리보기 자리에 있는 탭. **전역 하나다.** */
    readonly previewTabId: string | null;
    setPreviewTabId(id: string | null): void;
    onDidChange(listener: () => void): Disposable;
  }
  ```

  setter 셋 다 "다음 값이 뭐여야 하는지"를 계산하지 않는다. 분할·닫기·리사이즈 판단은 전부 `ShellViewModel`에 있다.

- **컨셉** — "**무엇이 열려 있었는지는 서버가 적는다.** 새로고침해도 탭이 그대로 돌아온다." 그리고 "탭 목록은 한 벌이고 보여주는 법만 다르다"
- **의심** — **어긋난다.** 지금 모양이면 폰과 데스크톱이 다른 탭을 본다. 고치면 서버에 워크스페이스 단위 상태가 새로 생기고, 설정처럼 밀어주는 통로가 필요해진다
- **판정** —

### 5-3. 커널이 더티를 아는 통로, 그리고 그 반대 (⑥)

- **지금**

  ```ts
  /** 셸이 파일을 모르게 하는 계약이다. `IPinTab`을 뒤집은 모양이다. */
  export interface ITabDirtyState {
    /** 없거나 더러워질 수 없는 탭이면 `false`. */
    isDirty(tabId: string): boolean;
    /** 어느 탭이든 저장 안 된 변경이 있는가 — 새로고침 경고가 쓴다. */
    hasAnyDirty(): boolean;
    onDidChange(listener: () => void): Disposable;
  }

  /** `FilesystemModule`이 `ShellModule`의 탭 고정을 부르기 위한 통로. */
  export interface IPinTab {
    /** 이 경로에 대응하는 탭이 열려 있고 아직 미리보기 상태면 고정한다. */
    pin(path: string): void;
  }
  ```

  둘 다 조립부가 **클로저로** 잇는다.

- **컨셉** — "커널은 탭 안의 `URI`와 더티 여부만 안다"
- **의심** — `ITabDirtyState`는 컨셉과 정확히 맞는다. `IPinTab`은 방향이 반대라, `register(api)`가 생기면 확장이 명령으로 등록하고 커널이 부르는 모양으로 접힐 수 있다 — 전용 포트가 남아야 하는지가 물음
- **판정** —

---

## 6. 명령

### 6-1. 명령·컨텍스트·키바인딩·메뉴 (⑧)

- **지금**

  ```ts
  /** `when`을 Action에서 **뺐다** — 같은 명령이라도 트리거마다 조건이 다르다. */
  export interface ActionDescriptor<TContext = unknown> extends Descriptor {
    readonly label: string;
    readonly execute: (context: TContext) => void;
  }

  /** id는 점 네임스페이스 — `tab.active.format`. */
  export interface ContextDescriptor extends Descriptor {
    readonly atom: ReadableAtom<unknown>;
  }

  export interface KeybindingDescriptor extends Descriptor {
    /** `ctrl+k` 형태. Ctrl과 Cmd를 둘 다 `ctrl`로 합친다. */
    readonly keybinding: string;
    readonly actionId: string;
    readonly when?: (ctx: ContextRegistry) => boolean;
  }

  export interface MenuItemDescriptor extends Descriptor {
    /** 어느 메뉴에 기여하는지 — `'explorer.context'`. */
    readonly menuId: string;
    readonly commandId: string;
    readonly when?: (ctx: ContextRegistry) => boolean;
    /** VSCode 스타일 정렬 그룹 — `1_create`·`9_danger`. */
    readonly group?: string;
    readonly order?: number;
  }

  export interface ICommandCenterRegistry {
    readonly commandRegistry: CommandRegistry;
    readonly contextRegistry: ContextRegistry;
    readonly keybindingRegistry: KeybindingRegistry;
    readonly menuRegistry: MenuRegistry;
    registerCommand(descriptor: CommandDescriptor): void;
    registerContext(descriptor: ContextDescriptor): void;
    registerKeybinding(descriptor: KeybindingDescriptor): void;
    registerMenuItem(descriptor: MenuItemDescriptor): void;
    /** 실행했으면 `true` — 호출부가 이 값으로 `preventDefault` 여부를 정한다. */
    dispatchKeydown(pressed: string): boolean;
  }
  ```

- **컨셉** — "명령 레지스트리 — 확장이 명령을 등록하고, 명령 팔레트와 단축키가 그 등록부를 읽는다"
- **의심** — **`ICommandCenterRegistry`가 `core`의 타입을 별칭으로 다시 편다**(`export type CommandDescriptor = ActionDescriptor` 식). 이유가 설계가 아니라 린트다 — `export type { X }` 재수출을 막는 규칙(`arka/model-type-only`) 때문이다. 겹이 하나 더 있고, 그 겹이 존재하는 이유를 코드만 보고는 알 수 없다
- **판정** —

---

## 7. 커널이 드는 상태 — **"커널인가"부터가 판정 거리다**

컨셉이 커널로 적은 것은 여덟이다 — 화면 뼈대 · 명령 레지스트리 · 설정 저장소 · 테마 토큰 · 워크스페이스와 `URI` · DI·이벤트 버스·extension host · 앱 수명 · 확장 등록.

그런데 `workbench/model/`에는 그 밖의 것이 일곱 더 있다. 각각 **커널에 남을 자리가 있는가**가 첫 물음이다.

- **`IThemeModel`** — `Theme = "light" | "dark"`
  - 컨셉의 "테마 토큰" 자리다. 값 둘뿐인데, **테마 *값*은 확장이 기여하기로 했고 그 자리가 없다**
  - **판정** —
- **`ISettingsModel`** — `Settings { density: Density; agentConfirmWrites: boolean }`
  - 고정 두 칸이다(→ 3-3). **`agentConfirmWrites`는 v1.0에 없는 에이전트의 것이다**
  - **판정** —
- **`IStorage`** — `get(key): string | null` · `set(key, value)`. localStorage
  - 컨셉의 커널 여덟에 없다. 탭을 서버로 옮기면(→ 5-2) 남을 이유가 줄어든다
  - **판정** —
- **`INotificationService`** — `notify(severity, message): string`
  - 컨셉에 없다. 확장도 알림을 내므로 커널이 맞아 보이는데, 컨셉이 안 적었다
  - **판정** —
- **`IErrorLog`** — `report(error: unknown, source: string)`
  - 위와 같다
  - **판정** —
- **`IServerInfo`** — `load(): Promise<ServerInfo | null>`. 실패해도 안 던진다
  - 전송 계약(다음 라운드)이 이 자리를 덮을 수 있다
  - **판정** —
- **`IActivityModel`** — `activeActivityId: ActivityId | null`
  - 화면 뼈대의 일부로 접힐 수 있다
  - **판정** —

---

## 8. 커널 여덟 중 계약이 아직 없는 것

### 8-1. 워크스페이스와 `URI`

- **지금** — 클라이언트에 워크스페이스 계약이 **없다.** 경로는 어디서나 `string`이고, 워크스페이스 루트 기준 상대 경로라는 것이 주석 관례로만 있다. `contracts/common/uri.ts`에 `URI` 클래스가 있지만 **리포 어디서도 안 쓴다**
- **컨셉** — "워크스페이스와 `URI` — 모두가 같은 좌표계를 쓴다." 모델 규칙이 "**경로는 문자열이 아니라 `URI`로 가리킨다**", "루트는 하나다", "루트는 서버 설정으로 고정한다"로 못 박았다
- **의심** — **컨셉이 `URI`를 쓰라고 했는데 코드는 전부 `string`이다.** 안 쓰는 `URI` 클래스가 `contracts`에 놓여 있다. 셋 중 하나다 — 계약대로 `URI`로 바꾼다 / 컨셉을 상대 경로 문자열로 고친다 / `URI`를 버린다
- **판정** —

```ts
export interface IWorkspace {
  /** 루트는 하나다. 서버 설정으로 고정되고 앱 안에서 바꾸지 않는다. */
  readonly root: string;
  readonly name: string;
}
```

### 8-2. 앱 수명

- **지금** — 조립부 로컬 토큰으로 흩어져 있다 — `startup.unloadGuard`, `startup.globalErrorHandlers`, `reloadApp` 클로저
- **컨셉** — "앱 수명 — 업데이트, 다시 시작." 그리고 전송 결정이 "**프로토콜 버전이 안 맞으면 서버가 소켓을 끊고 새로고침시킨다. 더티 탭이 있으면 브라우저가 떠나기 전에 묻는다**"다
- **의심** — 계약이 없어 그 결정을 걸 자리가 없다. `ITabDirtyState.hasAnyDirty`가 이미 절반이다
- **판정** —

```ts
export interface IAppLifetime {
  /** 새 버전이 떴다 — 더티가 있으면 사용자에게 묻고, 없으면 바로 새로고침한다. */
  requestReload(reason: "versionMismatch" | "userRequested"): void;
  onDidRequestReload(listener: (reason: string) => void): Disposable;
}
```

---

## 9. v1.0의 화면

### 9-1. 커널이 그리는 것

- **셸** — 확장이 꽂히는 자리 그 자체
  - 활동 바 — 사이드바를 고르는 아이콘 줄
  - 사이드바 — 크롬(제목·액션 줄)은 커널이 두르고 본문만 확장이 그린다
  - 에디터 그룹 — 탭 띠, 분할, 끌어서 재배치
  - 패널 — 터미널이 사는 아래 칸
  - **상태 표시줄** — 지금 없다. 확장이 칸을 기여한다
  - 구역 경계 끌기
- **명령 팔레트** — 명령 레지스트리에 등록된 것을 보여준다
- **단축키 표** — 등록된 키바인딩과 충돌
- **알림 목록** · **크래시 화면**

### 9-2. 확장이 그리는 것

각각 탭 하나 또는 사이드바 뷰 하나다.

- **탐색기**(사이드바) — 트리, 만들기·이름 바꾸기·옮기기
- **검색**(사이드바) — 폴더 전체 찾기·바꾸기, 검색 결과 문서
- **텍스트 에디터**(탭) — CodeMirror 6. LSP 없음
- **PDF 뷰어**(탭) — 직접 만든다
- **`.db` 뷰어**(탭) — 직접 만든다
- **이미지·오디오·비디오**(탭) — 브라우저가 URL을 직접 문다
- **웹 한 칸**(탭) — 원격 노드 포트만
- **터미널**(패널)
- **설정 화면**(탭) — 커널에 등록된 스키마를 그린다
- **코드 조각 관리**(탭)
- **로컬 히스토리** — 어디에 붙나. 탭인가, 사이드바인가, 파일 메뉴인가
  - **판정** —

### 9-3. 좁은 화면에서 접히는 방식

컨셉이 정한 것.

- **탭 목록은 한 벌이고 보여주는 법만 다르다.** 좁은 화면은 탭을 줄로 늘어놓지 않고 **한 번에 하나만** 보여준다(목록에서 골라 간다)
- **설정값은 기기가 아니라 화면 폭으로 갈라진다**
- 사이드바·패널은 겹쳐 뜬다 — 나란히 둘 폭이 없다

아직 안 정한 것.

- **활동 바가 좁은 화면에서 어디로 가나** — 아래 고정 줄? 햄버거?
  - **판정** —

---

## 10. 지금 있는 컴포넌트 스물셋 — 전부 판정한다

### 10-1. `shared/component/` 열

- **`Text`**(자작) — props 바탕이 `HTMLAttributes`다. [ADR 0008](../adr/0008-component-surface.md)이 금지한 형태이고 예외 둘 중 하나다
  - **판정** —
- **`Container`**(자작) — 의심 없다
  - **판정** —
- **`Panel`**(자작) — 의심 없다
  - **판정** —
- **`Icon`**(자작, codicon·octicon) — `IconId`가 닫힌 집합인데 기여 지점들은 `iconId: string`으로 푼다
  - **판정** —
- **`IconButton`**(Primer 래퍼) — 의심 없다
  - **판정** —
- **`ModeToggle`**(Primer 래퍼) — **`useControllableState`를 안 쓰고 손으로 `useState`를 둔다.** ADR 0008 위반이 살아 있다
  - **판정** —
- **`Menu`**(Radix 래퍼) — 의심 없다. [ADR 0009](../adr/0009-primer-first.md)가 명시한 예외다
  - **판정** —
- **`Timestamp`**(자작) — 의심 없다
  - **판정** —
- **`CodeBlock`**(자작) — 텍스트 에디터가 CodeMirror로 서면 문법 강조 경로가 둘이 된다
  - **판정** —
- **`Markdown`**(자작) — **마크다운 프리뷰가 v1.0 목록에 없다.** 쓸 자리가 있나
  - **판정** —

### 10-2. `workbench/component/` 일곱

- **`Shell`** — 슬롯 여덟을 props로 받는다(ADR 0008의 "셋 이상이면 부품"에 대한 명시적 예외). **상태 표시줄 자리가 없다**
  - **판정** —
- **`ActivityBar`** — 좁은 화면에서 어디로 가는지 정해져 있지 않다(→ 9-3)
  - **판정** —
- **`Tab`** — **좁은 화면 접힘이 없다.** 컨셉은 "한 번에 하나"로 정했다. 그리고 31키 `TabClassNames` context가 ADR 0008의 "클래스 맵을 만들지 않는다"에 걸린 채 유예돼 있다(TASK-58)
  - **판정** —
- **`CommandPalette`** — 의심 없다
  - **판정** —
- **`NotificationList`** — 커널이 알림을 드는 것이 맞는지가 계약 쪽 물음이다(→ 7)
  - **판정** —
- **`KeybindingTable`** — 의심 없다
  - **판정** —
- **`CrashScreen`** — 의심 없다
  - **판정** —

### 10-3. 확장의 컴포넌트 여섯

- **`FileTree`**(filesystem) — props 바탕이 `HTMLAttributes`다. 예외 둘 중 둘째
  - **판정** —
- **`FileIcon`**(filesystem) — 의심 없다
  - **판정** —
- **`TextEditor`**(filesystem) — **CodeMirror 6 위에 서야 한다.** 그리고 컨셉이 텍스트 에디터를 별도 확장으로 갈랐으니 `filesystem`에 남을 자리가 아니다
  - **판정** —
- **`SearchResultList`**(search) — 의심 없다
  - **판정** —
- **`ChangeList`**(git) — **VCS는 v1.1이다.** v1.0에서 빠진다
  - **판정** —
- **`DiffView`**(git) — 위와 같다
  - **판정** —

`agent`의 여섯(`ChatRoom`·`InputComposer`·`Message`·`SessionList`·`StatusIndicator`·`StepBlock`)도 **에이전트가 v1.2라 v1.0 밖이다.** 지우나, 두고 안 켜나.

- **판정** —

---

## 11. 새로 만들 것 여섯

그림이 아직 없다. Figma 브리지가 안 붙었고 스크린샷도 없다. **아래 props는 "무엇을 드는가"까지만 정한 것이고, 그림이 나오면 상당수가 다시 쓰인다.**

### 11-1. 상태 표시줄

커널이 그리고 확장이 칸을 기여한다. 지금 셸에 자리 자체가 없다.

```ts
export type StatusBarItemDescriptor = {
  readonly id: string;
  readonly align: "left" | "right";
  readonly text: string;
  readonly iconId?: IconId;
  readonly tone?: "default" | "warning" | "danger";
  readonly tooltip?: string;
  /** 누르면 실행할 명령. 명령 레지스트리의 id다. */
  readonly commandId?: string;
};

export type StatusBarProps = {
  readonly items: readonly StatusBarItemDescriptor[];
  readonly onItemActivate?: (id: string) => void;
};
```

- **판정** —

### 11-2. 터미널

출력은 서버가 소켓으로 밀어주고 입력은 같은 소켓으로 올린다. 화면은 xterm 위에 얇게.

```ts
export type TerminalProps = {
  readonly sessionId: string;
  readonly onInput: (data: string) => void;
  readonly onResize: (cols: number, rows: number) => void;
  /** 다시 붙었을 때 서버가 준 스크롤백을 한 번 뿌린다. */
  readonly initialOutput?: string;
};
```

**출력을 props로 받나, 컴포넌트가 구독하나.** props로 받으면 초당 수백 번 렌더가 돈다 — xterm은 명령형 `write()`라 ref로 밀어 넣는 것이 보통이다. 그러면 "props만 받아 그린다"는 [ADR 0007](../adr/0007-client-layers.md)의 `component/` 규칙과 부딪힌다.

- **판정** —

### 11-3. PDF 뷰어

```ts
export type PdfViewProps = {
  readonly src: string;
  readonly page?: number;
  readonly onPageChange?: (page: number) => void;
};
```

**본문을 어떻게 받나.** 파일 본문은 HTTP로 가기로 했으니 `src` URL이 자연스럽다 — 그러면 이 컴포넌트가 네트워크를 알게 된다(ADR 0007이 `component/`에 금지한 것). `<img src>`와 같은 부류라 예외로 볼 수 있는지가 판정 거리다.

- **판정** —

### 11-4. `.db` 뷰어

```ts
export type DbViewProps = {
  readonly tables: readonly string[];
  readonly activeTable: string | null;
  readonly columns: readonly string[];
  readonly rows: readonly Readonly<Record<string, unknown>>[];
  readonly onTableSelect: (name: string) => void;
  /** 행이 많으면 서버가 잘라 준다 — 더 달라고 하는 자리. */
  readonly hasMore?: boolean;
  readonly onLoadMore?: () => void;
};
```

**읽기 전용인가.** 컨셉의 프리뷰 결정은 "텍스트는 편집까지, 나머지는 보기만"이었다 — 그러면 읽기 전용이고 `onRowEdit` 같은 것이 없다. **질의를 칠 수 있나**는 뷰어가 아니라 도구라 v1.0 밖으로 보인다.

- **판정** —

### 11-5. 미디어 뷰어

```ts
export type MediaViewProps = {
  readonly src: string;
  readonly kind: "image" | "audio" | "video";
  /** 이미지일 때만. 없으면 파일 이름을 쓴다. */
  readonly alt?: string;
};
```

**셋을 한 컴포넌트로 두나, 셋으로 가르나.** 그리는 원소가 `<img>`·`<audio>`·`<video>`로 다르고 컨트롤도 다르다. ADR 0008의 "이 축이 변형인가 다른 컴포넌트인가"가 그대로 걸린다.

- **판정** —

### 11-6. 웹 한 칸

```ts
export type WebFrameProps = {
  readonly port: number;
  readonly path?: string;
  readonly onPathChange?: (path: string) => void;
};
```

원격 노드의 포트를 iframe으로 본다. **바깥 사이트는 v3다.** 원격 노드 포트는 우리 origin이라 same-origin으로 만들 수 있고 그러면 주소창·뒤로가기도 되는데, v1.0에 필요한지가 판정 거리다.

- **판정** —

### 11-7. 이것이 무는 값

`packages/client/test/structure.test.ts`가 컴포넌트마다 **파일 다섯**을 강제한다.

```text
<Name>/<Name>.tsx
<Name>/<Name>.module.css
<Name>/<Name>.stories.tsx      기본 / 빈 / 로딩 / 에러 — 그 상태가 실제로 있는 것만
<Name>/<Name>.test.tsx         하네스 넷: className · data-component · ref · axe
<Name>/index.ts
```

그룹 배럴(`component/index.ts`)은 금지다. **여섯이면 파일 서른이다** — 한 라운드가 아니라 최소 여섯 라운드다.

---

## 12. 새 CSS를 쓰기 전에 정할 것 둘

둘 다 **문서와 코드가 어긋나 있다.** 새 컴포넌트를 쓰기 전에 정해야 서른 개 파일이 둘로 갈리지 않는다.

### 12-1. 변형 선택자

- ADR 0008과 `CONVENTIONS.md`는 **`:where([data-x])`**를 요구한다 — 특이성을 한 겹으로 두려고
- `packages/client/src` 전체에 `:where([data-`가 **0건**이다. 실제는 전부 `.root[data-x]`
- **판정** — 문서를 코드에 맞추나, 코드를 문서에 맞추나

### 12-2. 루트 클래스 이름

- `.root` — `Container` `Panel` `Menu` `IconButton` `ModeToggle` `Markdown` `CodeBlock`
- `.<Name>` — `Text` `Timestamp` `Icon` `FileIcon` `StatusIndicator`
- **판정** — 어느 쪽으로 통일하나

---

## 13. 이 초안이 다루지 않는 것

- **전송 계약** — 소켓 메시지 틀, 연결 id 헤더, 재연결. 컨셉에 결정은 있으나 관심사가 다르다
- **확장 열셋의 계약** — 파일 시스템·탐색기·텍스트 에디터·프리뷰·검색·터미널의 Model/ViewModel
- **판정에 따른 실제 이동** — `packages/*/src/`를 고치는 것은 승인 뒤다
