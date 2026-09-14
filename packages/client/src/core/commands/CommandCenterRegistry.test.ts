import type { ICommandCenterRegistry } from "./ICommandCenterRegistry";
import { CommandCenterRegistry } from "./CommandCenterRegistry";

/** 읽기 전용 흉내 atom — 이 테스트는 구독을 안 본다. `ReadableAtom`을 그대로 가져오면 안 보는
 *  것의 타입까지 맞춰야 하므로, 최소 모양만 흉내내고 호출부에서 필요한 타입으로 캐스트한다. */
const fakeAtom = <T>(value: T) => ({ get: () => value, listen: () => () => undefined }) as unknown;

const make = (): ICommandCenterRegistry => {
  return new CommandCenterRegistry();
};

describe("ICommandCenterRegistry — 커맨드 실행", () => {
  it("키바인딩에 맞는 커맨드를 실행하고 true를 돌려준다", () => {
    const registry = make();
    let executed = false;
    registry.registerCommand({ id: "test.run", label: "실행", execute: () => (executed = true) });
    registry.registerKeybinding({ id: "test.run.keybinding", keybinding: "ctrl+j", actionId: "test.run" });

    const dispatched = registry.dispatchKeydown("ctrl+j");

    expect(dispatched).toBe(true);
    expect(executed).toBe(true);
  });

  it("매칭되는 키바인딩이 없으면 아무 일도 안 하고 false를 돌려준다", () => {
    const registry = make();

    expect(registry.dispatchKeydown("ctrl+z")).toBe(false);
  });

  it("키바인딩은 있는데 커맨드가 없으면(등록 순서 실수) 조용히 false다", () => {
    const registry = make();
    registry.registerKeybinding({ id: "orphan", keybinding: "ctrl+j", actionId: "없는커맨드" });

    expect(registry.dispatchKeydown("ctrl+j")).toBe(false);
  });

  it("when 조건이 거짓이면 매칭되지 않는다", () => {
    const registry = make();
    let executed = false;
    registry.registerCommand({ id: "test.run", label: "실행", execute: () => (executed = true) });
    registry.registerKeybinding({
      id: "test.run.keybinding",
      keybinding: "ctrl+j",
      actionId: "test.run",
      when: () => false,
    });

    expect(registry.dispatchKeydown("ctrl+j")).toBe(false);
    expect(executed).toBe(false);
  });
});

describe("ICommandCenterRegistry — registry 노출", () => {
  it("등록한 것을 registry로도 조회할 수 있다", () => {
    const registry = make();
    registry.registerCommand({ id: "test.run", label: "실행", execute: () => {} });
    registry.registerContext({
      id: "test.flag",
      atom: fakeAtom(true) as Parameters<ICommandCenterRegistry["registerContext"]>[0]["atom"],
    });

    expect(registry.commandRegistry.get("test.run").label).toBe("실행");
    expect(registry.contextRegistry.tryGet("test.flag")).toBeDefined();
  });
});
