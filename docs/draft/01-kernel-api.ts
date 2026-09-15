/**
 * v1.0 커널 계약 — 판정 초안.
 *
 * **이 폴더는 초안이다.** 판정은 사용자가 한다. 승인되기 전까지 `packages/*&#47;src/`·ADR·
 * `CONVENTIONS.md`는 건드리지 않는다. 승인된 뒤에야 계약 PR이 열리고, 그때 이 파일의 판정
 * 주석은 걷어낸다 — 코드에 심사 과정을 남기지 않기로 했기 때문이다.
 *
 * 무엇이 커널인지는 [concept.md](../concept.md)의 `#### v1.0`이 정했다 — **커널은 "확장이
 * 꽂힐 자리"를 가진 것이고 나머지는 전부 확장이다.**
 *
 * ## 지금 있는 것도 전부 판정 대상이다
 *
 * 아래 계약 대부분은 이미 `packages/client/src/`에 있다. 그런데 그것들은 **컨셉이 서기 전에**
 * 쓰였다 — 어긋나는 자리가 실제로 있다. "있으니 그대로"로 넘기지 않고 하나씩 다시 판정한다.
 *
 * 항목마다 네 칸이다.
 *
 * ```text
 * ⓐ 지금        현재 시그니처. 없으면 `없다`
 * ⓑ 컨셉        concept.md가 이 자리에 요구하는 것
 * ⓒ 의심        둘이 어긋나 보이는 지점. 없으면 `없다`
 * ⓓ 판정        아래 어휘 하나 ← 사용자가 채운다
 * ```
 */
export type Verdict =
  /** 지금 모양 그대로 간다. */
  | "그대로"
  /** 축·이름·범위를 바꾼다. 무엇을 왜 바꾸는지 함께 적는다. */
  | "고침"
  /** 커널에서 뺀다 — 확장으로 내리거나 아예 없앤다. */
  | "버림"
  /** 지금 없다. 새로 만든다. */
  | "새로";

/* ------------------------------------------------------------------------ *
 * 1. 지지대 — 확장이 꽂히는 장치 자체
 * ------------------------------------------------------------------------ */

/**
 * ## 1-1. 기여 지점 일반화
 *
 * ⓐ 지금 — `core/registry`. `add`로 등록하고 `get`/`tryGet`/`list`로 꺼내며, id에 `:`나 `*`가
 *          있으면 패턴으로 컴파일해 `match`가 자리표시자 값을 함께 준다. 중복 id는 던진다.
 * ⓑ 컨셉 — "확장이 꽂힐 자리"의 바탕. 커널 여덟 중 첫째다.
 * ⓒ 의심 — **`match`의 패턴 기능을 지금 아무도 안 쓴다.** 쓰는 곳이 생길 자리도 v1.0 목록에
 *          없다. 안 쓰는 기능이 계약에 있으면 구현마다 따라온다.
 * ⓓ 판정 —
 */
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

/**
 * ## 1-2. 같은 Registry 계약이 네 번 복붙돼 있다
 *
 * ⓐ 지금 — `ITabContentRegistry`·`IActivityBarRegistry`·`ISidebarContentRegistry`·
 *          `IWorkbenchStartupRegistry` 넷이 위 다섯 메서드를 **글자 그대로 옮겨 적는다.**
 *          이유는 `interface X extends Registry<D> {}`가 `@typescript-eslint/no-empty-object-type`에
 *          걸려서다.
 * ⓑ 컨셉 — 기여 지점은 하나의 장치여야 한다. 지점이 늘 때마다 계약이 복제되면 장치가 아니다.
 * ⓒ 의심 — **린트 규칙 하나 때문에 계약이 넷으로 갈렸다.** 고르는 길이 셋이다.
 *          (가) `type X = Registry<D>` 별칭으로 — 인터페이스가 아니어도 되는지가 물음
 *          (나) 그 자리만 `eslint-disable`에 사유를 적는다
 *          (다) 지금처럼 복붙을 유지하고 규칙을 지킨다
 * ⓓ 판정 —
 */
