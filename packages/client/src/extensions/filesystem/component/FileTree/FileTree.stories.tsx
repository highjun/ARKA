import { useState } from "react";
import type { ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Menu } from "#component/Menu";
import { FileTree } from "./index";
import type { FileTreeItem } from "./index";

const ITEMS: readonly FileTreeItem[] = [
  {
    id: "src",
    name: "src",
    type: "folder",
    children: [
      {
        id: "src/components",
        name: "components",
        type: "folder",
        children: [
          { id: "src/components/Button.tsx", name: "Button.tsx", type: "file" },
          { id: "src/components/Button.module.css", name: "Button.module.css", type: "file" },
        ],
      },
      { id: "src/main.ts", name: "main.ts", type: "file" },
      { id: "src/index.html", name: "index.html", type: "file" },
    ],
  },
  { id: "docs", name: "docs", type: "folder", children: [{ id: "docs/README.md", name: "README.md", type: "file" }] },
  { id: "package.json", name: "package.json", type: "file" },
  { id: "tsconfig.json", name: "tsconfig.json", type: "file" },
];

const parentIdOf = (id: string) => (id.includes("/") ? id.slice(0, id.lastIndexOf("/")) : "");

const idOf = (parentId: string, name: string) => (parentId === "" ? name : `${parentId}/${name}`);

/** 옮기거나 이름을 바꾼 가지는 id 도 새 경로를 따른다 — 실제 파일 경로처럼 움직이게. */
const reparent = (item: FileTreeItem, parentId: string): FileTreeItem => {
  const id = idOf(parentId, item.name);
  return { ...item, id, children: item.children?.map((child) => reparent(child, id)) };
};

const withoutItem = (items: readonly FileTreeItem[], id: string): readonly FileTreeItem[] =>
  items
    .filter((item) => item.id !== id)
    .map((item) => (item.children === undefined ? item : { ...item, children: withoutItem(item.children, id) }));

const withItemInside = (
  items: readonly FileTreeItem[],
  folderId: string,
  moved: FileTreeItem,
): readonly FileTreeItem[] =>
  items.map((item) => {
    if (item.id === folderId) return { ...item, children: [...(item.children ?? []), reparent(moved, item.id)] };
    return item.children === undefined ? item : { ...item, children: withItemInside(item.children, folderId, moved) };
  });

const withItemRenamed = (items: readonly FileTreeItem[], id: string, name: string): readonly FileTreeItem[] =>
  items.map((item) => {
    if (item.id === id) return reparent({ ...item, name }, parentIdOf(item.id));
    return item.children === undefined ? item : { ...item, children: withItemRenamed(item.children, id, name) };
  });

/** 파일을 끌어 옮기고 우클릭으로 이름을 바꾸거나 지우는 자리 — 트리가 실제로 움직이는 것을 본다. */
const InteractiveFileTree = (props: ComponentProps<typeof FileTree>) => {
  const { items: initialItems, ...rest } = props;
  const [items, setItems] = useState(initialItems);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [target, setTarget] = useState<FileTreeItem | undefined>(undefined);

  /** `folder`가 `null`이면 맨 바깥(루트)으로 뺀다. */
  const handleItemDrop = (sources: readonly FileTreeItem[], folder: FileTreeItem | null) => {
    setItems((current) =>
      sources.reduce<readonly FileTreeItem[]>((rows, source) => {
        const without = withoutItem(rows, source.id);
        return folder === null ? [...without, reparent(source, "")] : withItemInside(without, folder.id, source);
      }, current),
    );
  };

  const handleEditCommit = (item: FileTreeItem, value: string) => {
    setEditingId(undefined);
    const name = value.trim();
    if (name === "" || name === item.name) return;
    setItems((current) => withItemRenamed(current, item.id, name));
  };

  return (
    <Menu
      kind="context"
      onOpenChange={(open) => {
        if (!open) setTarget(undefined);
      }}
    >
      <Menu.Trigger style={{ display: "block", height: "100%" }}>
        <FileTree
          {...rest}
          items={items}
          editingId={editingId}
          onContextMenu={(item) => setTarget(item)}
          onItemDrop={handleItemDrop}
          onEditCommit={handleEditCommit}
          onEditCancel={() => setEditingId(undefined)}
        />
      </Menu.Trigger>
      {target === undefined ? null : (
        <Menu.Content>
          <Menu.Label>{target.name}</Menu.Label>
          <Menu.Item onSelect={() => setEditingId(target.id)}>이름 바꾸기</Menu.Item>
          <Menu.Separator />
          <Menu.Item onSelect={() => setItems((current) => withoutItem(current, target.id))}>지우기</Menu.Item>
        </Menu.Content>
      )}
    </Menu>
  );
};

const meta = {
  title: "02-filesystem/FileTree",
  component: FileTree,
  decorators: [
    (Story) => (
      <div style={{ height: 480, width: 320 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    items: ITEMS,
    defaultExpandedIds: ["src", "src/components"],
    defaultSelectedIds: ["src/main.ts"],
    onActivate: () => undefined,
  },
} satisfies Meta<typeof FileTree>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <InteractiveFileTree {...args} />,
};
