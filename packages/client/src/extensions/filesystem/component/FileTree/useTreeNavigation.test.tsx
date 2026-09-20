import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { flattenVisible, useTreeNavigation } from "./useTreeNavigation";
import type { FileTreeItem } from "./FileTree";
import type { FlatTreeNode } from "./useTreeNavigation";

const ITEMS: FileTreeItem[] = [
  {
    id: "src",
    name: "src",
    type: "folder",
    children: [
      { id: "a", name: "a.ts", type: "file" },
      { id: "b", name: "b.ts", type: "file" },
    ],
  },
  { id: "readme", name: "README.md", type: "file" },
];

describe("flattenVisible", () => {
  it("collapsed 폴더의 자식은 평탄화 결과에 없다", () => {
    const flat = flattenVisible(ITEMS, new Set());

    expect(flat.map((node) => node.item.id)).toEqual(["src", "readme"]);
  });

  it("펼친 폴더의 자식이 바로 다음 순서에 이어진다", () => {
    const flat = flattenVisible(ITEMS, new Set(["src"]));

    expect(flat.map((node) => node.item.id)).toEqual(["src", "a", "b", "readme"]);
  });

  it("level과 parentId를 중첩 깊이에 맞게 부여한다", () => {
    const flat = flattenVisible(ITEMS, new Set(["src"]));

    expect(flat.find((node) => node.item.id === "src")).toMatchObject({ level: 1, parentId: null });
    expect(flat.find((node) => node.item.id === "a")).toMatchObject({ level: 2, parentId: "src" });
    expect(flat.find((node) => node.item.id === "readme")).toMatchObject({ level: 1, parentId: null });
  });

  it("자식이 없는 폴더가 expandedIds에 있어도 안전하다", () => {
    const flat = flattenVisible([{ id: "empty", name: "empty", type: "folder" }], new Set(["empty"]));

    expect(flat.map((node) => node.item.id)).toEqual(["empty"]);
  });
});

const noop = () => {};

const TreeNavigationFixture = ({
  items,
  expandedIds,
  initialFocusedId,
  onToggleFolder,
  onActivateRow = noop,
  onExtendSelection = noop,
  onSelectAll = noop,
  onFocusMoved = noop,
}: {
  readonly items: readonly FileTreeItem[];
  readonly expandedIds: ReadonlySet<string>;
  readonly initialFocusedId?: string;
  readonly onToggleFolder?: (item: FileTreeItem, expanded: boolean) => void;
  readonly onActivateRow?: (node: FlatTreeNode) => void;
  readonly onExtendSelection?: (node: FlatTreeNode) => void;
  readonly onSelectAll?: () => void;
  readonly onFocusMoved?: (id: string) => void;
}) => {
  const { flat, effectiveFocusedId, registerNode, onRowKeyDown, setFocusedId } = useTreeNavigation(
    items,
    expandedIds,
    initialFocusedId,
    onToggleFolder,
    onActivateRow,
    onExtendSelection,
    onSelectAll,
    onFocusMoved,
  );

  return (
    <ul role="tree">
      {flat.map((node) => (
        <li
          key={node.item.id}
          ref={registerNode(node.item.id)}
          role="treeitem"
          aria-label={node.item.name}
          aria-selected={false}
          tabIndex={node.item.id === effectiveFocusedId ? 0 : -1}
          onFocus={() => setFocusedId(node.item.id)}
          onKeyDown={onRowKeyDown(node)}
        >
          {node.item.name}
        </li>
      ))}
    </ul>
  );
};

describe("useTreeNavigation hook", () => {
  it("처음엔 flat의 첫 항목이 유효 포커스(effectiveFocusedId)다", () => {
    render(<TreeNavigationFixture items={ITEMS} expandedIds={new Set()} />);

    expect(screen.getByRole("treeitem", { name: "src" })).toHaveAttribute("tabindex", "0");
  });

  it("registerNode로 등록된 노드에 focusNode(ArrowDown)가 실제로 포커스를 옮긴다", () => {
    render(<TreeNavigationFixture items={ITEMS} expandedIds={new Set()} />);

    const src = screen.getByRole("treeitem", { name: "src" });
    const readme = screen.getByRole("treeitem", { name: "README.md" });
    act(() => src.focus());
    fireEvent.keyDown(src, { key: "ArrowDown" });

    expect(readme).toHaveFocus();
  });

  it("focusedId가 flat에서 사라지면 effectiveFocusedId가 첫 항목으로 자가치유한다", () => {
    const { rerender } = render(<TreeNavigationFixture items={ITEMS} expandedIds={new Set(["src"])} />);

    const a = screen.getByRole("treeitem", { name: "a.ts" });
    fireEvent.focus(a);
    expect(a).toHaveAttribute("tabindex", "0");

    rerender(<TreeNavigationFixture items={ITEMS} expandedIds={new Set()} />);

    expect(screen.getByRole("treeitem", { name: "src" })).toHaveAttribute("tabindex", "0");
  });

  it("Enter는 onActivateRow를 그 행으로 부른다", () => {
    const onActivateRow = vi.fn();
    render(<TreeNavigationFixture items={ITEMS} expandedIds={new Set()} onActivateRow={onActivateRow} />);

    fireEvent.keyDown(screen.getByRole("treeitem", { name: "src" }), { key: "Enter" });

    expect(onActivateRow).toHaveBeenCalledWith(
      expect.objectContaining({ item: expect.objectContaining({ id: "src" }) }),
    );
  });

  it("수식키 없는 ArrowDown은 onFocusMoved만 부르고 onExtendSelection은 안 부른다", () => {
    const onFocusMoved = vi.fn();
    const onExtendSelection = vi.fn();
    render(
      <TreeNavigationFixture
        items={ITEMS}
        expandedIds={new Set()}
        onFocusMoved={onFocusMoved}
        onExtendSelection={onExtendSelection}
      />,
    );

    fireEvent.keyDown(screen.getByRole("treeitem", { name: "src" }), { key: "ArrowDown" });

    expect(onFocusMoved).toHaveBeenCalledWith("readme");
    expect(onExtendSelection).not.toHaveBeenCalled();
  });

  it("Shift+ArrowDown은 onExtendSelection만 부르고 onFocusMoved는 안 부른다", () => {
    const onFocusMoved = vi.fn();
    const onExtendSelection = vi.fn();
    render(
      <TreeNavigationFixture
        items={ITEMS}
        expandedIds={new Set()}
        onFocusMoved={onFocusMoved}
        onExtendSelection={onExtendSelection}
      />,
    );

    fireEvent.keyDown(screen.getByRole("treeitem", { name: "src" }), { key: "ArrowDown", shiftKey: true });

    expect(onExtendSelection).toHaveBeenCalledWith(
      expect.objectContaining({ item: expect.objectContaining({ id: "readme" }) }),
    );
    expect(onFocusMoved).not.toHaveBeenCalled();
  });

  it("Ctrl+A는 onSelectAll을 부른다", () => {
    const onSelectAll = vi.fn();
    render(<TreeNavigationFixture items={ITEMS} expandedIds={new Set()} onSelectAll={onSelectAll} />);

    fireEvent.keyDown(screen.getByRole("treeitem", { name: "src" }), { key: "a", ctrlKey: true });

    expect(onSelectAll).toHaveBeenCalledTimes(1);
  });
});
