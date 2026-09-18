# Core - `packages/client/src/core/`

커널이 기본적으로 제공하는 계약이다.
커널에 대한 UI는 [workbench.md](./workbench.md)에서 따로 제시한다.

---

## `core/errors` — 오류

```ts
/**
 * 커널이 내는 모든 오류의 부모 클래스. `instanceof CoreError` 하나로 커널 오류를 가려낸다.
 * 하위 클래스는 `name`을 따로 적지 않아도 자기 클래스 이름을 갖는다.
 */
export declare class CoreError extends Error {
  constructor(message: string);
}
```

## `core/registry` — 기여 지점

```ts
/** 등록되는 것의 최소 모양. id로 담고 id로 찾는다. */
export interface Descriptor {
  readonly id: string;
}

/**
 * 확장이 꽂히는 자리. 담고 찾는 일만 한다 — 실행은 descriptor를 해석하는 쪽의 일이다.
 * 레지스트리 자체가 `InstanceMap`에 올라 있어 확장이 꺼내서 직접 `add`한다.
 * **`add`는 `activate` 안에서만 부른다** — 부팅 뒤로 안 변하므로 등록 취소가 없다.
 */
export declare class Registry<TDescriptor extends Descriptor> {
  /**
   * 지금 켜는 중인 확장의 id가 같이 기록된다 — 메뉴 묶음이 이것으로 갈린다.
   * @throws DescriptorDuplicatedIdError 같은 id가 이미 있다. 조용한 덮어쓰기가 더 나쁘다.
   */
  add(descriptor: TDescriptor): void;
  /** @throws DescriptorNotFoundError 그 id가 없다. */
  get(id: string): TDescriptor;
  tryGet(id: string): TDescriptor | undefined;
  list(): readonly TDescriptor[];
}

/** `Registry.get`이 없는 id를 받았다. */
export declare class DescriptorNotFoundError extends CoreError {
  readonly id: string;
}

/** `Registry.add`가 이미 있는 id를 받았다. */
export declare class DescriptorDuplicatedIdError extends CoreError {
  readonly id: string;
}
```

## `core/di` — 컨테이너

확장은 서로를 참조하지 않는다. 필요한 것은 컨테이너에서 문자열 id로 꺼내고, 그 id가 어떤 타입인지는 `InstanceMap`이 안다.

컨테이너가 객체를 관리할 때 중요한 것 하나는 **무엇이 언제까지 사는지**다. 같은 수명을 갖는 인스턴스끼리 컨테이너 하나에 산다.
- **루트 컨테이너** — 앱이 시작해 끝날 때까지 산다. 부팅 코드가 든다
- **자식 컨테이너** — 루트에서 필요에 따라 `createChild`로 만들고, 부모 컨테이너에 등록해 관리한다. 부모가 죽으면 같이 죽는다. 그 전에 죽이는 것은 만든 쪽이다 — 탭이면 탭 목록을 쥔 서비스가, 목록에서 빠질 때 `dispose`한다

등록은 **부팅 때 루트에서 한 번**이다(`provides`). 자식 컨테이너는 그 뒤에 생긴다. 그래서 등록할 때 **어느 컨테이너에 만들지**를 `Lifetime`으로 적는다 — `singleton`은 등록한 컨테이너에 하나, `scoped`는 꺼낸 자식 컨테이너마다 하나.

