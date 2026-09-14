import type { IStorage } from "../model/IStorage";
import { ThemeModel } from "./ThemeModel";
import type { IThemeModel } from "./IThemeModel";

const fakeStorage = (seed: Record<string, string> = {}): IStorage => {
  const store = new Map(Object.entries(seed));
  return {
    get: (key) => store.get(key) ?? null,
    set: (key, value) => void store.set(key, value),
  };
};

const make = (storage: IStorage = fakeStorage()): IThemeModel => {
  return new ThemeModel({ storage });
};

describe("IThemeModel", () => {
  it("저장된 값이 없으면 light로 시작한다", () => {
    expect(make().theme).toBe("light");
  });

  it("넘어온 값을 그대로 반영한다", () => {
    const model = make();

    model.setTheme("dark");

    expect(model.theme).toBe("dark");
  });

  it("바꿀 때마다 저장한다", () => {
    const storage = fakeStorage();
    const model = make(storage);

    model.setTheme("dark");

    expect(storage.get("workbench.theme")).toBe("dark");
  });

  it("부팅 시 저장된 값으로 복원한다", () => {
    const model = make(fakeStorage({ "workbench.theme": "dark" }));

    expect(model.theme).toBe("dark");
  });

  it("저장된 값이 알 수 없는 것이면 light로 시작한다", () => {
    const model = make(fakeStorage({ "workbench.theme": "망가진값" }));

    expect(model.theme).toBe("light");
  });
});