export type RegistryDuplicationIsAContractProblem = never;

/**
 * ## 1-3. DI
 *
 * ⓐ 지금 — `core/di`. `Token<T>`는 phantom 타입이라 `description`이 아니라 **참조**로 비교된다.
 *          `Container`는 `register`/`resolve`/`createScope`/`dispose`. 수명 셋 —
 *          `singleton`(등록한 스코프), `scoped`(조회한 스코프), `transient`(안 붙잡음).
 * ⓑ 컨셉 — 커널 여덟의 "DI 컨테이너". 확장끼리는 토큰으로만 만난다.
 * ⓒ 의심 — 없다. 컨셉이 요구하는 것을 그대로 한다.
 * ⓓ 판정 —
 */
export interface Token<T> {
  readonly description: string;
  readonly __type?: T;
}

export interface Disposable {
  /** 동기다 — `Promise<void>`가 아니다. */
  dispose(): void;
}

export type Lifetime = "singleton" | "scoped" | "transient";

export interface Container {
  register<T>(token: Token<T>, provider: { readonly lifetime: Lifetime; create(c: Container): T }): void;
  resolve<T>(token: Token<T>): T;
  createScope(name: string): Container;
  dispose(): Promise<void>;
}

/**
 * ## 1-4. 이벤트 — 컨셉이 적은 "이벤트 버스"가 실제로는 없다
 *
 * ⓐ 지금 — `core/events`의 `Emitter<T>` 하나. Model이 자기 것을 쥐고 `onDidChange(listener)`로
 *          내놓는 관례다. **전역 pub/sub 버스는 없다.**
 * ⓑ 컨셉 — 커널 여덟에 "DI 컨테이너 · 이벤트 버스 · extension host"라고 적었다.
 * ⓒ 의심 — **버스가 정말 필요한가.** 지금 확장끼리의 소통은 전부 DI 토큰으로 끝난다. 버스를
 *          들이면 "누가 이 이벤트를 듣는가"를 정적으로 못 찾게 되는 값을 문다. 컨셉의 그 낱말이
 *          실측 없이 쓰인 것일 수 있다.
 * ⓓ 판정 —
 */
export type Listener<T> = (value: T) => void;

export interface Emitter<T = void> {
  readonly event: (listener: Listener<T>) => Disposable;
  fire(value: T): void;
  dispose(): void;
}

/* ------------------------------------------------------------------------ *
 * 2. 확장 등록 — 지금 통째로 없다
 * ------------------------------------------------------------------------ */

/**
 * ## 2-1. `register(api)`
 *
 * ⓐ 지금 — **없다.** 조립부(`registerServices.tsx`)가 손으로 `TabContentRegistry.add(...)`,
 *          `ActivityBarRegistry.add(...)`를 부른다. 확장이 자족적이지 않고, 확장을 더하면
 *          조립부를 고쳐야 한다.
 * ⓑ 컨셉 — "확장은 매니페스트 없이 코드로 신고한다. 확장마다 `register(api)` 하나에서 뷰·명령·
 *          여는 파일 종류·설정 스키마를 전부 등록한다."
 * ⓒ 의심 — `container`를 통째로 주면 확장이 커널 내부 토큰까지 볼 수 있다. 좁힌 면만 줄지가 물음.
 * ⓓ 판정 —
 */
export type ExtensionApi = {
  readonly contributeActivity: (d: ActivityBarDescriptor) => void;
  readonly contributeSidebar: (d: SidebarContentDescriptor) => void;
  readonly contributeTab: (d: TabContentDescriptor) => void;
  readonly contributeEditor: (d: EditorContribution) => void;
  readonly contributeCommand: (d: ActionDescriptor) => void;
  readonly contributeKeybinding: (d: KeybindingDescriptor) => void;
  readonly contributeMenuItem: (d: MenuItemDescriptor) => void;
  readonly contributeSettings: (d: SettingsSchemaDescriptor) => void;
  /** 확장이 자기 서비스를 등록하고 남의 것을 꺼내는 자리. 확장끼리는 토큰으로만 만난다. */
  readonly container: Container;
};