```ts
/**
 * id와 계약을 잇는 지도. **비어 있는 채로 시작하고 각 확장이 자기 자리에서 한 줄씩 더한다.**
 *
 * ```ts
 * declare module "#core/di" {
 *   interface InstanceMap {
 *     "arka.filesystem": IFileSystem;
 *   }
 * }
 * ```
 *
 * 키는 `arka.<확장>.<이름>`으로 짓는다 — 전역 이름 공간이라 겹치면 조용히 덮인다.
 * 같은 키에 서로 다른 타입을 선언하면 그것은 TypeScript가 잡는다.
 */
export interface InstanceMap {}

/** 컨테이너가 꺼낼 수 있는 id 전부. 오타는 여기서 걸린다. */
export type InstanceId = keyof InstanceMap;

/**
 * 지울 때 별도의 정리가 필요한 객체.
 *
 * **정리는 동기다.** 기다려야 하는 일은 `dispose` 전에 끝낸다 — 더티인 탭은 닫기 전에 확인을
 * 구하므로 이 시점에 흘려보낼 것이 없다. 밖으로 나가는 정리(구독 해지·세션 닫기)는 보내고 잊는다.
 * 비동기로 열면 `Container.dispose()`가 기다려야 해서 **탭 닫기가 네트워크에 묶인다.**
 */
export interface Disposable {
  dispose(): void;
}

/**
 * 어느 컨테이너에 만들어 붙잡나.
 *
 * - `singleton` — **등록한** 컨테이너에 한 번만 만들어 붙잡는다. 루트에 등록하면 앱에 하나다.
 * - `scoped` — **꺼낸** 자식 컨테이너마다 따로 만든다. 등록한 컨테이너가 아니다. 탭마다 하나여야 하는 것이 이것이다.
 * - `transient` — 조회할 때마다 새로. 컨테이너가 붙잡지 않으므로 `dispose`도 안 부른다.
 */
export type Lifetime = "singleton" | "scoped" | "transient";

/** 확장끼리 만나는 유일한 통로. 자식은 부모를 보고 부모는 자식을 못 본다. */
export declare class Container {
  constructor(name?: string);

  /** 만드는 법을 물린다. 아직 만들지 않는다. 자식 컨테이너에서 다시 물리면 부모 것을 가린다 — 테스트 대역이 이 자리다. */
  register<K extends InstanceId>(
    id: K,
    lifetime: Lifetime,
    create: (container: Container) => InstanceMap[K],
  ): void;

  /**
   * @throws InstanceNotRegisteredError 지도에는 있으나 아무도 물리지 않았다.
   * @throws CircularDependencyError 만들어지는 중에 서로를 물고 돌았다.
   * @throws ContainerDisposedError 이미 죽은 컨테이너에서 꺼내려 했다.
   */
  resolve<K extends InstanceId>(id: K): InstanceMap[K];

  /** 자식 컨테이너를 딴다. 탭이 그 예다 — 탭 목록을 쥔 쪽이 따고, 목록에서 빠질 때 dispose한다. */
  createChild(name: string): Container;

  /** 자식 컨테이너를 먼저 정리한 뒤 자기가 만든 Disposable을 역순으로 부른다. 부모의 목록에서도 빠진다. 두 번 불러도 안전하다. */
  dispose(): void;
}

/** `Container.resolve`가 지도에는 있으나 아무도 물리지 않은 id를 받았다. */
export declare class InstanceNotRegisteredError extends CoreError {
  readonly id: InstanceId;
}

/** 둘 이상이 만들어지는 중에 서로를 물고 돌았다. `path`가 돈 순서다 — id가 곧 이름이라 그대로 읽힌다. */
export declare class CircularDependencyError extends CoreError {
  readonly path: readonly InstanceId[];
}

/**
 * 이미 dispose된 컨테이너에서 꺼내려 했다. 늦게 온 콜백이 죽은 탭을 건드린 것이다.
 *
 * 부모 것을 대신 주지 않는다 — 죽은 탭의 일을 살아 있는 앱에 대고 하게 된다.
 */
export declare class ContainerDisposedError extends CoreError {
  /** `createChild`에 준 이름. 어느 탭이 죽었는지 그대로 읽힌다. */
  readonly containerName: string;
}
```

## `core/events` — 알림

전역 이벤트 버스를 두지 않는다. 확장끼리는 `InstanceMap`의 id로 만나고, 상태 변화는 **발행자가 쥔** Emitter로 낸다 — 사건 하나에 주인 하나다.

```ts
/** 값을 받는 쪽. */
export type Listener<T> = (value: T) => void;

/** 값이 바뀌었다고 알리는 최소 장치. Model이 자기 것을 쥐고 `onDidChange`로 내놓는다. */
export declare class Emitter<T = void> {
  /** 돌려받은 `dispose()`를 부르면 끊긴다. */
  readonly event: (listener: Listener<T>) => Disposable;
  fire(value: T): void;
  dispose(): void;
}
```

