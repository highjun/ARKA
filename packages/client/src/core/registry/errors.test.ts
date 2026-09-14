import { describe, expect, it } from "vitest";
import { CoreError } from "#core/errors";
import { DescriptorNotFoundError, DuplicateDescriptorError } from "./errors";

describe("DescriptorNotFoundError", () => {
  it("없는 id 와 그에 맞는 message 를 담는다", () => {
    const error = new DescriptorNotFoundError("todo.add");

    expect(error.id).toBe("todo.add");
    expect(error.message).toBe('No descriptor registered for id "todo.add".');
    expect(error).toBeInstanceOf(CoreError);
  });
});

describe("DuplicateDescriptorError", () => {
  it("중복된 id 와 그에 맞는 message 를 담는다", () => {
    const error = new DuplicateDescriptorError("todo.add");

    expect(error.id).toBe("todo.add");
    expect(error.message).toBe('A descriptor is already registered for id "todo.add".');
    expect(error).toBeInstanceOf(CoreError);
  });
});
