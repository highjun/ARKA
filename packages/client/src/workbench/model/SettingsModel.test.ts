import { describe, expect, it, vi } from "vitest";
import { MockStorage } from "./MockStorage";
import { SettingsModel } from "./SettingsModel";

describe("SettingsModel", () => {
  it("기본은 auto이고 바꾸면 저장하고 알린다", () => {
    const storage = new MockStorage();
    const model = new SettingsModel({ storage });
    const listener = vi.fn();
    model.onDidChange(listener);
    expect(model.settings.density).toBe("auto");
    model.update({ density: "touch" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(new SettingsModel({ storage }).settings.density).toBe("touch");
  });

  it("같은 값이면 알리지 않는다", () => {
    const model = new SettingsModel({ storage: new MockStorage() });
    const listener = vi.fn();
    model.onDidChange(listener);
    model.update({ density: "auto" });
    expect(listener).not.toHaveBeenCalled();
  });

  it("깨진 저장값은 기본값으로 돌아간다", () => {
    const storage = new MockStorage();
    storage.set("workbench.settings", "{not json");
    expect(new SettingsModel({ storage }).settings.density).toBe("auto");
    storage.set("workbench.settings", '{"density":"huge"}');
    expect(new SettingsModel({ storage }).settings.density).toBe("auto");
  });
});
