import { describe, expect, it } from "vitest";
import { Registry } from "#core/registry";
import type { ContextRegistry } from "#core/action";
import { matchMenuItems, type MenuItemDescriptor } from "./menu";

const registryWith = (...entries: MenuItemDescriptor[]) => {
  const registry = new Registry<MenuItemDescriptor>();
  for (const entry of entries) registry.add(entry);
  return registry;
};

const ctx = new Registry() as ContextRegistry;

describe("matchMenuItems", () => {
  it("주어진 메뉴에 기여된 항목만 돌려준다", () => {
    const registry = registryWith(
      { id: "a", menuId: "explorer.context", commandId: "newFile" },
      { id: "b", menuId: "tab.actions", commandId: "closeAll" },
    );

    expect(matchMenuItems(registry, ctx, "explorer.context").map((item) => item.id)).toEqual(["a"]);
  });

  it("when 절이 false 인 항목은 건너뛴다", () => {
    const registry = registryWith(
      { id: "a", menuId: "explorer.context", commandId: "newFile", when: () => false },
      { id: "b", menuId: "explorer.context", commandId: "delete", when: () => true },
    );

    expect(matchMenuItems(registry, ctx, "explorer.context").map((item) => item.id)).toEqual(["b"]);
  });

  it("group 으로 먼저 정렬하고 group 안에서는 order 로 정렬한다", () => {
    const registry = registryWith(
      { id: "delete", menuId: "m", commandId: "delete", group: "9_danger", order: 0 },
      { id: "newFolder", menuId: "m", commandId: "newFolder", group: "1_create", order: 1 },
      { id: "newFile", menuId: "m", commandId: "newFile", group: "1_create", order: 0 },
    );

    expect(matchMenuItems(registry, ctx, "m").map((item) => item.id)).toEqual(["newFile", "newFolder", "delete"]);
  });

  it("group 이 없는 항목은 이름 있는 어떤 group 보다 앞에 온다", () => {
    const registry = registryWith(
      { id: "grouped", menuId: "m", commandId: "x", group: "a_group" },
      { id: "ungrouped", menuId: "m", commandId: "y" },
    );

    expect(matchMenuItems(registry, ctx, "m").map((item) => item.id)).toEqual(["ungrouped", "grouped"]);
  });

  it("when 절에 context registry 를 넘긴다", () => {
    const registry = registryWith({
      id: "a",
      menuId: "m",
      commandId: "x",
      when: (received) => received === ctx,
    });

    expect(matchMenuItems(registry, ctx, "m").map((item) => item.id)).toEqual(["a"]);
  });
});
