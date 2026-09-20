import type { Meta, StoryObj } from "@storybook/react-vite";
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

const meta = {
  title: "filesystem/FileTree",
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

export const Default: Story = {};
export const Empty: Story = { args: { items: [], emptyLabel: "파일이 없습니다" } };
export const Collapsed: Story = { args: { defaultExpandedIds: [], defaultSelectedIds: [] } };
export const Bordered: Story = { args: { chrome: "bordered" } };
export const Loading: Story = {
  args: {
    items: [
      { id: "src", name: "src", type: "folder", loading: true, children: [] },
      { id: "package.json", name: "package.json", type: "file" },
    ],
    defaultExpandedIds: [],
    defaultSelectedIds: [],
  },
};
export const Editing: Story = {
  args: { editingId: "src/main.ts", onEditCommit: () => undefined, onEditCancel: () => undefined },
};
