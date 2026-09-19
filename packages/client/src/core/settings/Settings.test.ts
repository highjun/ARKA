import { describe, expect, it, vi } from "vitest";
import { DescriptorNotFoundError } from "#core/registry";
import { Settings, type ISettings, type SettingsDescriptor, type SettingsStore } from "#core/settings";

const memoryStore = (initial: Record<string, unknown> = {}): SettingsStore & { saved: Record<string, unknown> } => {
  const store = {
    saved: initial,
    load: () => store.saved,
    save: (values: Readonly<Record<string, unknown>>) => {
      store.saved = { ...values };
    },
  };
  return store;
};

const DENSITY: SettingsDescriptor = {
  id: "test.density",
  title: "밀도",
  type: "enum",
  default: "auto",
  options: ["auto", "compact", "touch"],
};
const WRAP: SettingsDescriptor = { id: "test.wrap", title: "줄 바꿈", type: "boolean", default: true };

const withDensity = (store: SettingsStore): ISettings => {
  const settings = new Settings({ store });
  settings.schema.add(DENSITY);
  settings.schema.add(WRAP);
  return settings;
};

describe("Settings", () => {
  it("저장된 값이 없으면 스키마의 default를 준다", () => {
    const settings = withDensity(memoryStore());

    expect(settings.get<string>("test.density")).toBe("auto");
    expect(settings.get<boolean>("test.wrap")).toBe(true);
  });

  it("저장된 값이 타입에 맞으면 그것을 준다", () => {
    const settings = withDensity(memoryStore({ "test.density": "touch", "test.wrap": false }));

    expect(settings.get<string>("test.density")).toBe("touch");
    expect(settings.get<boolean>("test.wrap")).toBe(false);
  });

  it("타입이 어긋난 저장값은 default로 돌아간다", () => {
    const settings = withDensity(memoryStore({ "test.density": 3, "test.wrap": "yes" }));

    expect(settings.get<string>("test.density")).toBe("auto");
    expect(settings.get<boolean>("test.wrap")).toBe(true);
  });

  it("enum은 options 밖의 값을 default로 돌린다", () => {
    const settings = withDensity(memoryStore({ "test.density": "huge" }));

    expect(settings.get<string>("test.density")).toBe("auto");
  });

  it("set은 저장하고 그 id로 알린다", () => {
    const store = memoryStore();
    const settings = withDensity(store);
    const listener = vi.fn();
    settings.onDidChange(listener);

    settings.set("test.density", "compact");

    expect(store.saved["test.density"]).toBe("compact");
    expect(listener).toHaveBeenCalledWith("test.density");
    expect(settings.get<string>("test.density")).toBe("compact");
  });

  it("리스너를 dispose하면 더는 안 받는다", () => {
    const settings = withDensity(memoryStore());
    const listener = vi.fn();
    settings.onDidChange(listener).dispose();

    settings.set("test.wrap", false);

    expect(listener).not.toHaveBeenCalled();
  });

  it("등록 안 된 id는 get이 DescriptorNotFoundError를 던진다", () => {
    const settings = withDensity(memoryStore());

    expect(() => settings.get("test.unknown")).toThrow(DescriptorNotFoundError);
  });

  it("등록 안 된 id는 set도 DescriptorNotFoundError를 던진다", () => {
    const store = memoryStore();
    const settings = withDensity(store);

    expect(() => settings.set("test.unknown", 1)).toThrow(DescriptorNotFoundError);
    expect(store.saved).toEqual({});
  });
});
