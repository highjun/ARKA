import { CircularDependencyError, ContainerDisposedError, InstanceNotRegisteredError } from "./errors";
import type { InstanceId, InstanceMap } from "./instanceMap";

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

/** 무엇을 어떻게 만들지의 한 쌍. `create`는 컨테이너를 받아 자기 의존을 스스로 조회한다. */
interface Provider<K extends InstanceId> {
  readonly lifetime: Lifetime;
  readonly create: (container: Container) => InstanceMap[K];
}

const isDisposable = (candidate: unknown): candidate is Disposable =>
  typeof candidate === "object" && candidate !== null && typeof (candidate as Disposable).dispose === "function";

/** 확장끼리 만나는 유일한 통로. 자식은 부모를 보고 부모는 자식을 못 본다. */
export class Container {
  readonly #name: string;
  readonly #parent: Container | undefined;
  readonly #providers = new Map<InstanceId, Provider<InstanceId>>();
  readonly #instances = new Map<InstanceId, unknown>();
  readonly #children = new Set<Container>();
  /** 만든 순서대로 쌓고 dispose 때 역순으로 부른다 — 나중 것이 앞 것에 의존하므로. */
  readonly #disposables: Disposable[] = [];
  /** 지금 만들고 있는 id들. 여기 다시 들어오면 순환이다. */
  readonly #resolving: InstanceId[] = [];
  #disposed = false;

  /** 부모 없이 만들면 루트다. 자식은 `createChild`로만 난다. */
  constructor(name = "root", parent?: Container) {
    this.#name = name;
    this.#parent = parent;
  }

  /** 만드는 법을 물린다. 아직 만들지 않는다. 자식 컨테이너에서 다시 물리면 부모 것을 가린다 — 테스트 대역이 이 자리다. */
  register<K extends InstanceId>(id: K, lifetime: Lifetime, create: (container: Container) => InstanceMap[K]): void {
    this.#providers.set(id, { lifetime, create });
  }

  /**
   * 꺼낸다. 없으면 만들고, 수명에 따라 붙잡는다.
   * @throws InstanceNotRegisteredError 지도에는 있으나 아무도 물리지 않았다.
   * @throws CircularDependencyError 만들어지는 중에 서로를 물고 돌았다.
   * @throws ContainerDisposedError 이미 죽은 컨테이너에서 꺼내려 했다.
   */
  resolve<K extends InstanceId>(id: K): InstanceMap[K] {
    if (this.#disposed) throw new ContainerDisposedError(this.#name);
    const owner = this.#findOwner(id);
    if (owner === undefined) throw new InstanceNotRegisteredError(id);

    const provider = owner.#providers.get(id) as Provider<K>;
    // singleton은 등록한 컨테이너가, scoped는 꺼낸 컨테이너가 인스턴스를 보관한다. transient는 아무도.
    const cacheHolder = provider.lifetime === "singleton" ? owner : provider.lifetime === "scoped" ? this : undefined;
    if (cacheHolder !== undefined && cacheHolder.#instances.has(id))
      return cacheHolder.#instances.get(id) as InstanceMap[K];

    return this.#create(id, provider, cacheHolder);
  }

  /** 자식 컨테이너를 딴다. 탭이 그 예다 — 탭 목록을 쥔 쪽이 따고, 목록에서 빠질 때 dispose한다. */
  createChild(name: string): Container {
    const child = new Container(name, this);
    this.#children.add(child);
    return child;
  }

  /** 자식 컨테이너를 먼저 정리한 뒤 자기가 만든 Disposable을 역순으로 부른다. 부모의 목록에서도 빠진다. 두 번 불러도 안전하다. */
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;

    for (const child of [...this.#children]) child.dispose();
    this.#children.clear();

    for (let i = this.#disposables.length - 1; i >= 0; i -= 1) this.#disposables[i]?.dispose();
    this.#disposables.length = 0;
    this.#instances.clear();

    if (this.#parent !== undefined) this.#parent.#children.delete(this);
  }

  /** 이름을 그대로 — 오류 메시지와 디버거가 읽는다. */
  toString(): string {
    return `Container(${this.#name})`;
  }

  #create<K extends InstanceId>(id: K, provider: Provider<K>, cacheHolder: Container | undefined): InstanceMap[K] {
    if (this.#resolving.includes(id)) throw new CircularDependencyError([...this.#resolving, id]);

    this.#resolving.push(id);
    try {
      const instance = provider.create(this);
      if (cacheHolder !== undefined) {
        cacheHolder.#instances.set(id, instance);
        if (isDisposable(instance)) cacheHolder.#disposables.push(instance);
      }
      return instance;
    } finally {
      this.#resolving.pop();
    }
  }

  /** 자기부터 위로 올라가며 id를 물린 컨테이너를 찾는다. */
  #findOwner(id: InstanceId): Container | undefined {
    let current: Container | undefined = this;
    while (current !== undefined) {
      if (current.#providers.has(id)) return current;
      current = current.#parent;
    }
    return undefined;
  }
}
