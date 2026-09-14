import { describe, expect, it } from "vitest";
import { DescriptorNotFoundError, DuplicateDescriptorError } from "./errors";
import { createRegistry } from "./registry";
import type { Descriptor } from "./descriptor";

interface CommandDescriptor extends Descriptor {
  readonly label: string;
}

const registryWith = (...descriptors: CommandDescriptor[]) => {
  const registry = createRegistry<CommandDescriptor>();
  for (const descriptor of descriptors) registry.add(descriptor);
  return registry;
};

describe("Registry", () => {
  it("descriptor 를 추가하고 id 로 가져온다", () => {
    const registry = registryWith({ id: "todo.add", label: "Add" });

    expect(registry.get("todo.add").label).toBe("Add");
  });

  it("모르는 id 에는 undefined 를 돌려주는 대신 명시적인 에러를 던진다", () => {
    const registry = createRegistry<CommandDescriptor>();

    expect(() => registry.get("todo.add")).toThrow(DescriptorNotFoundError);
  });

  it("모르는 id 에 tryGet 은 undefined 를 돌려준다", () => {
    const registry = createRegistry<CommandDescriptor>();

    expect(registry.tryGet("todo.add")).toBeUndefined();
  });

  it("같은 id 로 descriptor 두 개를 등록하면 거부한다", () => {
    const registry = registryWith({ id: "todo.add", label: "Add" });

    expect(() => registry.add({ id: "todo.add", label: "Add again" })).toThrow(DuplicateDescriptorError);
  });

  it("등록된 모든 descriptor 를 등록 순서대로 나열한다", () => {
    const registry = registryWith({ id: "a", label: "A" }, { id: "b", label: "B" });

    expect(registry.list().map((descriptor) => descriptor.id)).toEqual(["a", "b"]);
  });

  it("정확히 일치하는 id 는 params 없이 매칭된다", () => {
    const registry = registryWith({ id: "todo.add", label: "Add" });

    expect(registry.match("todo.add")).toEqual([{ descriptor: { id: "todo.add", label: "Add" }, params: {} }]);
  });

  it("패턴 id 에서 params 를 뽑아낸다", () => {
    const registry = registryWith({ id: "/workspace/:fileId", label: "Open" });

    const [matched] = registry.match("/workspace/readme.md");

    expect(matched?.descriptor.label).toBe("Open");
    expect(matched?.params).toEqual({ fileId: "readme.md" });
  });

  it("정확한 id 와 패턴 둘 다 맞으면 두 descriptor 를 모두 돌려준다", () => {
    const registry = registryWith(
      { id: "/workspace/settings", label: "Settings" },
      { id: "/workspace/:fileId", label: "Open" },
    );

    const labels = registry.match("/workspace/settings").map((matched) => matched.descriptor.label);

    expect(labels).toEqual(["Settings", "Open"]);
  });

  it("아무것도 맞지 않으면 빈 목록을 돌려준다", () => {
    const registry = registryWith({ id: "/workspace/:fileId", label: "Open" });

    expect(registry.match("/other/thing")).toEqual([]);
  });
});
