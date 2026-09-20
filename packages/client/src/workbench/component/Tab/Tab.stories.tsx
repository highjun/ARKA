import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "#component/Icon";
import { Tab } from "./index";
import type { PaneRowSplit, TabGroupProps, TabRow, TabSplitProps } from "./index";

const content = (text: string) => () => <div style={{ padding: 16 }}>{text}</div>;

const ROWS: readonly TabRow[] = [
  {
    id: "readme",
    kind: "file",
    title: "README.md",
    icon: <Icon iconId="file" size="sm" />,
    Content: content("README.md 내용"),
    isPreview: false,
    isDirty: false,
  },
  {
    id: "main",
    kind: "file",
    title: "main.ts",
    icon: <Icon iconId="fileCode" size="sm" />,
    Content: content("main.ts 내용"),
    isPreview: false,
    isDirty: true,
  },
  {
    id: "preview",
    kind: "file",
    title: "notes.md",
    icon: <Icon iconId="file" size="sm" />,
    Content: content("미리보기 탭"),
    isPreview: true,
    isDirty: false,
  },
];

const SPLIT_TREE: PaneRowSplit = {
  kind: "split",
  id: "root",
  orientation: "horizontal",
  children: [
    { kind: "leaf", id: "left", activeTabId: "readme", tabs: ROWS },
    { kind: "leaf", id: "right", activeTabId: "main", tabs: ROWS.slice(0, 2) },
  ],
};

const meta = {
  title: "01-workbench/Tab",
  component: Tab,
  decorators: [
    (Story) => (
      <div style={{ height: 480, width: 720 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    tabs: ROWS,
    activeTabId: "readme",
    onSelect: () => undefined,
    onClose: () => undefined,
  },
} satisfies Meta<typeof Tab>;

export default meta;

type GroupStory = StoryObj<Meta<TabGroupProps>>;
type SplitStory = StoryObj<Meta<TabSplitProps>>;

export const Default: GroupStory = {};
export const Empty: GroupStory = { args: { tabs: [], activeTabId: null, emptyMessage: "탐색기에서 파일을 고르세요." } };
export const NoChrome: GroupStory = { args: { chrome: "none" } };
export const Split: SplitStory = {
  render: () => (
    <Tab
      tree={SPLIT_TREE}
      activePaneId="left"
      onSelect={() => undefined}
      onClose={() => undefined}
      style={{ height: "100%" }}
    />
  ),
};
export const SplitVertical: SplitStory = {
  render: () => (
    <Tab
      tree={{ ...SPLIT_TREE, orientation: "vertical" }}
      activePaneId="right"
      onSelect={() => undefined}
      style={{ height: "100%" }}
    />
  ),
};