/**
 * 확장 모듈이 내보내는 모양.
 *
 * ⓒ 의심 — **`register`가 `Disposable`을 돌려주나.** 컨셉은 "확장이 번들에 정적으로 들어 있고
 *          셸이 뜨면 전부 켜진다"라 끌 일이 없다. 그렇다면 `void`가 맞고, 끌 수 있게 하려면
 *          `Disposable`이다. 되돌리기 비싼 쪽은 후자를 빼는 것이다.
 * ⓓ 판정 —
 */
export type ExtensionModule = {
  readonly id: string;
  readonly register: (api: ExtensionApi) => void;
};

/**
 * ## 2-2. 어느 확장이 어느 파일을 여는가 — 지금 아무도 모른다
 *
 * ⓐ 지금 — **없다.** `ITabContentRegistry`는 `kind → 컴포넌트`만 안다. `파일 → kind` 판정이
 *          어디에도 없어서 `FILE_TAB_KIND`가 `registerServices.tsx`의 **로컬 상수**이고
 *          export도 안 된다. 그래서 "텍스트 에디터도 확장"이라는 대칭이 코드에 없다.
 * ⓑ 컨셉 — "어느 확장이 어느 파일을 여는지는 확장이 신고한다. 켜질 때 자기가 여는 것과
 *          우선순위를 커널에 내고, 커널은 그 목록만 보고 고른다 — **확장 이름을 모른다**."
 * ⓒ 의심 — `opens`가 보는 것이 `path`와 `isText` 둘로 충분한가. 크기 상한을 커널이 먼저
 *          거르므로 여기 없어도 되지만, "이 확장은 10MB까지"를 표현할 자리가 사라진다.
 * ⓓ 판정 —
 *
 * **패턴이 아니라 함수인 이유.** 텍스트 에디터는 "텍스트면 전부"라 확장자 목록으로 표현할 수
 * 없다. 모델 규칙이 이미 "텍스트냐 아니냐가 무엇으로 열지를 정한다"로 그 축을 정해 놨다.
 */
export type EditorContribution = {
  readonly id: string;
  /** `ITabContentRegistry`에 같은 id로 등록된 것과 맞물린다. */
  readonly tabKind: string;
  /** 열 수 있으면 우선순위(클수록 먼저), 못 열면 `false`. */
  readonly opens: (file: { readonly path: string; readonly isText: boolean }) => number | false;
};

/**
 * ## 2-3. 확장이 기여하는 설정 스키마
 *
 * ⓐ 지금 — **없다.** `ISettingsModel`의 `Settings`가 `{ density, agentConfirmWrites }` 두 칸으로
 *          고정이다. 확장이 설정을 더하려면 커널 타입을 고쳐야 한다.
 * ⓑ 컨셉 — "설정 저장소 — **확장이 자기 설정 스키마를 기여한다.** `settings.json`을 커널이 든다."
 * ⓒ 의심 — 값의 타입을 무엇으로 좁히나. `contracts`가 zod를 쓰므로 스키마를 zod로 받는 길이
 *          있는데, 그러면 커널이 zod를 알게 된다.
 * ⓓ 판정 —
 */
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

/* ------------------------------------------------------------------------ *
 * 3. 화면 뼈대 기여 지점
 * ------------------------------------------------------------------------ */

/**
 * ## 3-1. 활동 바
 *
 * ⓐ 지금 — 아래 그대로.
 * ⓑ 컨셉 — "화면 뼈대 — 확장이 꽂히는 자리 그 자체다. 액티비티 바, 사이드바와 보조 사이드바."
 * ⓒ 의심 — `iconId`가 `string`이다. 아이콘 집합이 닫혀 있는데(`Icon`의 `IconId`) 여기서 풀린다
 *          — 없는 아이콘을 적어도 아무도 안 알려준다.
 * ⓓ 판정 —
 */
