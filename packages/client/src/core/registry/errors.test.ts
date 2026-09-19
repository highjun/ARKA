import { describe, expect, it } from "vitest";
import { CoreError } from "#core/errors";
import { DescriptorDuplicatedIdError, DescriptorNotFoundError } from "#core/registry";

describe("DescriptorNotFoundError", () => {
  it("없는 id와 그에 맞는 message를 담는다", () => {
    const error = new DescriptorNotFoundError("todo.add");

    expect(error.id).toBe("todo.add");
    expect(error.message).toBe('No descriptor registered for id "todo.add".');
    expect(error).toBeInstanceOf(CoreError);
  });
});

describe("DescriptorDuplicatedIdError", () => {
  it("겹친 id와 그에 맞는 message를 담는다", () => {
    const error = new DescriptorDuplicatedIdError("todo.add");

    expect(error.id).toBe("todo.add");
    expect(error.message).toBe('A descriptor is already registered for id "todo.add".');
    expect(error).toBeInstanceOf(CoreError);
  });
});
