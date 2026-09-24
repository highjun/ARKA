import { describe, expect, it } from "vitest";
import {
  canDropInto,
  compactFolderChains,
  dropParentIdOf,
  isApplePlatform,
  nextSelection,
  selectAll,
  selectionIncluding,
  selectionIntentOf,
} from "./shared";
import type { CompactableItem } from "./shared";

const ROWS = [{ id: "a" }, { id: "b" }, { id: "c", disabled: true }, { id: "d" }, { id: "e" }];

describe("isApplePlatform", () => {
  it("platform이 mac 계열이면 true다", () => {
    const original = navigator.platform;
    Object.defineProperty(navigator, "platform", { value: "MacIntel", configurable: true });
    expect(isApplePlatform()).toBe(true);
    Object.defineProperty(navigator, "platform", { value: original, configurable: true });
  });

  it("platform이 mac 계열이 아니면 false다", () => {
    const original = navigator.platform;
    Object.defineProperty(navigator, "platform", { value: "Win32", configurable: true });
    expect(isApplePlatform()).toBe(false);
    Object.defineProperty(navigator, "platform", { value: original, configurable: true });
  });
});

describe("selectionIntentOf", () => {
  it("mac에서는 metaKey가 토글이다", () => {
    expect(selectionIntentOf({ metaKey: true, ctrlKey: false, shiftKey: false }, true)).toBe("toggle");
  });

  it("mac에서는 ctrlKey가 토글이 아니다", () => {
    expect(selectionIntentOf({ metaKey: false, ctrlKey: true, shiftKey: false }, true)).toBe("replace");
  });

  it("mac이 아니면 ctrlKey가 토글이다", () => {
    expect(selectionIntentOf({ metaKey: false, ctrlKey: true, shiftKey: false }, false)).toBe("toggle");
  });

  it("mac이 아니면 metaKey가 토글이 아니다", () => {
    expect(selectionIntentOf({ metaKey: true, ctrlKey: false, shiftKey: false }, false)).toBe("replace");
  });

  it("shiftKey는 플랫폼과 무관하게 항상 range다", () => {
    expect(selectionIntentOf({ metaKey: false, ctrlKey: false, shiftKey: true }, true)).toBe("range");
    expect(selectionIntentOf({ metaKey: false, ctrlKey: false, shiftKey: true }, false)).toBe("range");
  });

  it("toggle 수식키와 shiftKey를 함께 누르면 rangeAdd다 — 고른 것 위에 범위를 얹는다", () => {
    expect(selectionIntentOf({ metaKey: true, ctrlKey: true, shiftKey: true }, true)).toBe("rangeAdd");
    expect(selectionIntentOf({ metaKey: false, ctrlKey: true, shiftKey: true }, false)).toBe("rangeAdd");
  });

  it("아무 수식키도 없으면 replace다", () => {
    expect(selectionIntentOf({ metaKey: false, ctrlKey: false, shiftKey: false }, true)).toBe("replace");
  });
});

