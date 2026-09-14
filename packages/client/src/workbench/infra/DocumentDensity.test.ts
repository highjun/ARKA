import { describe, expect, it } from "vitest";
import { MockStorage } from "../model/MockStorage";
import { SettingsModel } from "../model/SettingsModel";
import { createDocumentDensity } from "./DocumentDensity";

describe("createDocumentDensity", () => {
  it("설정을 html의 data-density에 반영하고 stop하면 지운다", () => {
    const settingsModel = new SettingsModel({ storage: new MockStorage() });
    const density = createDocumentDensity({ settingsModel });
    density.start();
    // jsdom의 matchMedia 스텁은 항상 불일치 — auto는 compact가 된다.
    expect(document.documentElement.dataset["density"]).toBe("compact");
    settingsModel.update({ density: "touch" });
    expect(document.documentElement.dataset["density"]).toBe("touch");
    density.stop();
    expect(document.documentElement.dataset["density"]).toBeUndefined();
  });
});