export type ActivityBarDescriptor = {
  readonly id: string;
  readonly title: string;
  readonly iconId: string;
  readonly keybinding?: string;
};

/**
 * ## 3-2. 사이드바 — **커널이 파일을 안다**
 *
 * ⓐ 지금 — `SidebarSlotProps`가 `onFileOpen`·`onFileMove`·`onFilePin`·`onOpenTab` 넷을 든다.
 *          커널이 사이드바에 기여하는 **모든** 확장에게 파일 콜백을 내민다 — 검색·설정에도 간다.
 * ⓑ 컨셉 — "커널은 그 목록만 보고 고른다 — **확장 이름을 모른다**." 그리고 "파일 시스템은 확장"이다.
 * ⓒ 의심 — **정면으로 어긋난다.** 커널이 "파일"이라는 확장의 어휘를 계약에 박아 뒀다.
 *          고르는 길이 둘이다.
 *          (가) 슬롯이 아무것도 안 받는다. 확장은 DI로 자기가 필요한 것을 꺼낸다
 *          (나) 슬롯이 `openTab` 하나만 받는다 — 탭은 커널 어휘라 남아도 된다
 *          어느 쪽이든 `onFileOpen`·`onFileMove`·`onFilePin`은 탐색기 확장 안으로 들어간다.
 * ⓓ 판정 —
 */
export type SidebarSlotProps = {
  readonly onFileOpen: (path: string, position?: { readonly line: number; readonly column: number }) => void;
  readonly onFileMove: (oldPath: string, newPath: string) => void;
  readonly onFilePin: (path: string) => void;
  readonly onOpenTab: (tab: { readonly id: string; readonly kind: string; readonly title: string }) => void;
};

export type SidebarContentDescriptor = {
  readonly id: string;
  readonly InlineActions?: unknown;
  readonly MenuActions?: unknown;
  /** 패널 본문만 그린다 — 크롬은 커널이 두른다. */
  readonly ContentComponent: unknown;
};

/**
 * ## 3-3. 탭 내용
 *
 * ⓐ 지금 — `id`가 탭의 `kind`와 맞물리고, `TabComponent`가 `{ tabId, reveal? }`를 받는다.
 * ⓑ 컨셉 — "커널은 탭 안의 `URI`와 더티 여부만 안다. 텍스트·PDF·`.db`가 전부 이 하나로 꽂힌다 —
 *          VSCode의 '사용자 지정 편집기'와 '웹뷰'가 우리에게는 기본 모양이다."
 * ⓒ 의심 — `reveal`이 `{ line, column, seq }`다. **줄·열은 텍스트의 어휘다.** PDF는 쪽이고
 *          `.db`는 표·행이다. 텍스트만 특별한 자리가 여기 남아 있다.
 * ⓓ 판정 —
 */
export type TabContentDescriptor = {
  readonly id: string;
  readonly iconId: string;
  readonly TabComponent: unknown;
};

/**
 * ## 3-4. 셸이 뜰 때 켜지는 것
 *
 * ⓐ 지금 — descriptor가 함수가 아니라 **토큰**을 담는다. Registry는 singleton이라 루트에서
 *          등록되는데 켤 대상은 `scoped`라, 루트에서 미리 resolve하면 화면이 보는 것과 다른
 *          인스턴스를 켜게 되기 때문이다.
 * ⓑ 컨셉 — "확장은 번들에 정적으로 들어 있고 셸이 뜨면 전부 켜진다."
 * ⓒ 의심 — `register(api)`가 생기면 이 자리가 그것과 겹친다. 확장의 `register`가 곧 활성화라면
 *          별도 스타트업 기여 지점이 남을 이유는 "확장이 아닌 커널 자신의 초기화"뿐이다.
 * ⓓ 판정 —
 */
