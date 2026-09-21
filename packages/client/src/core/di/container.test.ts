import { describe, expect, it, vi } from "vitest";
import { CircularDependencyError, Container, ContainerDisposedError, InstanceNotRegisteredError } from "#core/di";

declare module "#core/di" {
  interface InstanceMap {
    "test.counter": { readonly id: number };
    "test.disposable": { dispose: () => void };
    "test.first": object;
    "test.second": object;
    "test.a": object;
    "test.b": object;
    "test.self": object;
    "test.leaf": { readonly id: number };
    "test.branch": { readonly leaf: { readonly id: number } };
    "test.host": { readonly host: Container };
    "test.scopedLeaf": { readonly id: number };
  }
}

describe("Container", () => {
  describe("수명", () => {
    it("singleton은 몇 번을 조회해도 한 번만 만든다", () => {
      const create = vi.fn(() => ({ id: 1 }));
      const c = new Container();
      c.register("test.counter", "singleton", create);

      expect(c.resolve("test.counter")).toBe(c.resolve("test.counter"));
      expect(create).toHaveBeenCalledTimes(1);
    });

    it("transient는 조회할 때마다 새로 만든다", () => {
      const c = new Container();
      let next = 0;
      c.register("test.counter", "transient", () => ({ id: (next += 1) }));

      expect(c.resolve("test.counter")).not.toBe(c.resolve("test.counter"));
    });

    it("scoped는 꺼낸 자식 컨테이너마다 하나씩 만든다", () => {
      const c = new Container();
      c.register("test.counter", "scoped", () => ({ id: 1 }));
      const a = c.createChild("a");
      const b = c.createChild("b");

      expect(a.resolve("test.counter")).toBe(a.resolve("test.counter"));
      expect(a.resolve("test.counter")).not.toBe(b.resolve("test.counter"));
    });
  });

  describe("자식 컨테이너", () => {
    it("자식은 부모에 등록된 것을 본다", () => {
      const c = new Container();
      c.register("test.counter", "singleton", () => ({ id: 1 }));

      expect(c.createChild("child").resolve("test.counter").id).toBe(1);
    });

    it("부모는 자식에 등록된 것을 못 본다", () => {
      const c = new Container();
      c.createChild("child").register("test.counter", "singleton", () => ({ id: 1 }));

      expect(() => c.resolve("test.counter")).toThrow(InstanceNotRegisteredError);
    });

    it("형제끼리는 서로를 못 본다", () => {
      const c = new Container();
      const a = c.createChild("a");
      const b = c.createChild("b");
      a.register("test.counter", "singleton", () => ({ id: 1 }));

      expect(() => b.resolve("test.counter")).toThrow(InstanceNotRegisteredError);
    });

    it("자식에 같은 id를 다시 물리면 그 안에서만 부모를 가린다", () => {
      const c = new Container();
      c.register("test.counter", "singleton", () => ({ id: 1 }));
      const child = c.createChild("child");
      child.register("test.counter", "singleton", () => ({ id: 2 }));

      expect(child.resolve("test.counter").id).toBe(2);
      expect(c.resolve("test.counter").id).toBe(1);
    });

    it("물리지 않은 id는 InstanceNotRegisteredError에 id를 담아 던진다", () => {
      const c = new Container();

      expect(() => c.resolve("test.counter")).toThrow(InstanceNotRegisteredError);
      expect(() => c.resolve("test.counter")).toThrow('"test.counter"');
    });
  });

  describe("dispose", () => {
    it("자기가 만든 Disposable을 정리한다", () => {
      const dispose = vi.fn();
      const c = new Container();
      c.register("test.disposable", "singleton", () => ({ dispose }));
      c.resolve("test.disposable");

      c.dispose();

      expect(dispose).toHaveBeenCalledTimes(1);
    });

    it("만든 적 없으면 부르지 않는다", () => {
      const dispose = vi.fn();
      const c = new Container();
      c.register("test.disposable", "singleton", () => ({ dispose }));

      c.dispose();

      expect(dispose).not.toHaveBeenCalled();
    });

    it("나중에 만든 것부터 역순으로 정리한다", () => {
      const order: string[] = [];
      const c = new Container();
      c.register("test.first", "singleton", () => ({ dispose: () => order.push("first") }));
      c.register("test.second", "singleton", () => ({ dispose: () => order.push("second") }));
      c.resolve("test.first");
      c.resolve("test.second");

      c.dispose();

      expect(order).toEqual(["second", "first"]);
    });

    it("자식 컨테이너로 전파된다", () => {
      const dispose = vi.fn();
      const c = new Container();
      c.register("test.disposable", "scoped", () => ({ dispose }));
      c.createChild("child").resolve("test.disposable");

      c.dispose();

      expect(dispose).toHaveBeenCalledTimes(1);
    });

    it("두 번 불러도 안전하다", () => {
      const dispose = vi.fn();
      const c = new Container();
      c.register("test.disposable", "singleton", () => ({ dispose }));
      c.resolve("test.disposable");

      c.dispose();
      c.dispose();

      expect(dispose).toHaveBeenCalledTimes(1);
    });

    it("자식이 먼저 죽으면 부모의 목록에서 빠져 부모가 다시 정리하지 않는다", () => {
      const dispose = vi.fn();
      const c = new Container();
      c.register("test.disposable", "scoped", () => ({ dispose }));
      const child = c.createChild("child");
      child.resolve("test.disposable");

      child.dispose();
      c.dispose();

      expect(dispose).toHaveBeenCalledTimes(1);
    });

    it("정리하는 동안에는 아직 꺼낼 수 있다 — 정리 코드가 이웃을 찾아 끈다", () => {
      const c = new Container();
      const stopped: string[] = [];
      c.register("test.first", "singleton", () => ({ dispose: () => stopped.push("first") }));
      c.register("test.second", "singleton", (container) => ({
        dispose: () => {
          container.resolve("test.first");
          stopped.push("second");
        },
      }));
      c.resolve("test.first");
      c.resolve("test.second");

      expect(() => c.dispose()).not.toThrow();
      expect(stopped).toEqual(["second", "first"]);
    });

    it("dispose된 컨테이너에서 꺼내면 ContainerDisposedError에 이름을 담아 던진다", () => {
      const c = new Container();
      c.register("test.counter", "scoped", () => ({ id: 1 }));
      const child = c.createChild("tab:a");
      child.dispose();

      expect(() => child.resolve("test.counter")).toThrow(ContainerDisposedError);
      expect(() => child.resolve("test.counter")).toThrow("tab:a");
      expect(c.createChild("tab:b").resolve("test.counter").id).toBe(1);
    });
  });

  describe("순환 의존", () => {
    it("스택 오버플로 대신 경로가 담긴 CircularDependencyError를 던진다", () => {
      const c = new Container();
      c.register("test.a", "singleton", (container) => ({ b: container.resolve("test.b") }));
      c.register("test.b", "singleton", (container) => ({ a: container.resolve("test.a") }));

      expect(() => c.resolve("test.a")).toThrow(CircularDependencyError);
      try {
        c.resolve("test.a");
      } catch (error) {
        expect((error as CircularDependencyError).path).toEqual(["test.a", "test.b", "test.a"]);
      }
    });

    it("자기 자신을 조회해도 잡는다", () => {
      const c = new Container();
      c.register("test.self", "singleton", (container) => ({ self: container.resolve("test.self") }));

      expect(() => c.resolve("test.self")).toThrow(CircularDependencyError);
    });

    it("순환이 아닌 중첩 의존은 통과시킨다", () => {
      const c = new Container();
      c.register("test.leaf", "singleton", () => ({ id: 1 }));
      c.register("test.branch", "singleton", (container) => ({ leaf: container.resolve("test.leaf") }));

      expect(c.resolve("test.branch").leaf.id).toBe(1);
    });
  });

  describe("죽은 컨테이너", () => {
    it("dispose된 컨테이너에는 register할 수 없다", () => {
      const c = new Container("app");
      c.dispose();

      expect(() => {
        c.register("test.counter", "singleton", () => ({ id: 1 }));
      }).toThrow(ContainerDisposedError);
    });

    it("dispose된 부모에서는 자식을 딸 수 없다 — 딸아도 아무도 정리하지 않는다", () => {
      const root = new Container("app");
      root.dispose();

      expect(() => root.createChild("tab")).toThrow(ContainerDisposedError);
    });
  });

  describe("팩토리가 받는 컨테이너", () => {
    it("singleton 팩토리는 등록한 컨테이너를 받는다 — 꺼낸 자식이 아니다", () => {
      const root = new Container("app");
      root.register("test.host", "singleton", (container) => ({ host: container }));
      const tab = root.createChild("tab");

      expect(tab.resolve("test.host").host).toBe(root);
    });

    it("scoped 팩토리는 꺼낸 자식을 받는다", () => {
      const root = new Container("app");
      root.register("test.host", "scoped", (container) => ({ host: container }));
      const tab = root.createChild("tab");

      expect(tab.resolve("test.host").host).toBe(tab);
    });

    it("루트에서 처음 꺼낸 singleton이 뒤에 온 탭의 scoped를 붙잡지 않는다", () => {
      const root = new Container("app");
      let next = 0;
      root.register("test.scopedLeaf", "scoped", () => ({ id: (next += 1) }));
      root.register("test.branch", "singleton", (container) => ({ leaf: container.resolve("test.scopedLeaf") }));
      const tab = root.createChild("tab");

      expect(tab.resolve("test.branch").leaf).toBe(root.resolve("test.scopedLeaf"));
      expect(tab.resolve("test.scopedLeaf").id).not.toBe(root.resolve("test.scopedLeaf").id);
    });
  });
});
