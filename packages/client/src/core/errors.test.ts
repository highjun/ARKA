import { describe, expect, it } from "vitest";
import { CoreError } from "./errors";

describe("CoreError", () => {
  it("name 과 message 를 설정한다", () => {
    const error = new CoreError("boom");

    expect(error.name).toBe("CoreError");
    expect(error.message).toBe("boom");
    expect(error).toBeInstanceOf(Error);
  });

  it("상속하면 name 을 서브클래스 이름으로 설정한다", () => {
    class SpecificError extends CoreError {}

    const error = new SpecificError("boom");

    expect(error.name).toBe("SpecificError");
    expect(error).toBeInstanceOf(CoreError);
  });
});
