import { describe, expect, it, vi } from "vitest";
import { CircularDependencyError, Container, ContainerDisposedError, InstanceNotRegisteredError } from "#core/di";

/** 테스트 전용 자리. `test.` 접두로 앱의 키와 갈린다. */
declare module "#core/di" {
  /** 이 파일의 테스트가 쓰는 인스턴스들. */
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
});
