import { describe, expect, it, vi } from "vitest";
import {
  CircularDependencyError,
  TokenNotRegisteredError,
  createContainer,
  createToken,
  scoped,
  singleton,
  transient,
  value,
} from ".";

const Counter = createToken<{ id: number }>("counter");

describe("createContainer()", () => {
  describe("수명", () => {
    it("singleton은 몇 번을 조회해도 한 번만 만든다", () => {
      const create = vi.fn(() => ({ id: 1 }));
      const c = createContainer();
      c.register(Counter, singleton(create));

      expect(c.resolve(Counter)).toBe(c.resolve(Counter));
      expect(create).toHaveBeenCalledTimes(1);
    });

    it("transient는 조회할 때마다 새로 만든다", () => {
      const c = createContainer();
      let next = 0;
      c.register(Counter, transient(() => ({ id: (next += 1) })));

      expect(c.resolve(Counter)).not.toBe(c.resolve(Counter));
    });

    it("scoped는 스코프마다 하나씩 만든다", () => {
      const c = createContainer();
      c.register(Counter, scoped(() => ({ id: 1 })));
      const a = c.createScope("a");
      const b = c.createScope("b");

      expect(a.resolve(Counter)).toBe(a.resolve(Counter));
      expect(a.resolve(Counter)).not.toBe(b.resolve(Counter));
    });

    it("value는 준 인스턴스를 그대로 돌려준다", () => {
      const instance = { id: 7 };
      const c = createContainer();
      c.register(Counter, value(instance));

      expect(c.resolve(Counter)).toBe(instance);
    });
  });

  describe("스코프", () => {
    it("자식은 부모에 등록된 것을 본다", () => {
      const c = createContainer();
      c.register(Counter, singleton(() => ({ id: 1 })));

      expect(c.createScope("child").resolve(Counter).id).toBe(1);
    });

    it("부모는 자식에 등록된 것을 못 본다", () => {
      const c = createContainer();
      c.createScope("child").register(Counter, singleton(() => ({ id: 1 })));

      expect(() => c.resolve(Counter)).toThrow(TokenNotRegisteredError);
    });

    it("형제끼리는 서로를 못 본다", () => {
      const c = createContainer();
      const a = c.createScope("a");
      const b = c.createScope("b");
      a.register(Counter, singleton(() => ({ id: 1 })));

      expect(() => b.resolve(Counter)).toThrow(TokenNotRegisteredError);
    });

    it("자식에 같은 토큰을 다시 등록하면 그 스코프에서만 부모를 가린다", () => {
      const c = createContainer();
      c.register(Counter, singleton(() => ({ id: 1 })));
      const child = c.createScope("child");
      child.register(Counter, singleton(() => ({ id: 2 })));

      expect(child.resolve(Counter).id).toBe(2);
      expect(c.resolve(Counter).id).toBe(1);
    });

    it("등록되지 않은 토큰은 이름과 함께 던진다", () => {
      expect(() => createContainer().resolve(Counter)).toThrow(/counter/);
    });
  });

  describe("dispose", () => {
    it("자기가 만든 Disposable을 정리한다", async () => {
      const dispose = vi.fn();
      const token = createToken<{ dispose: () => void }>("disposable");
      const c = createContainer();
      c.register(token, singleton(() => ({ dispose })));
      c.resolve(token);

      await c.dispose();

      expect(dispose).toHaveBeenCalledTimes(1);
    });

    it("만든 적 없으면 부르지 않는다", async () => {
      const dispose = vi.fn();
      const token = createToken<{ dispose: () => void }>("disposable");
      const c = createContainer();
      c.register(token, singleton(() => ({ dispose })));

      await c.dispose();

      expect(dispose).not.toHaveBeenCalled();
    });

    it("나중에 만든 것부터 역순으로 정리한다", async () => {
      const order: string[] = [];
      const first = createToken<object>("first");
      const second = createToken<object>("second");
      const c = createContainer();
      c.register(first, singleton(() => ({ dispose: () => order.push("first") })));
      c.register(second, singleton(() => ({ dispose: () => order.push("second") })));
      c.resolve(first);
      c.resolve(second);

      await c.dispose();

      expect(order).toEqual(["second", "first"]);
    });

    it("아래로 전파된다", async () => {
      const dispose = vi.fn();
      const token = createToken<{ dispose: () => void }>("disposable");
      const c = createContainer();
      const child = c.createScope("child");
      child.register(token, singleton(() => ({ dispose })));
      child.resolve(token);

      await c.dispose();

      expect(dispose).toHaveBeenCalledTimes(1);
    });
  });

  describe("순환 의존", () => {
    it("스택 오버플로 대신 경로가 담긴 에러를 던진다", () => {
      const a = createToken<object>("a");
      const b = createToken<object>("b");
      const c = createContainer();
      c.register(a, singleton((container) => ({ b: container.resolve(b) })));
      c.register(b, singleton((container) => ({ a: container.resolve(a) })));

      expect(() => c.resolve(a)).toThrow(CircularDependencyError);
      expect(() => c.resolve(a)).toThrow(/a → b → a/);
    });

    it("자기 자신을 조회해도 잡는다", () => {
      const self = createToken<object>("self");
      const c = createContainer();
      c.register(self, singleton((container) => ({ me: container.resolve(self) })));

      expect(() => c.resolve(self)).toThrow(CircularDependencyError);
    });

    it("순환이 아닌 중첩 의존은 통과시킨다", () => {
      const leaf = createToken<{ id: number }>("leaf");
      const branch = createToken<{ leaf: { id: number } }>("branch");
      const c = createContainer();
      c.register(leaf, singleton(() => ({ id: 1 })));
      c.register(branch, singleton((container) => ({ leaf: container.resolve(leaf) })));

      expect(c.resolve(branch).leaf.id).toBe(1);
    });
  });
});
