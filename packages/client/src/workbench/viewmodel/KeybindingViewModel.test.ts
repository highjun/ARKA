import { CommandService } from "#core/commands";
import { describe, expect, it } from "vitest";
import { KeybindingViewModel } from "./KeybindingViewModel";

const make = (overrides: Record<string, string | null> = {}) => {
  const commands = new CommandService({
    overridesStore: { load: () => overrides, save: () => undefined },
    reportError: () => undefined,
  });
  commands.actions.add({ id: "a", label: "하나", execute: () => undefined });
  commands.actions.add({ id: "b", label: "둘", execute: () => undefined });
  commands.keybindings.add({ keybinding: "ctrl+1", actionId: "a" });
  commands.keybindings.add({ keybinding: "ctrl+2", actionId: "b" });
  commands.keybindings.add({ keybinding: "f9", actionId: "c" });
  return new KeybindingViewModel({ commands });
};

describe("IKeybindingViewModel", () => {
  it("등록 순서대로 줄을 내고, 이름 없는 명령은 id가 이름 자리에 온다", () => {
    expect(make().rows).toEqual([
      { actionId: "a", label: "하나", keybinding: "ctrl+1", isConflicting: false },
      { actionId: "b", label: "둘", keybinding: "ctrl+2", isConflicting: false },
      { actionId: "c", label: "c", keybinding: "f9", isConflicting: false },
    ]);
  });

  it("재정의가 있으면 그 키를 보이고, 같은 실효 키에 둘 이상이면 충돌이다", () => {
    const rows = make({ b: "ctrl+1" }).rows;

    expect(rows.map((row) => [row.keybinding, row.isConflicting])).toEqual([
      ["ctrl+1", true],
      ["ctrl+1", true],
      ["f9", false],
    ]);
  });

  it("null로 꺼 둔 것은 빠진다", () => {
    expect(make({ c: null }).rows.map((row) => row.actionId)).toEqual(["a", "b"]);
  });
});
