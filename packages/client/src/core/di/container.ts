import {
  CircularDependencyError,
  ContainerDisposedError,
  InstanceAlreadyRegisteredError,
  InstanceNotRegisteredError,
} from "./errors";
import type { InstanceId, InstanceMap } from "./instanceMap";

export interface Disposable {
  dispose(): void;
}

export type Lifetime = "singleton" | "scoped" | "transient";

interface Provider<K extends InstanceId> {
  readonly lifetime: Lifetime;
  readonly create: (container: Container) => InstanceMap[K];
}

const isDisposable = (candidate: unknown): candidate is Disposable =>
  typeof candidate === "object" && candidate !== null && typeof (candidate as Disposable).dispose === "function";

export class Container {
  readonly #name: string;
  readonly #parent: Container | undefined;
  readonly #providers = new Map<InstanceId, Provider<InstanceId>>();
  readonly #instances = new Map<InstanceId, unknown>();
  readonly #children = new Set<Container>();
  readonly #disposables: Disposable[] = [];
  readonly #resolving: InstanceId[] = [];
  #disposed = false;
  #disposing = false;

  constructor(name = "root", parent?: Container) {
    this.#name = name;
    this.#parent = parent;
  }

  register<K extends InstanceId>(id: K, lifetime: Lifetime, create: (container: Container) => InstanceMap[K]): void {
    if (this.#disposed) throw new ContainerDisposedError(this.#name);
    if (this.#providers.has(id)) throw new InstanceAlreadyRegisteredError(id);
    this.#providers.set(id, { lifetime, create });
  }

  resolve<K extends InstanceId>(id: K): InstanceMap[K] {
    if (this.#disposed) throw new ContainerDisposedError(this.#name);
    const owner = this.#findOwner(id);
    if (owner === undefined) throw new InstanceNotRegisteredError(id);

    const provider = owner.#providers.get(id) as Provider<K>;
    const host = provider.lifetime === "singleton" ? owner : this;
    const cacheHolder = provider.lifetime === "transient" ? undefined : host;
    if (cacheHolder !== undefined && cacheHolder.#instances.has(id))
      return cacheHolder.#instances.get(id) as InstanceMap[K];

    return host.#create(id, provider, cacheHolder);
  }

  createChild(name: string): Container {
    if (this.#disposed) throw new ContainerDisposedError(this.#name);
    const child = new Container(name, this);
    this.#children.add(child);
    return child;
  }

  dispose(): void {
    if (this.#disposed || this.#disposing) return;
    this.#disposing = true;

    for (const child of [...this.#children]) child.dispose();
    this.#children.clear();

    for (let i = this.#disposables.length - 1; i >= 0; i -= 1) this.#disposables[i]?.dispose();
    this.#disposables.length = 0;
    this.#instances.clear();

    if (this.#parent !== undefined) this.#parent.#children.delete(this);
    this.#disposed = true;
  }

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

  #findOwner(id: InstanceId): Container | undefined {
    let current: Container | undefined = this;
    while (current !== undefined) {
      if (current.#providers.has(id)) return current;
      current = current.#parent;
    }
    return undefined;
  }
}