export type WorkbenchStartupDescriptor = {
  readonly id: string;
  readonly token: Token<{ start(): void; stop(): void }>;
};

/* ------------------------------------------------------------------------ *
 * 4. 탭
 * ------------------------------------------------------------------------ */

/**
 * ## 4-1. 열린 탭 — `kind`가 그냥 문자열이다
 *
 * ⓐ 지금 — `{ id, kind: string, title }`. 확장이 자기 파일에 `export const X_TAB_KIND = "..."`를
 *          두고 조립부가 같은 문자열로 잇는다. 닫힌 유니온이 없다.
 * ⓑ 컨셉 — 텍스트·PDF·`.db`가 같은 모양으로 꽂힌다.
 * ⓒ 의심 — **컴파일 타임 보장이 0이다.** 문자열이 어긋나면 런타임에 탭이 빈다. 다만 확장을
 *          닫힌 집합으로 두면 "확장을 더해도 커널을 안 고친다"가 깨진다 — 열린 채로 두는 것이
 *          값일 수도 있다. `EditorContribution.tabKind`가 생기면 **신고와 등록을 같은 자리에서
 *          내므로** 어긋날 여지가 줄어든다.
 * ⓓ 판정 —
 */
export type OpenTab = {
  readonly id: string;
  readonly kind: string;
  readonly title: string;
};

export type PaneId = string;
export type TabSplitOrientation = "horizontal" | "vertical";

export type TabPaneLeaf = {
  readonly kind: "leaf";
  readonly id: PaneId;
  readonly tabs: readonly OpenTab[];
  readonly activeTabId: string | null;
  readonly size?: number;
};

export type TabPaneNode =
  | TabPaneLeaf
  | {
      readonly kind: "split";
      readonly id: PaneId;
      readonly orientation: TabSplitOrientation;
      readonly children: readonly TabPaneNode[];
      readonly size?: number;
    };

/**
 * ## 4-2. 탭 상태가 어디 사나 — **`localStorage`다**
 *
 * ⓐ 지금 — `TabsModel`이 `workbench.tabTree`·`workbench.activeLeafId`·`workbench.previewTabId`를
 *          브라우저에 적는다.
 * ⓑ 컨셉 — "**무엇이 열려 있었는지는 서버가 적는다.** 새로고침해도 탭이 그대로 돌아온다."
 *          그리고 "탭 목록은 한 벌이고 보여주는 법만 다르다."
 * ⓒ 의심 — **어긋난다.** 지금 모양이면 폰과 데스크톱이 다른 탭을 본다. 고치면 서버에 워크스페이스
 *          단위 상태가 새로 생기고, 설정처럼 밀어주는 통로가 필요해진다.
 * ⓓ 판정 —
 */
export interface ITabsModel {
  readonly tree: TabPaneNode;
  setTree(tree: TabPaneNode): void;
  readonly activeLeafId: PaneId;
  setActiveLeafId(id: PaneId): void;
  readonly previewTabId: string | null;
  setPreviewTabId(id: string | null): void;
  onDidChange(listener: () => void): Disposable;
}

/**
 * ## 4-3. 커널이 더티를 아는 통로, 그리고 그 반대
 *
 * ⓐ 지금 — `ITabDirtyState`(셸→확장, "이 탭이 더러운가")와 `IPinTab`(확장→셸, "이 경로 탭을
 *          고정해라") 둘이 있고, 조립부가 **클로저로** 잇는다.
 * ⓑ 컨셉 — "커널은 탭 안의 `URI`와 더티 여부만 안다."
 * ⓒ 의심 — `ITabDirtyState`는 컨셉과 정확히 맞는다. `IPinTab`은 방향이 반대라, `register(api)`가
 *          생기면 확장이 명령으로 등록하고 커널이 부르는 모양으로 접힐 수 있다 — 전용 포트가
 *          남아야 하는지가 물음이다.
 * ⓓ 판정 —
 */