## `core/commands` — 명령과 트리거

명령은 **트리거를 모른다** — 팔레트에서 불리든 키로 불리든 같은 것이다.
- 조건(`when`)은 트리거 쪽에 붙는다. 같은 명령이라도 키로 부를 때와 메뉴에서 부를 때 조건이 다르기 때문이다.

바깥에서 보는 것은 `ICommandService` 하나다 — 네 등록부가 `InstanceMap`에 따로 오르지 않아 "넷이 한 벌"이 구조로 보장된다.
조건을 푸는 일도 여기 있다. 등록부와 문맥을 짝지어 넘기는 자리를 남기면 엉뚱한 짝을 넘길 수 있다.

```ts
/**
 * 이름 붙은 동작 하나. `when`이 없다 — 조건은 트리거가 든다.
 *
 * 바로 끝내거나(저장·닫기) 상호작용을 시작한다(새 파일·이름 바꾸기). 어느 쪽이든 **결과를 돌려주지도
 * 기다리지도 않는다.** 시작한 상호작용은 상태와 화면이 이어받는다.
 */
export interface ActionDescriptor<TContext = unknown> extends Descriptor {
  readonly label: string;
  readonly execute: (context: TContext) => void;
}

/** 트리거가 조건을 물어보는 값. id는 점 네임스페이스다 — `tab.active.kind`. */
export interface ContextDescriptor extends Descriptor {
  /** 값이 아니라 읽는 법을 등록한다. 트리거가 `when`을 풀 때마다 다시 읽는다. */
  readonly value: () => unknown;
}

/** 키 하나에 명령 하나. `id`는 등록 자체의 식별자다 — 키 문자열도 명령 id도 아니다. */
export interface KeybindingDescriptor extends Descriptor {
  /** `ctrl+k` 형태. Ctrl과 Cmd를 둘 다 `ctrl`로 합친다. */
  readonly keybinding: string;
  readonly actionId: string;
  readonly when?: (ctx: Registry<ContextDescriptor>) => boolean;
}

/**
 * 메뉴 한 자리에 명령 하나.
 *
 * 정렬 그룹이 없다. **어느 확장이 냈는지가 곧 묶음**이라 커널이 이미 안다 — `add`될 때 켜는 중인
 * 확장의 id가 기록된다. 구분선은 확장이 바뀌는 자리에 긋고, 묶음 순서는 배럴 순서다.
 */
export interface MenuItemDescriptor extends Descriptor {
  /** 어느 메뉴에 기여하는지 — `explorer.context`·`shell.tab.context`. */
  readonly menuId: string;
  readonly actionId: string;
  readonly when?: (ctx: Registry<ContextDescriptor>) => boolean;
  /** 같은 확장이 낸 것들 사이의 순서. */
  readonly order?: number;
}

/**
 * 브라우저 키 이벤트를 `ctrl+alt+shift+key` 순서의 한 문자열로 만든다.
 *
 * 등록부를 보지 않는 순수 함수라 서비스에 얹지 않는다. 부를 곳은 **키를 눌러 단축키를 지정하는
 * 화면 하나**다 — 평소 경로는 `dispatchKeydown`이 안에서 한다.
 */
export declare function normalizeKeybinding(event: KeyboardEvent): string;

/**
 * 네 등록부를 함께 들고 **실행까지 하는** 자리. 확장은 이것 하나만 안다.
 *
 * 담는 것은 각 확장이 `activate`에서 `actions.add(…)`로 한다. 여기는 담긴 것을 **부르는** 일만 더한다.
 */
export interface ICommandService {
  readonly actions: Registry<ActionDescriptor>;
  readonly contexts: Registry<ContextDescriptor>;
  /** 확장이 기여한 **기본값**. 사용자 재정의는 `overrides`가 든다 — 여기는 안 변한다. */
  readonly keybindings: Registry<KeybindingDescriptor>;
  readonly menus: Registry<MenuItemDescriptor>;

  /** 사용자 재정의 전부 — `actionId → 키`. `null`이면 기본값을 꺼 둔 것이다. */
  readonly overrides: ReadonlyMap<string, string | null>;
  /** 재정의를 쓴다. `settings.json`에 남고 `matchKeybinding`이 곧바로 이것을 먼저 본다. */
  setKeybinding(actionId: string, keybinding: string | null): void;

  /** 눌린 키에 맞고 조건을 통과하는 키바인딩. **재정의를 먼저 본다.** 없으면 `undefined`. */
  matchKeybinding(event: KeyboardEvent): KeybindingDescriptor | undefined;
  /** 그 메뉴에 붙고 조건을 통과하는 항목들. 확장 순서·`order` 순으로 정렬돼 온다. */
  matchMenuItems(menuId: string): readonly MenuItemDescriptor[];

  /** 실행했으면 `true` — 전역 keydown 리스너가 이 값으로 `preventDefault` 여부를 정한다. */
  dispatchKeydown(event: KeyboardEvent): boolean;
  /** 팔레트·메뉴·상태 칸이 부른다. 실행 중 던진 것은 여기서 잡아 알림으로 낸다. */
  execute(actionId: string, context?: unknown): void;
}
```

