import { SidebarContentRegistry } from "./SidebarContentRegistry";
import type { ISidebarContentRegistry } from "./ISidebarContentRegistry";

const make = (): ISidebarContentRegistry => {
  return new SidebarContentRegistry();
};

const NOOP_PANEL = () => null;

describe("ISidebarContentRegistry", () => {
  it("등록한 것을 조회할 수 있다", () => {
    const registry = make();
    registry.add({ id: "explorer", ContentComponent: NOOP_PANEL });

    expect(registry.get("explorer").ContentComponent).toBe(NOOP_PANEL);
  });

  it("없는 항목은 tryGet이 undefined다", () => {
    const registry = make();

    expect(registry.tryGet("nope")).toBeUndefined();
  });
});
