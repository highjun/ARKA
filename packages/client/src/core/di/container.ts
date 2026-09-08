import { CircularDependencyError, TokenNotRegisteredError } from "./errors";
import type { Token } from "./token";

/** dispose 대상. 스코프가 정리될 때 자기가 만든 인스턴스 중 이걸 구현한 것만 부른다. */
export interface Disposable {
  dispose(): void | Promise<void>;
}

export type Lifetime = "singleton" | "scoped" | "transient";

export interface Provider<T> {
  readonly lifetime: Lifetime;
  create(container: Container): T;
}

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

export function singleton<T>(create: (c: Container) => T): Provider<T> {
  return { lifetime: "singleton", create };
}

export function scoped<T>(create: (c: Container) => T): Provider<T> {
  return { lifetime: "scoped", create };
}

export function transient<T>(create: (c: Container) => T): Provider<T> {
  return { lifetime: "transient", create };
}

export function value<T>(instance: T): Provider<T> {
  return { lifetime: "singleton", create: () => instance };
}

function isDisposable(candidate: unknown): candidate is Disposable {
  return (
    typeof candidate === "object" &&
    candidate !== null &&
    typeof (candidate as Disposable).dispose === "function"
  );
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
    this.#providers.set(
      token as Token<unknown>,
      provider as Provider<unknown>,
    );
  }

  resolve<T>(token: Token<T>): T {
    const owner = this.#findOwner(token);
    if (!owner) {
      throw new TokenNotRegisteredError(token.description);
    }

    const provider = owner.#providers.get(token as Token<unknown>) as Provider<T>;

    // singleton은 등록된 스코프가, scoped는 요청한 스코프가 인스턴스를 보관한다.
    // transient는 아무도 보관하지 않는다.
    const cacheHolder =
      provider.lifetime === "singleton"
        ? owner
        : provider.lifetime === "scoped"
          ? this
          : undefined;

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

    for (let i = this.#disposables.length - 1; i >= 0; i -= 1) {
      await this.#disposables[i]?.dispose();
    }
    this.#disposables.length = 0;
    this.#instances.clear();

    if (this.#parent) {
      this.#parent.#children.delete(this);
    }
  }

  #create<T>(
    token: Token<T>,
    provider: Provider<T>,
    cacheHolder: ContainerImpl | undefined,
  ): T {
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