export interface ITabDirtyState {
  isDirty(tabId: string): boolean;
  hasAnyDirty(): boolean;
  onDidChange(listener: () => void): Disposable;
}

export interface IPinTab {
  pin(path: string): void;
}

/* ------------------------------------------------------------------------ *
 * 5. 명령
 * ------------------------------------------------------------------------ */

/**
 * ## 5-1. 명령·컨텍스트·키바인딩·메뉴
 *
 * ⓐ 지금 — `ICommandCenterRegistry`가 넷을 한 자리에 묶고 `dispatchKeydown(pressed)`이 눌린 키로
 *          명령을 찾아 실행한다. `when`이 Action이 아니라 **트리거**(키바인딩·메뉴)에 붙어 있다 —
 *          같은 명령이라도 트리거마다 조건이 다르기 때문이다.
 * ⓑ 컨셉 — "명령 레지스트리 — 확장이 명령을 등록하고, 명령 팔레트와 단축키가 그 등록부를 읽는다."
 * ⓒ 의심 — **`ICommandCenterRegistry`가 `core`의 타입을 별칭으로 다시 편다.** 이유가 설계가 아니라
 *          린트다(`export type { X }` 재수출을 막는 규칙). 겹이 하나 더 있고, 그 겹이 존재하는
 *          이유를 코드만 보고는 알 수 없다.
 * ⓓ 판정 —
 */
export interface ActionDescriptor<TContext = unknown> extends Descriptor {
  readonly label: string;
  readonly execute: (context: TContext) => void;
}

export interface ContextDescriptor extends Descriptor {
  /** 점 네임스페이스 — `tab.active.format` 같은 것. */
  readonly atom: unknown;
}

export interface KeybindingDescriptor extends Descriptor {
  /** `ctrl+k` 형태. Ctrl과 Cmd를 둘 다 `ctrl`로 합친다. */
  readonly keybinding: string;
  readonly actionId: string;
  readonly when?: (ctx: Registry<ContextDescriptor>) => boolean;
}

export interface MenuItemDescriptor extends Descriptor {
  readonly menuId: string;
  readonly commandId: string;
  readonly when?: (ctx: Registry<ContextDescriptor>) => boolean;
  /** VSCode 스타일 정렬 그룹 — `1_create`·`9_danger`. */
  readonly group?: string;
  readonly order?: number;
}

/* ------------------------------------------------------------------------ *
 * 6. 커널이 드는 상태 — **"커널인가"부터가 판정 거리다**
 * ------------------------------------------------------------------------ */

/**
 * ## 6-1. 컨셉의 커널 여덟에 없는 것들
 *
 * 컨셉이 커널로 적은 것은 여덟이다 — 화면 뼈대 · 명령 레지스트리 · 설정 저장소 · 테마 토큰 ·
 * 워크스페이스와 `URI` · DI·이벤트 버스·extension host · 앱 수명 · 확장 등록.
 *
 * 그런데 지금 `workbench/model/`에는 그 밖의 것이 일곱 더 있다. 각각 **커널에 남을 자리가
 * 있는가**가 첫 물음이다.
 *
 * | 지금 있는 것 | 하는 일 | 컨셉의 어느 칸인가 | 의심 |
 * | --- | --- | --- | --- |
 * | `IThemeModel` | `light`/`dark` | 테마 토큰 | 값 둘뿐이다. 테마 *값*은 확장이 기여하기로 했는데 그 자리가 없다 |
 * | `ISettingsModel` | `{ density, agentConfirmWrites }` | 설정 저장소 | **고정 두 칸이다**(→ 2-3). `agentConfirmWrites`는 v1.0에 없는 에이전트의 것이다 |
 * | `IStorage` | `get`/`set` — localStorage | 없다 | 탭을 서버로 옮기면(→ 4-2) 이것이 남을 이유가 줄어든다 |
 * | `INotificationService` | `notify(severity, message)` | 없다 | 확장도 알림을 낸다. 커널이 맞아 보이지만 컨셉이 안 적었다 |
 * | `IErrorLog` | `report(error, source)` | 없다 | 위와 같다 |
 * | `IServerInfo` | `load()` — 버전·워크스페이스 이름 | 없다 | 전송 계약(다음 라운드)이 이 자리를 덮을 수 있다 |
 * | `IActivityModel` | 지금 고른 활동 | 화면 뼈대 | 뼈대의 일부로 접힐 수 있다 |
 *
 * ⓓ 판정 — (일곱 각각)
 */