## `core/settings` — 설정

스키마는 확장이 기여하고 값은 커널이 `settings.json`에 든다. 설정 화면은 스키마를 보고 그린다.

```ts
/** 확장이 더하는 설정 한 칸. */
export interface SettingsDescriptor extends Descriptor {
  readonly title: string;
  readonly type: "boolean" | "number" | "string" | "enum";
  readonly default: unknown;
  /** `type`이 `enum`일 때만. */
  readonly options?: readonly string[];
  /** 화면 폭에 따라 값이 갈리는가. 설정에 "기기" 개념을 두지 않기로 한 결정의 대응물이다. */
  readonly byViewportWidth?: boolean;
}

/**
 * 스키마를 들고 값을 읽고 쓴다. 확장은 `activate`에서 `schema.add(…)`로 자기 칸을 더한다.
 *
 * 값은 서버 한 곳에 산다 — 기기별 값을 두지 않고, 화면 폭에 따라 갈리는 값만 둔다.
 */
export interface ISettings {
  readonly schema: Registry<SettingsDescriptor>;
  /** 등록 안 된 id면 던진다. 값이 없으면 스키마의 `default`. */
  get<T>(id: string): T;
  set(id: string, value: unknown): void;
  onDidChange(listener: (id: string) => void): Disposable;
}
```

## `core/viewmodel` — 화면과 컨테이너를 잇는 자리

ViewModel은 **MobX observable인 클래스**다.
- 구현이 생성자에서 `makeAutoObservable(this)`을 부른다
- `view/`는 `observer(...)`로 감싼다

```ts
/**
 * 컨테이너를 React 트리에 싣는다. **실어 나르는 것은 ViewModel이 아니라 컨테이너다.**
 *
 * 루트에 한 번, 탭마다 한 번 더 겹친다 — 안쪽이 바깥을 가리므로 그 아래 `useViewModel`은
 * 그 탭의 컨테이너에서 꺼낸다. **컨테이너를 만들지도 죽이지도 않는다** — 받아서 내려 줄 뿐이다.
 */
export declare const ContainerProvider: ComponentType<{
  readonly container: Container;
  readonly children: ReactNode;
}>;

/**
 * ViewModel을 꺼낸다. `view/`가 부를 수 있는 유일한 훅이다.
 * 인스턴스를 그대로 준다 — 다시 그리는 일은 전부 `observer()`가 한다.
 */
export declare function useViewModel<K extends InstanceId>(id: K): InstanceMap[K];
```

컨테이너를 꺼내 주는 훅은 없다. 서비스가 필요한 화면은 **VM이 생성자로 받는다.** 훅이 받는 것은
`InstanceId` 전부라 타입이 막아 주지 않는다 — 이건 린트가 지킨다(→ ADR 0007).

