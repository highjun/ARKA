import { ActivityModel } from "./ActivityModel";
import type { IActivityModel } from "./IActivityModel";

const make = (): IActivityModel => {
  return new ActivityModel();
};

describe("IActivityModel", () => {
  it("탐색기로 시작한다", () => {
    expect(make().activeActivityId).toBe("explorer");
  });

  it("넘어온 값을 그대로 반영한다", () => {
    const model = make();

    model.setActiveActivityId("search");

    expect(model.activeActivityId).toBe("search");
  });

  it("null도 그대로 반영한다", () => {
    const model = make();

    model.setActiveActivityId(null);

    expect(model.activeActivityId).toBeNull();
  });
});
