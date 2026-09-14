import { ActivityBarRegistry } from "./ActivityBarRegistry";
import type { IActivityBarRegistry } from "./IActivityBarRegistry";

const make = (): IActivityBarRegistry => {
  return new ActivityBarRegistry();
};

describe("IActivityBarRegistry", () => {
  it("등록한 것을 조회할 수 있다", () => {
    const registry = make();
    registry.add({ id: "explorer", title: "탐색기", iconId: "files" });

    expect(registry.get("explorer").title).toBe("탐색기");
  });

  it("없는 항목은 tryGet이 undefined다", () => {
    const registry = make();

    expect(registry.tryGet("nope")).toBeUndefined();
  });

  it("list()가 등록된 전체를 순서대로 돌려준다", () => {
    const registry = make();
    registry.add({ id: "a", title: "A", iconId: "x" });
    registry.add({ id: "b", title: "B", iconId: "y" });

    expect(registry.list().map((d) => d.id)).toEqual(["a", "b"]);
  });
});
