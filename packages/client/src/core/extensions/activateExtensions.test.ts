import { describe, expect, it } from "vitest";
import { Container } from "#core/di";
import { Collection } from "#core/registry";
import {
  activateExtensions,
  type ActivationResult,
  type ExtensionActivationFailure,
  type ExtensionModule,
  type Registration,
} from "#core/extensions";

declare module "#core/di" {
  /** 이 파일의 테스트가 쓰는 인스턴스들. */
  interface InstanceMap {
    "test.ext.log": string[];
    "test.ext.menus": Collection<string>;
    "test.ext.needsLog": { readonly log: string[] };
  }
}

const logModule: ExtensionModule = {
  id: "arka.log",
  provides: [{ id: "test.ext.log", lifetime: "singleton", create: () => [] }],
};

describe("activateExtensions", () => {
  it("모든 provides가 끝난 뒤에 activate가 돈다 — 나중 확장이 물린 것도 앞 확장이 꺼낼 수 있다", () => {
    const container = new Container();
    const first: ExtensionModule = {
      id: "arka.first",
      activate: (c) => c.resolve("test.ext.needsLog").log.push("first"),
    };
    const needsLog: Registration = {
      id: "test.ext.needsLog",
      lifetime: "singleton",
      create: (c) => ({ log: c.resolve("test.ext.log") }),
    };
    const second: ExtensionModule = { id: "arka.second", provides: [needsLog] };

    const result: ActivationResult = activateExtensions([first, second, logModule], container);

    expect(result.activated).toEqual(["arka.first", "arka.second", "arka.log"]);
    expect(container.resolve("test.ext.log")).toEqual(["first"]);
  });

  it("배럴 순서가 곧 켜는 순서다", () => {
    const container = new Container();
    const order: string[] = [];
    const make = (id: string): ExtensionModule => ({ id, activate: () => order.push(id) });

    activateExtensions([make("b"), make("a"), make("c")], container);

    expect(order).toEqual(["b", "a", "c"]);
  });

  it("provides가 던지면 그 확장은 activate를 건너뛰고 phase가 provides다", () => {
    const container = new Container();
    let activated = false;
    const broken: ExtensionModule = {
      id: "arka.broken",
      get provides(): readonly Registration[] {
        throw new Error("물리다 터짐");
      },
      activate: () => {
        activated = true;
      },
    };

    const result = activateExtensions([broken, logModule], container);

    expect(activated).toBe(false);
    expect(result.activated).toEqual(["arka.log"]);
    expect(result.failed).toEqual([expect.objectContaining({ id: "arka.broken", phase: "provides" })]);
  });

  it("activate가 던져도 다른 확장은 켜지고, 던지기 전에 add한 것은 남는다", () => {
    const container = new Container();
    container.register("test.ext.menus", "singleton", () => new Collection<string>());
    const broken: ExtensionModule = {
      id: "arka.broken",
      activate: (c) => {
        c.resolve("test.ext.menus").add("before");
        throw new Error("꽂다 터짐");
      },
    };
    const fine: ExtensionModule = { id: "arka.fine", activate: (c) => c.resolve("test.ext.menus").add("fine") };

    const result = activateExtensions([broken, fine], container);

    const failure: ExtensionActivationFailure | undefined = result.failed[0];
    expect(failure).toEqual(expect.objectContaining({ id: "arka.broken", phase: "activate" }));
    expect(failure?.error.message).toBe("꽂다 터짐");
    expect(result.activated).toEqual(["arka.fine"]);
    expect(container.resolve("test.ext.menus").list()).toEqual(["before", "fine"]);
  });

  it("activate 안에서 Collection.add하면 그 확장의 id가 기록된다", () => {
    const container = new Container();
    container.register("test.ext.menus", "singleton", () => new Collection<string>());
    const module: ExtensionModule = { id: "arka.menu", activate: (c) => c.resolve("test.ext.menus").add("item") };

    activateExtensions([module], container);

    expect(container.resolve("test.ext.menus").entries()[0]?.activation?.id).toBe("arka.menu");
  });

  it("Error가 아닌 것을 던져도 Error로 감싼다", () => {
    const container = new Container();
    const rude: ExtensionModule = {
      id: "arka.rude",
      activate: () => {
        throw "문자열";
      },
    };

    const result = activateExtensions([rude], container);

    expect(result.failed[0]?.error).toBeInstanceOf(Error);
    expect(result.failed[0]?.error.message).toBe("문자열");
  });
});