describe("nextSelection", () => {
  it("replace는 대상 하나로 교체하고 앵커도 대상이 된다", () => {
    const result = nextSelection({ intent: "replace", current: ["a", "b"], order: ROWS, anchorId: "a", targetId: "d" });
    expect(result).toEqual({ ids: ["d"], anchorId: "d" });
  });

  it("toggle은 선택 안 된 대상을 추가한다", () => {
    const result = nextSelection({ intent: "toggle", current: ["a"], order: ROWS, anchorId: "a", targetId: "d" });
    expect(result).toEqual({ ids: ["a", "d"], anchorId: "d" });
  });

  it("toggle은 이미 선택된 대상을 제거한다", () => {
    const result = nextSelection({ intent: "toggle", current: ["a", "d"], order: ROWS, anchorId: "a", targetId: "d" });
    expect(result).toEqual({ ids: ["a"], anchorId: "d" });
  });

  it("range는 앵커~대상 구간을 order 순서로 자른다(정방향)", () => {
    const result = nextSelection({ intent: "range", current: ["a"], order: ROWS, anchorId: "a", targetId: "d" });
    expect(result.ids).toEqual(["a", "b", "d"]);
    expect(result.anchorId).toBe("a");
  });

  it("range는 대상이 앵커보다 앞이어도(역방향) 같은 구간을 만든다", () => {
    const result = nextSelection({ intent: "range", current: ["d"], order: ROWS, anchorId: "d", targetId: "a" });
    expect(result.ids).toEqual(["a", "b", "d"]);
    expect(result.anchorId).toBe("d");
  });

  it("앵커가 없으면(첫 조작) 대상을 앵커로 삼는다", () => {
    const result = nextSelection({ intent: "range", current: [], order: ROWS, anchorId: undefined, targetId: "b" });
    expect(result).toEqual({ ids: ["b"], anchorId: "b" });
  });

  it("앵커가 order에서 사라졌으면(접힘 등) 대상을 앵커로 삼는다", () => {
    const result = nextSelection({ intent: "range", current: [], order: ROWS, anchorId: "zzz", targetId: "b" });
    expect(result).toEqual({ ids: ["b"], anchorId: "b" });
  });

  it("range 결과에서 disabled 행이 빠진다", () => {
    const result = nextSelection({ intent: "range", current: [], order: ROWS, anchorId: "a", targetId: "e" });
    expect(result.ids).toEqual(["a", "b", "d", "e"]);
  });
});

describe("selectAll", () => {
  it("보이는 행 전부를 선택하되 disabled는 뺀다", () => {
    expect(selectAll(ROWS)).toEqual(["a", "b", "d", "e"]);
  });

  it("빈 목록이면 빈 배열이다", () => {
    expect(selectAll([])).toEqual([]);
  });
});

describe("selectionIncluding", () => {
  it("대상이 이미 선택 안에 있으면 선택 전체를 그대로 돌려준다", () => {
    expect(selectionIncluding(["a", "b", "d"], "b")).toEqual(["a", "b", "d"]);
  });

  it("대상이 선택 밖이면 대상 하나로 좁힌다", () => {
    expect(selectionIncluding(["a", "b"], "d")).toEqual(["d"]);
  });

  it("선택이 비어 있으면 대상 하나로 시작한다", () => {
    expect(selectionIncluding([], "a")).toEqual(["a"]);
  });
});

describe("compactFolderChains", () => {
  const folder = (id: string, name: string, children?: readonly CompactableItem[]): CompactableItem => ({
    id,
    name,
    type: "folder",
    children,
  });
  const file = (id: string, name: string): CompactableItem => ({ id, name, type: "file" });

  it("폴더 하나만 자식으로 둔 체인을 한 항목으로 합친다 — 이름을 경로로 잇는다", () => {
    const tree = [folder("a", "a", [folder("b", "b", [folder("c", "c", [file("c/f", "f.ts")])])])];

    const result = compactFolderChains(tree);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "c", name: "a/b/c" });
    expect(result[0]!.children).toEqual([{ id: "c/f", name: "f.ts", type: "file" }]);
  });

  it("병합된 항목의 id는 체인의 마지막(terminal) 폴더다 — 실제로 펼쳐지는 대상과 일치해야 한다", () => {
    const tree = [folder("a", "a", [folder("b", "b")])];

    const result = compactFolderChains(tree);

    expect(result[0]!.id).toBe("b");
  });

  it("폴더에 파일이 하나라도 있으면 체인을 끊는다", () => {
    const tree = [folder("a", "a", [folder("b", "b", [file("b/f", "f.ts")])])];

    const result = compactFolderChains(tree);

    expect(result[0]).toMatchObject({ id: "b", name: "a/b" });
    expect(result[0]!.children).toEqual([{ id: "b/f", name: "f.ts", type: "file" }]);
  });

  it("폴더에 자식이 둘 이상이면 압축하지 않는다", () => {
    const tree = [folder("a", "a", [folder("b", "b"), folder("c", "c")])];

    const result = compactFolderChains(tree);

    expect(result[0]).toMatchObject({ id: "a", name: "a" });
    expect(result[0]!.children).toHaveLength(2);
  });

  it("자식을 아직 안 읽어온 폴더(children undefined)는 압축하지 않는다", () => {
    const tree = [folder("a", "a", undefined)];

    const result = compactFolderChains(tree);

    expect(result[0]).toMatchObject({ id: "a", name: "a" });
  });

  it("파일은 그대로 둔다", () => {
    const tree = [file("f", "f.ts")];

    expect(compactFolderChains(tree)).toEqual(tree);
  });

  it("체인 전체(4단계)가 한 항목으로 합쳐진다 — 중간에 파일이 끼어야만 끊긴다", () => {
    const tree = [folder("a", "a", [folder("b", "b", [folder("x", "x", [folder("y", "y")])])])];

    const result = compactFolderChains(tree);

    expect(result[0]).toMatchObject({ id: "y", name: "a/b/x/y" });
  });

  it("체인 중간에 파일이 있는 형제가 끼면 그 지점에서 끊고, 남은 자식은 재귀적으로 압축한다", () => {
    const tree = [folder("a", "a", [folder("b", "b", [folder("x", "x", [folder("y", "y")]), file("b/f", "f.ts")])])];

    const result = compactFolderChains(tree);

    expect(result[0]).toMatchObject({ id: "b", name: "a/b" });
    expect(result[0]!.children).toEqual([
      { id: "y", name: "x/y", type: "folder", children: undefined },
      { id: "b/f", name: "f.ts", type: "file" },
    ]);
  });
});

