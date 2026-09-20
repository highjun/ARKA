import { describe, expect, it, vi } from "vitest";
import { runActivating } from "../registry/activation";
import {
  CommandService,
  type ActionDescriptor,
  type ContextDescriptor,
  type ICommandService,
  type Keybinding,
  type KeybindingOverridesStore,
  type MenuItem,
} from "#core/commands";

const memoryStore = (initial: Record<string, string | null> = {}) => {
  const store: KeybindingOverridesStore & { saved: Record<string, string | null> } = {
    saved: initial,
    load: () => store.saved,
    save: (overrides) => {
      store.saved = { ...overrides };
    },
  };
  return store;
};

const make = (overrides: Record<string, string | null> = {}) => {
  const store = memoryStore(overrides);
  const reportError = vi.fn();
  const commands: ICommandService = new CommandService({ overridesStore: store, reportError });
  return { commands, store, reportError };
};

const keydown = (key: string, init: KeyboardEventInit = {}) => new KeyboardEvent("keydown", { key, ...init });
const ctrl = (key: string) => keydown(key, { ctrlKey: true });

const run = (executed: string[]): ActionDescriptor => ({
  id: "test.run",
  label: "실행",
  execute: () => executed.push("run"),
});
const runKey: Keybinding = { keybinding: "ctrl+j", actionId: "test.run" };

describe("CommandService — 키 입력", () => {
  it("키바인딩에 맞는 명령을 실행하고 true를 돌려준다", () => {
    const { commands } = make();
    const executed: string[] = [];
    commands.actions.add(run(executed));
    commands.keybindings.add(runKey);

    expect(commands.dispatchKeydown(ctrl("j"))).toBe(true);
    expect(executed).toEqual(["run"]);
  });

  it("맞는 키바인딩이 없으면 false다", () => {
    const { commands } = make();

    expect(commands.dispatchKeydown(ctrl("z"))).toBe(false);
  });

  it("키바인딩은 있는데 명령이 없으면 보고하고 true다 — 키는 먹혔다", () => {
    const { commands, reportError } = make();
    commands.keybindings.add({ keybinding: "ctrl+j", actionId: "test.missing" });

    expect(commands.dispatchKeydown(ctrl("j"))).toBe(true);
    expect(reportError).toHaveBeenCalledTimes(1);
  });

  it("when이 거짓이면 맞지 않는다", () => {
    const { commands } = make();
    const executed: string[] = [];
    commands.actions.add(run(executed));
    commands.keybindings.add({ ...runKey, when: () => false });

    expect(commands.dispatchKeydown(ctrl("j"))).toBe(false);
    expect(executed).toEqual([]);
  });

  it("when은 문맥 레지스트리를 읽는다", () => {
    const { commands } = make();
    const executed: string[] = [];
    const flag: ContextDescriptor = { id: "test.flag", value: () => true };
    commands.contexts.add(flag);
    commands.actions.add(run(executed));
    commands.keybindings.add({ ...runKey, when: (ctx) => ctx.get("test.flag").value() === true });

    expect(commands.dispatchKeydown(ctrl("j"))).toBe(true);
  });
});

describe("CommandService — 사용자 재정의", () => {
  it("재정의한 키가 먹고 기본값은 무시된다", () => {
    const { commands } = make({ "test.run": "ctrl+m" });
    const executed: string[] = [];
    commands.actions.add(run(executed));
    commands.keybindings.add(runKey);

    expect(commands.dispatchKeydown(ctrl("j"))).toBe(false);
    expect(commands.matchKeybinding(ctrl("m"))).toEqual({ keybinding: "ctrl+m", actionId: "test.run" });
  });

  it("null 재정의는 기본값을 끈다", () => {
    const { commands } = make({ "test.run": null });
    commands.actions.add(run([]));
    commands.keybindings.add(runKey);

    expect(commands.dispatchKeydown(ctrl("j"))).toBe(false);
  });

  it("기본값이 없는 명령도 재정의로 키를 얻는다", () => {
    const { commands } = make({ "test.run": "ctrl+m" });
    const executed: string[] = [];
    commands.actions.add(run(executed));

    expect(commands.dispatchKeydown(ctrl("m"))).toBe(true);
    expect(executed).toEqual(["run"]);
  });

  it("setKeybinding은 저장소에 남기고 overrides에 보인다", () => {
    const { commands, store } = make();

    commands.setKeybinding("test.run", "ctrl+m");

    expect(store.saved).toEqual({ "test.run": "ctrl+m" });
    expect(commands.overrides.get("test.run")).toBe("ctrl+m");
  });
});

describe("CommandService — 메뉴", () => {
  const item = (menuId: string, actionId: string, order?: number): MenuItem => ({ menuId, actionId, order });

  it("menuId로 거르고 when을 적용한다", () => {
    const { commands } = make();
    commands.menus.add(item("m", "a"));
    commands.menus.add(item("other", "b"));
    commands.menus.add({ ...item("m", "c"), when: () => false });

    expect(commands.matchMenuItems("m").map((entry) => entry.actionId)).toEqual(["a"]);
  });

  it("낸 확장 순서로 묶고 그 안에서 order로 정렬한다", () => {
    const { commands } = make();
    runActivating("arka.second", () => commands.menus.add(item("m", "s2", 1)));
    runActivating("arka.first", () => {
      commands.menus.add(item("m", "f2", 2));
      commands.menus.add(item("m", "f1", 1));
    });

    expect(commands.matchMenuItems("m").map((entry) => entry.actionId)).toEqual(["s2", "f1", "f2"]);
  });
});

describe("CommandService — 실행", () => {
  it("명령이 던지면 보고하고 자신은 던지지 않는다", () => {
    const { commands, reportError } = make();
    commands.actions.add({
      id: "test.boom",
      label: "터짐",
      execute: () => {
        throw new Error("터졌다");
      },
    });

    expect(() => commands.execute("test.boom")).not.toThrow();
    expect(reportError).toHaveBeenCalledWith(expect.objectContaining({ message: "터졌다" }));
  });

  it("모르는 actionId는 보고로 끝난다", () => {
    const { commands, reportError } = make();

    commands.execute("test.unknown");

    expect(reportError).toHaveBeenCalledTimes(1);
  });

  it("context를 그대로 넘긴다", () => {
    const { commands } = make();
    const received: unknown[] = [];
    commands.actions.add({ id: "test.echo", label: "메아리", execute: (context) => received.push(context) });

    commands.execute("test.echo", { path: "a.md" });

    expect(received).toEqual([{ path: "a.md" }]);
  });
});
