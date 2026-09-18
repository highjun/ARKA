import { CommandService } from "#core/commands";
import { describe, expect, it, vi } from "vitest";
import { CommandPaletteViewModel } from "./CommandPaletteViewModel";

const make = (overrides: Record<string, string | null> = {}) => {
  const commands = new CommandService({
    overridesStore: { load: () => overrides, save: () => undefined },
    reportError: () => undefined,
  });
  const run = vi.fn();
  commands.actions.add({ id: "a", label: "하나", execute: run });
  commands.keybindings.add({ keybinding: "ctrl+1", actionId: "a" });
  commands.actions.add({ id: "b", label: "둘", execute: () => undefined });
  const viewModel = new CommandPaletteViewModel({ commands });
  return { viewModel, commands, run };
};

describe("ICommandPaletteViewModel", () => {
  it("처음에는 닫혀 있고, 여는 것은 명령(ctrl+k)이다", () => {
    const { viewModel, commands } = make();
    expect(viewModel.isOpen).toBe(false);

    expect(commands.dispatchKeydown(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))).toBe(true);

    expect(viewModel.isOpen).toBe(true);
  });

  it("닫으면 검색어도 비운다", () => {
    const { viewModel } = make();
    viewModel.open();
    viewModel.setQuery("하");
    expect(viewModel.query).toBe("하");

    viewModel.close();

    expect(viewModel.isOpen).toBe(false);
    expect(viewModel.query).toBe("");
  });

  it("줄은 등록된 명령 전부이고 실효 키를 단다 — 재정의가 있으면 그것, 꺼 둔 것은 빈 문자열", () => {
    const { viewModel } = make({ b: "ctrl+2" });

    expect(viewModel.rows.filter((row) => row.id !== "shell.openCommandPalette")).toEqual([
      { id: "a", label: "하나", keybinding: "ctrl+1" },
      { id: "b", label: "둘", keybinding: "ctrl+2" },
    ]);
  });

  it("run은 실행하고 닫는다", () => {
    const { viewModel, run } = make();
    viewModel.open();

    viewModel.run("a");

    expect(run).toHaveBeenCalledOnce();
    expect(viewModel.isOpen).toBe(false);
  });
});
