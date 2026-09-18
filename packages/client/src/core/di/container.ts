import { CircularDependencyError, TokenNotRegisteredError } from "./errors";
import type { Token } from "./token";

/**
 * dispose 대상. 스코프가 정리될 때 자기가 만든 인스턴스 중 이걸 구현한 것만 부른다.
 *
 * **동기다.** `void | Promise<void>`였는데 비동기 정리를 하는 구현이 하나도 없었고(2026-09-14 실측),
 * 합집합 때문에 모든 `dispose()` 호출이 "버려진 Promise"로 보여 `no-floating-promises`가 여덟 번
 * 물었다. 비동기 정리가 필요해지면 그때 별도 타입을 만든다 — 컨테이너는 이미 `await`한다.
 */
export interface Disposable {
  dispose(): void;
}

/** `singleton`은 앱에 하나, `scoped`는 스코프마다 하나, `transient`는 조회할 때마다 새로. */
type Lifetime = "singleton" | "scoped" | "transient";

/** 무엇을 어떻게 만들지의 한 쌍. `create`는 컨테이너를 받아 자기 의존을 스스로 조회한다. */
interface Provider<T> {
  readonly lifetime: Lifetime;
  create(container: Container): T;
}

/** 조회는 등록된 스코프에서 시작해 부모로 거슬러 올라간다. */
export interface Container {
  register<T>(token: Token<T>, provider: Provider<T>): void;
  resolve<T>(token: Token<T>): T;
  /** 자식은 부모를 볼 수 있고 부모는 자식을 볼 수 없다. 형제끼리도 못 본다. */
  createScope(name: string): Container;
  /** 자식 스코프를 먼저 정리한 뒤 자기가 만든 Disposable을 역순으로 부른다. */
  dispose(): Promise<void>;
}

/** 앱에 하나. 스코프를 만들 때마다 부모를 가리키는 새 인스턴스가 생긴다. */
export function createContainer(name = "root"): Container {
  return new ContainerImpl(name, undefined);
}

/** 등록한 스코프에 한 번만 만들어 붙잡는다. 루트에 등록하면 앱에 하나다. */
export function singleton<T>(create: (c: Container) => T): Provider<T> {
  return { lifetime: "singleton", create };
}

/** **조회한** 스코프마다 따로 만든다 — 등록한 스코프가 아니다. 스코프가 정리되면 함께 dispose된다. */
export function scoped<T>(create: (c: Container) => T): Provider<T> {
  return { lifetime: "scoped", create };
}

/** 조회할 때마다 새로 만든다. 컨테이너가 붙잡지 않으므로 **dispose도 안 부른다.** */
export function transient<T>(create: (c: Container) => T): Provider<T> {
  return { lifetime: "transient", create };
}

/** 이미 만들어 둔 것을 그대로 등록한다 — 설정 객체나 밖에서 만든 자원에 쓴다. */
export function value<T>(instance: T): Provider<T> {
  return { lifetime: "singleton", create: () => instance };
}

function isDisposable(candidate: unknown): candidate is Disposable {
  return typeof candidate === "object" && candidate !== null && typeof (candidate as Disposable).dispose === "function";
}

class ContainerImpl implements Container {
  readonly #name: string;
  readonly #parent: ContainerImpl | undefined;
  readonly #providers = new Map<Token<unknown>, Provider<unknown>>();
  readonly #instances = new Map<Token<unknown>, unknown>();
  readonly #children = new Set<ContainerImpl>();
  /** 만든 순서대로 쌓고 dispose 때 역순으로 부른다 — 나중 것이 앞 것에 의존하므로. */
  readonly #disposables: Disposable[] = [];
  /** 지금 만들고 있는 토큰들. 여기 다시 들어오면 순환이다. */
  readonly #resolving: string[] = [];
  #disposed = false;

  constructor(name: string, parent: ContainerImpl | undefined) {
    this.#name = name;
    this.#parent = parent;
  }

  register<T>(token: Token<T>, provider: Provider<T>): void {
    // 자식에 같은 토큰을 다시 등록하면 그 스코프 안에서만 부모를 가린다(테스트 대역).
    this.#providers.set(token as Token<unknown>, provider as Provider<unknown>);
  }

  resolve<T>(token: Token<T>): T {
    const owner = this.#findOwner(token);
    if (!owner) {
      throw new TokenNotRegisteredError(token.description);
    }

    const provider = owner.#providers.get(token as Token<unknown>) as Provider<T>;

    // singleton은 등록된 스코프가, scoped는 요청한 스코프가 인스턴스를 보관한다.
    // transient는 아무도 보관하지 않는다.
    const cacheHolder = provider.lifetime === "singleton" ? owner : provider.lifetime === "scoped" ? this : undefined;

    if (cacheHolder && cacheHolder.#instances.has(token as Token<unknown>)) {
      return cacheHolder.#instances.get(token as Token<unknown>) as T;
    }

    return this.#create(token, provider, cacheHolder);
  }

  createScope(name: string): Container {
    const child = new ContainerImpl(name, this);
    this.#children.add(child);
    return child;
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;

    for (const child of this.#children) {
      await child.dispose();
    }
    this.#children.clear();

    // `Disposable.dispose()`는 동기다 — `await`를 두면 `await-thenable`이 문다.
    for (let i = this.#disposables.length - 1; i >= 0; i -= 1) {
      this.#disposables[i]?.dispose();
    }
    this.#disposables.length = 0;
    this.#instances.clear();

    if (this.#parent) {
      this.#parent.#children.delete(this);
    }
  }

  #create<T>(token: Token<T>, provider: Provider<T>, cacheHolder: ContainerImpl | undefined): T {
    if (this.#resolving.includes(token.description)) {
      throw new CircularDependencyError([...this.#resolving, token.description]);
    }

    this.#resolving.push(token.description);
    try {
      const instance = provider.create(this);
      if (cacheHolder) {
        cacheHolder.#instances.set(token as Token<unknown>, instance);
        if (isDisposable(instance)) {
          cacheHolder.#disposables.push(instance);
        }
      }
      return instance;
    } finally {
      this.#resolving.pop();
    }
  }

  /** 자기부터 위로 올라가며 토큰을 등록한 스코프를 찾는다. */
  #findOwner(token: Token<unknown>): ContainerImpl | undefined {
    let current: ContainerImpl | undefined = this;
    while (current) {
      if (current.#providers.has(token)) return current;
      current = current.#parent;
    }
    return undefined;
  }

  toString(): string {
    return `Container(${this.#name})`;
  }
}