export type KernelStateNeedsVerdict = never;

/* ------------------------------------------------------------------------ *
 * 7. 커널 여덟 중 계약이 아직 없는 것
 * ------------------------------------------------------------------------ */

/**
 * ## 7-1. 워크스페이스와 `URI`
 *
 * ⓐ 지금 — 클라이언트에 워크스페이스 계약이 **없다.** 경로는 어디서나 `string`이고 워크스페이스
 *          루트 기준 상대 경로라는 것이 주석 관례로만 있다. `contracts/common/uri.ts`에 `URI`
 *          클래스가 있지만 **리포 어디서도 안 쓴다.**
 * ⓑ 컨셉 — "워크스페이스와 `URI` — 모두가 같은 좌표계를 쓴다." 그리고 모델 규칙이
 *          "**경로는 문자열이 아니라 `URI`로 가리킨다**", "루트는 하나다", "루트는 서버 설정으로
 *          고정한다"로 못 박았다.
 * ⓒ 의심 — **컨셉이 `URI`를 쓰라고 했는데 코드는 전부 `string`이다.** 안 쓰는 `URI` 클래스가
 *          `contracts`에 놓여 있다. 셋 중 하나다 — 계약대로 `URI`로 바꾼다 / 컨셉을 상대 경로
 *          문자열로 고친다 / `URI`를 버린다.
 * ⓓ 판정 —
 */
export interface IWorkspace {
  /** 루트는 하나다. 서버 설정으로 고정되고 앱 안에서 바꾸지 않는다. */
  readonly root: string;
  readonly name: string;
}

/**
 * ## 7-2. 앱 수명
 *
 * ⓐ 지금 — 조립부 로컬 토큰으로 흩어져 있다 — `startup.unloadGuard`, `startup.globalErrorHandlers`,
 *          `reloadApp` 클로저.
 * ⓑ 컨셉 — "앱 수명 — 업데이트, 다시 시작." 그리고 전송 결정이 "**프로토콜 버전이 안 맞으면
 *          서버가 소켓을 끊고 새로고침시킨다. 더티 탭이 있으면 브라우저가 떠나기 전에 묻는다**"다.
 * ⓒ 의심 — 계약이 없어 이 결정을 걸 자리가 없다. `ITabDirtyState.hasAnyDirty`가 이미 절반이다.
 * ⓓ 판정 —
 */
export interface IAppLifetime {
  /** 새 버전이 떴다 — 더티가 있으면 사용자에게 묻고, 없으면 바로 새로고침한다. */
  requestReload(reason: "versionMismatch" | "userRequested"): void;
  onDidRequestReload(listener: (reason: string) => void): Disposable;
}

/* ------------------------------------------------------------------------ *
 * 8. 이번 초안이 다루지 않는 것
 * ------------------------------------------------------------------------ */

/**
 * - **전송 계약** — 소켓 메시지 틀, 연결 id 헤더, 재연결. 컨셉에 결정은 있으나 커널 계약과
 *   관심사가 다르다. 다음 라운드다.
 * - **확장 열셋의 계약** — 파일 시스템·탐색기·텍스트 에디터·프리뷰·검색·터미널의 Model/ViewModel.
 * - **판정에 따른 실제 이동** — `packages/*&#47;src/`를 고치는 것은 승인 뒤다.
 */
export type OutOfScope = never;