describe("dropParentIdOf", () => {
  it("폴더 행은 그 폴더 자신이 목적지다", () => {
    expect(dropParentIdOf({ id: "src", type: "folder", parentId: null })).toBe("src");
  });

  it("파일 행은 그 파일이 든 폴더가 목적지다", () => {
    expect(dropParentIdOf({ id: "src/main.ts", type: "file", parentId: "src" })).toBe("src");
  });

  it("행 밖(바닥)은 루트가 목적지다", () => {
    expect(dropParentIdOf(undefined)).toBeNull();
  });

  it("루트에 놓인 파일 행도 루트가 목적지다", () => {
    expect(dropParentIdOf({ id: "package.json", type: "file", parentId: null })).toBeNull();
  });
});

describe("canDropInto", () => {
  const ORDER = [
    { id: "src", type: "folder" as const, parentId: null },
    { id: "src/components", type: "folder" as const, parentId: "src" },
    { id: "src/main.ts", type: "file" as const, parentId: "src" },
    { id: "locked", type: "folder" as const, parentId: null, disabled: true },
    { id: "readme.md", type: "file" as const, parentId: null },
  ];
  const rowOf = (id: string) => ORDER.find((row) => row.id === id)!;

  it("다른 폴더로는 갈 수 있다", () => {
    expect(canDropInto(rowOf("src/main.ts"), "src/components", ORDER)).toBe(true);
  });

  it("루트로 뺄 수 있다", () => {
    expect(canDropInto(rowOf("src/main.ts"), null, ORDER)).toBe(true);
  });

  it("이미 든 폴더로는 못 간다 — 제자리다", () => {
    expect(canDropInto(rowOf("src/main.ts"), "src", ORDER)).toBe(false);
  });

  it("이미 루트에 있는 것은 루트로 못 간다", () => {
    expect(canDropInto(rowOf("readme.md"), null, ORDER)).toBe(false);
  });

  it("자기 자신에게는 못 간다", () => {
    expect(canDropInto(rowOf("src"), "src", ORDER)).toBe(false);
  });

  it("자기 안쪽으로는 못 간다", () => {
    expect(canDropInto(rowOf("src"), "src/components", ORDER)).toBe(false);
  });

  it("비활성 폴더로는 못 간다", () => {
    expect(canDropInto(rowOf("src/main.ts"), "locked", ORDER)).toBe(false);
  });

  it("비활성 행은 끌어도 못 놓는다", () => {
    expect(canDropInto({ id: "x", type: "file", parentId: null, disabled: true }, "src", ORDER)).toBe(false);
  });

  it("파일은 목적지가 될 수 없다", () => {
    expect(canDropInto(rowOf("src/main.ts"), "readme.md", ORDER)).toBe(false);
  });
});
