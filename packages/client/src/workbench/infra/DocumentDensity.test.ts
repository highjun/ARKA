import { Settings } from "#core/settings";
import { describe, expect, it } from "vitest";
import { createDocumentDensity, DENSITY_SETTING_ID } from "./DocumentDensity";

describe("createDocumentDensity", () => {
  it("설정을 html의 data-density에 반영하고 dispose하면 지운다", () => {
    const settings = new Settings({ store: { load: () => ({}), save: () => undefined } });
    settings.schema.add({
      id: DENSITY_SETTING_ID,
      title: "밀도",
      type: "enum",
      default: "auto",
      options: ["auto", "compact", "touch"],
    });
    const density = createDocumentDensity({ settings });
    // jsdom의 matchMedia 스텁은 항상 불일치 — auto는 compact가 된다.
    expect(document.documentElement.dataset["density"]).toBe("compact");
    settings.set(DENSITY_SETTING_ID, "touch");
    expect(document.documentElement.dataset["density"]).toBe("touch");
    density.dispose();
    expect(document.documentElement.dataset["density"]).toBeUndefined();
  });
});
