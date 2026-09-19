import { Settings } from "#core/settings";
import { describe, expect, it } from "vitest";
import { SettingsViewModel } from "./SettingsViewModel";

const make = () => {
  const saved: Record<string, unknown>[] = [];
  const settings = new Settings({
    store: { load: () => ({ "a.flag": true }), save: (values) => void saved.push(values) },
  });
  settings.schema.add({ id: "a.flag", title: "깃발", type: "boolean", default: false });
  settings.schema.add({ id: "a.mode", title: "모드", type: "enum", default: "x", options: ["x", "y"] });
  const viewModel = new SettingsViewModel({ settings });
  return { viewModel, settings, saved };
};

describe("ISettingsViewModel", () => {
  it("스키마 순서대로 줄을 펴고 저장된 값을 얹는다", () => {
    const { viewModel } = make();

    expect(viewModel.rows).toEqual([
      { id: "a.flag", title: "깃발", type: "boolean", value: true },
      { id: "a.mode", title: "모드", type: "enum", value: "x", options: ["x", "y"] },
    ]);
  });

  it("set은 저장하고 줄이 따라온다", () => {
    const { viewModel, saved } = make();

    viewModel.set("a.mode", "y");

    expect(viewModel.rows[1]?.value).toBe("y");
    expect(saved.at(-1)).toEqual({ "a.flag": true, "a.mode": "y" });
  });
});
