import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "#component/Icon";
import { Tab } from "./index";
import type { TabGroup, TabItem, TabTree } from "./index";

/** 기본에서 띠가 넘치도록 넉넉히 둔다 — 넘칠 때의 모습도 스토리 하나 안에서 봐야 한다. */
const LEFT: readonly TabItem[] = [
  { id: "readme", title: "README.md", icon: <Icon iconId="file" size="sm" /> },
  { id: "main", title: "main.ts", icon: <Icon iconId="fileCode" size="sm" />, isDirty: true },
  { id: "notes", title: "notes.md", icon: <Icon iconId="file" size="sm" />, isPreview: true },
  { id: "package", title: "package.json", icon: <Icon iconId="fileCode" size="sm" /> },
  { id: "styles", title: "Tab.module.css", icon: <Icon iconId="file" size="sm" /> },
];

const RIGHT: readonly TabItem[] = [{ id: "settings", title: "설정", icon: <Icon iconId="settingsGear" size="sm" /> }];

const CONTENT: Record<string, string> = {
  readme: "README.md 내용",
  main: "main.ts 내용",
  notes: "미리보기 탭 내용",
  package: "package.json 내용",
  styles: "Tab.module.css 내용",
  settings: "설정 탭 내용",
};

const TREE: TabTree = {
  kind: "split",
  id: "root",
  orientation: "horizontal",
  children: [
    { kind: "group", id: "left", items: LEFT, activeItemId: "readme", size: 65 },
    { kind: "group", id: "right", items: RIGHT, activeItemId: "settings", size: 35 },
  ],
};

type Edge = "left" | "right" | "top" | "bottom";

const mapGroup = (node: TabTree, groupId: string, edit: (group: TabGroup) => TabTree): TabTree => {
  if (node.kind === "group") return node.id === groupId ? edit(node) : node;
  return { ...node, children: node.children.map((child) => mapGroup(child, groupId, edit)) };
};

const resizeChild = (node: TabTree, splitId: string, childId: string, size: number): TabTree =>
  node.kind === "group"
    ? node
    : {
        ...node,
        children: node.children.map((child) =>
          node.id === splitId && child.id === childId ? { ...child, size } : resizeChild(child, splitId, childId, size),
        ),
      };

const groupOfItem = (node: TabTree, itemId: string): TabGroup | undefined =>
  node.kind === "group"
    ? node.items.some((item) => item.id === itemId)
      ? node
      : undefined
    : node.children.map((child) => groupOfItem(child, itemId)).find((found) => found !== undefined);

/** `targetGroupId`는 **놓은 칸**이다 — 탭이 어느 칸에서 왔는지는 여기서 찾는다. */
const splitGroup = (tree: TabTree, targetGroupId: string, itemId: string, edge: Edge): TabTree => {
  const source = groupOfItem(tree, itemId);
  const moved = source?.items.find((item) => item.id === itemId);
  if (source === undefined || moved === undefined) return tree;
  if (source.id === targetGroupId && source.items.length < 2) return tree;

  const withoutMoved = mapGroup(tree, source.id, (group) => {
    const remaining = group.items.filter((item) => item.id !== itemId);
    return {
      ...group,
      items: remaining,
      activeItemId: group.activeItemId === itemId ? (remaining[0]?.id ?? null) : group.activeItemId,
    };
  });

  const created: TabGroup = {
    kind: "group",
    id: `${targetGroupId}:${itemId}`,
    items: [moved],
    activeItemId: itemId,
  };

  return mapGroup(withoutMoved, targetGroupId, (group) => ({
    kind: "split",
    id: `split:${targetGroupId}:${itemId}`,
    orientation: edge === "left" || edge === "right" ? "horizontal" : "vertical",
    size: group.size,
    children:
      edge === "left" || edge === "top"
        ? [created, { ...group, size: undefined }]
        : [{ ...group, size: undefined }, created],
  }));
};

/** 탭을 `beforeItemId` 앞으로 옮긴다 — 맨 뒤면 null. 같은 Group 이면 순서 바꾸기다. */
const moveItem = (tree: TabTree, targetGroupId: string, itemId: string, beforeItemId: string | null): TabTree => {
  const source = groupOfItem(tree, itemId);
  const moved = source?.items.find((item) => item.id === itemId);
  if (source === undefined || moved === undefined) return tree;

  const detached = mapGroup(tree, source.id, (group) => {
    const remaining = group.items.filter((item) => item.id !== itemId);
    return {
      ...group,
      items: remaining,
      activeItemId: group.activeItemId === itemId ? (remaining[0]?.id ?? null) : group.activeItemId,
    };
  });

  return mapGroup(detached, targetGroupId, (group) => {
    const at = beforeItemId === null ? -1 : group.items.findIndex((item) => item.id === beforeItemId);
    const index = at < 0 ? group.items.length : at;
    return {
      ...group,
      items: [...group.items.slice(0, index), moved, ...group.items.slice(index)],
      activeItemId: itemId,
    };
  });
};

/** 스토리에서도 실제로 눌리고 끌리도록, 트리를 들고 있는 얇은 껍데기. */
const InteractiveTab = ({ tree: initialTree }: { readonly tree: TabTree }) => {
  const [tree, setTree] = useState(initialTree);

  return (
    <Tab
      tree={tree}
      renderContent={(itemId) => <div style={{ padding: 16 }}>{CONTENT[itemId] ?? itemId}</div>}
      renderItemMenu={(_groupId, itemId) => <span>{itemId}</span>}
      emptyMessage="탐색기에서 파일을 고르세요."
      onItemSelect={(groupId, itemId) =>
        setTree((current) => mapGroup(current, groupId, (group) => ({ ...group, activeItemId: itemId })))
      }
      onItemClose={(groupId, itemId) =>
        setTree((current) =>
          mapGroup(current, groupId, (group) => ({ ...group, items: group.items.filter((i) => i.id !== itemId) })),
        )
      }
      onItemMove={(groupId, itemId, beforeItemId) =>
        setTree((current) => moveItem(current, groupId, itemId, beforeItemId))
      }
      onItemPin={(groupId, itemId) =>
        setTree((current) =>
          mapGroup(current, groupId, (group) => ({
            ...group,
            items: group.items.map((item) => (item.id === itemId ? { ...item, isPreview: false } : item)),
          })),
        )
      }
      onGroupSplit={(groupId, itemId, edge) => setTree((current) => splitGroup(current, groupId, itemId, edge))}
      onSplitResize={(splitId, childId, nextSize) =>
        setTree((current) => resizeChild(current, splitId, childId, nextSize))
      }
    />
  );
};

const meta = {
  title: "01-workbench/Tab",
  component: Tab,
  subcomponents: {
    Split: Tab.Split,
    Group: Tab.Group,
    Strip: Tab.Strip,
    Panel: Tab.Panel,
    Item: Tab.Item,
    Sash: Tab.Sash,
  },
  decorators: [
    (Story) => (
      <div style={{ height: 480, width: 720 }}>
        <Story />
      </div>
    ),
  ],
  args: { tree: TREE },
  render: (args) => <InteractiveTab tree={args.tree} />,
} satisfies Meta<typeof Tab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
