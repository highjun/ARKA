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
      { id: "a.flag", title: "깃발", category: "일반", type: "boolean", value: true },
      { id: "a.mode", title: "모드", category: "일반", type: "enum", value: "x", options: ["x", "y"] },
    ]);
  });

  it("set은 저장하고 줄이 따라온다", () => {
    const { viewModel, saved } = make();

    viewModel.set("a.mode", "y");

    expect(viewModel.rows[1]?.value).toBe("y");
    expect(saved.at(-1)).toEqual({ "a.flag": true, "a.mode": "y" });
  });

  it("범주를 안 적으면 「일반」이다 — 범주를 짓는 것은 확장의 몫이다", () => {
    const { viewModel } = make();

    expect(viewModel.rows.map((row) => row.category)).toEqual(["일반", "일반"]);
  });

  it("찾을 말을 들지만 거르지는 않는다 — 거르기는 화면의 순수 변환이다", () => {
    const { viewModel } = make();

    viewModel.setQuery("깃발");

    expect(viewModel.query).toBe("깃발");
    expect(viewModel.rows).toHaveLength(2);
  });
});
