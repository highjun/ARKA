import { describe, expect, it } from "vitest";
import { DescriptorDuplicatedIdError, DescriptorNotFoundError, Registry, type Descriptor } from "#core/registry";

interface CommandDescriptor extends Descriptor {
  readonly label: string;
}

const registryWith = (...descriptors: CommandDescriptor[]) => {
  const registry = new Registry<CommandDescriptor>();
  for (const descriptor of descriptors) registry.add(descriptor);
  return registry;
};

describe("Registry", () => {
  it("descriptor를 담고 id로 찾는다", () => {
    const registry = registryWith({ id: "todo.add", label: "Add" });

    expect(registry.get("todo.add").label).toBe("Add");
  });

  it("없는 id에 get은 DescriptorNotFoundError를 던진다", () => {
    const registry = new Registry<CommandDescriptor>();

    expect(() => registry.get("todo.add")).toThrow(DescriptorNotFoundError);
  });

  it("없는 id에 tryGet은 undefined를 돌려준다", () => {
    const registry = new Registry<CommandDescriptor>();

    expect(registry.tryGet("todo.add")).toBeUndefined();
  });

  it("같은 id를 두 번 add하면 DescriptorDuplicatedIdError를 던진다", () => {
    const registry = registryWith({ id: "todo.add", label: "Add" });

    expect(() => registry.add({ id: "todo.add", label: "Add again" })).toThrow(DescriptorDuplicatedIdError);
  });

  it("담은 순서대로 나열한다", () => {
    const registry = registryWith({ id: "a", label: "A" }, { id: "b", label: "B" });

    expect(registry.list().map((descriptor) => descriptor.id)).toEqual(["a", "b"]);
  });
});
