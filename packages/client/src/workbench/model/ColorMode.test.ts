import { describe, expect, it } from "vitest";
import type { IStorage } from "./IStorage";
import { ColorMode } from "./ColorMode";
import type { IColorMode } from "./IColorMode";

const fakeStorage = (seed: Record<string, string> = {}): IStorage => {
  const store = new Map(Object.entries(seed));
  return {
    get: (key) => store.get(key) ?? null,
    set: (key, value) => void store.set(key, value),
  };
};

const make = (storage: IStorage = fakeStorage()): IColorMode => new ColorMode({ storage });

describe("IColorMode", () => {
  it("저장된 값이 없으면 light로 시작한다", () => {
    expect(make().mode).toBe("light");
  });

  it("넘어온 값을 반영하고 저장한다", () => {
    const storage = fakeStorage();
    const colorMode = make(storage);

    colorMode.setMode("dark");

    expect(colorMode.mode).toBe("dark");
    expect(storage.get("workbench.theme")).toBe("dark");
  });

  it("부팅 시 저장된 값으로 복원하고, 모르는 값이면 light다", () => {
    expect(make(fakeStorage({ "workbench.theme": "dark" })).mode).toBe("dark");
    expect(make(fakeStorage({ "workbench.theme": "망가진값" })).mode).toBe("light");
  });
});