구현이 지키는 규칙 셋. 계약에 적히지 않으므로 여기 적어 둔다.

- **Model 구독은 생성자에서 걸고 `dispose()`에서 푼다.** 마운트 생명주기를 따로 두지 않는다 —
  탭의 자식 컨테이너가 이미 그 수명이고, 컨테이너가 죽을 때 역순으로 `dispose`가 불린다
- **공개 getter는 plain 데이터를 준다.** 목록은 `get`이 만든 **새 배열**이어야 한다. observable 배열을
  `component/`에 넘기면 읽기가 `observer` 밖에서 일어나 **조용히 안 바뀐다**
- **내부 상태에 `#private`을 쓰지 않는다.** MobX가 `#` 필드를 볼 수 없어 observable로 만들지 못한다.
  가릴 것은 TS `private`으로 쓴다

## `core/extensions` — 확장을 꽂는 자리

확장이 꽂힐 자리(레지스트리)는 전부 `InstanceMap`에 올라 있다. 확장은 그것을 꺼내서 직접 `add`한다.
그래서 **커널은 기여의 모양을 모른다** — 무엇을 꽂을 수 있는지는 `workbench/`가 `InstanceMap`에 올리는 것으로 정한다.
기여 지점을 하나 더해도 커널은 안 바뀐다.

```ts
/**
 * 확장 하나. **커널과 만나는 면이 이 값 하나다.**
 *
 * 매니페스트를 따로 두지 않는다 — 확장이 번들에 정적으로 들어 있고 셸이 뜨면 전부 켜지므로
 * "코드를 켜기 전에 읽어야 하는 것"이 없다.
 */
export interface ExtensionModule {
  readonly id: string;
  // 1단계 — 자기 서비스와 ViewModel을 지도에 물린다. 여기서는 아무것도 꺼내지 않는다
  readonly provides?: readonly Registration[];
  // 2단계 — 꽂힐 자리를 꺼내 add한다. 모든 확장의 provides가 끝난 뒤라 여기서는 꺼내도 된다.
  //          부팅 때 돌아야 하는 것(파일 감시·소켓)은 여기서 resolve하면 그때 만들어져 켜진다
  readonly activate?: (container: Container) => void;
}

/** 물릴 것 하나. id와 타입이 `InstanceMap`에서 짝지어 움직인다. */
export type Registration = {
  [K in InstanceId]: {
    readonly id: K;
    readonly lifetime: Lifetime;
    readonly create: (container: Container) => InstanceMap[K];
  };
}[InstanceId];

/**
 * 확장 전부를 켠다. 셸이 그려지기 전에 한 번 돈다.
 *
 * 두 단계로 돈다 — 모든 확장의 `provides`를 먼저 물리고, 그 뒤에 `activate`를 차례로 부른다.
 * 그래서 반쯤 지어진 컨테이너를 보는 확장이 없다.
 *
 * 하나가 던져도 멈추지 않는다 — 그 확장만 실패 목록에 오르고 나머지는 그대로 뜬다.
 * 던진 시점까지 `add`한 것은 남는다. `add`가 던지는 경우는 id 중복뿐이라 부팅 때 바로 드러난다.
 *
 * 배럴 순서가 곧 등록 순서다. 기여 지점은 등록만 하고 실행하지 않으므로 순서에 뜻이 없다.
 */
export declare function activateExtensions(
  modules: readonly ExtensionModule[],
  container: Container,
): ActivationResult;

/** 켜기 결과. 셸은 이것을 보고 실패를 알린다. */
export interface ActivationResult {
  readonly activated: readonly string[];
  readonly failed: readonly ExtensionActivationFailure[];
}

/** 켜다 실패한 확장 하나. 조용히 빠지면 왜 메뉴가 없는지 알 길이 없다. */
export interface ExtensionActivationFailure {
  readonly id: string;
  // 어느 단계에서 터졌나 — 지도에 무는 중인지, 꽂는 중인지
  readonly phase: "provides" | "activate";
  readonly error: Error;
}
```
