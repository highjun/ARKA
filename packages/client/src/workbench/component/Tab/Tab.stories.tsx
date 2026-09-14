import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tab } from "./index";
import type { TabGroupItem, TabGroupProps, TabSplitProps, TabTreeSplit } from "./index";

const ITEMS: readonly TabGroupItem[] = [
  { id: "readme", title: "README.md", iconId: "file", content: <div style={{ padding: 16 }}>README.md 내용</div> },
  {
    id: "main",
    title: "main.ts",
    iconId: "fileCode",
    isDirty: true,
    content: <div style={{ padding: 16 }}>main.ts 내용</div>,
  },
  {
    id: "preview",
    title: "notes.md",
    iconId: "file",
    isPreview: true,
    content: <div style={{ padding: 16 }}>미리보기 탭</div>,
  },
];

const SPLIT_TREE: TabTreeSplit = {
  kind: "split",
  id: "root",
  orientation: "horizontal",
  children: [
    { kind: "leaf", id: "left", activeTab: "readme", tabItems: ITEMS },
    { kind: "leaf", id: "right", activeTab: "main", tabItems: ITEMS.slice(0, 2) },
  ],
};

const meta = {
  title: "workbench/Tab",
  component: Tab,
  decorators: [
    (Story) => (
      <div style={{ height: 480, width: 720 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    activeTab: "readme",
    tabItems: ITEMS,
    onTabClick: () => undefined,
    onMenuClick: () => undefined,
    onTabClose: () => undefined,
  },
} satisfies Meta<typeof Tab>;

export default meta;

/** props가 `tree` 유무로 갈리는 유니온이라 `StoryObj<typeof meta>`는 never로 무너진다 — Group/Split 스토리 타입을 나눈다. */
type GroupStory = StoryObj<Meta<TabGroupProps>>;
type SplitStory = StoryObj<Meta<TabSplitProps>>;

export const Default: GroupStory = {};
/** 탭이 0개면 스트립 없이 `emptyMessage`만 그린다. */
export const Empty: GroupStory = { args: { activeTab: "", tabItems: [], emptyMessage: "탐색기에서 파일을 고르세요." } };
export const NoChrome: GroupStory = { args: { chrome: "none" } };
// Split은 `render`로 직접 그린다 — 메타 args(`activeTab`/`tabItems`)가 합쳐져 Split 루트 DOM으로 새는 걸 막는다.
export const Split: SplitStory = {
  render: () => (
    <Tab
      tree={SPLIT_TREE}
      activeLeaf="left"
      onTabClick={() => undefined}
      onMenuClick={() => undefined}
      onTabClose={() => undefined}
      style={{ height: "100%" }}
    />
  ),
};
export const SplitVertical: SplitStory = {
  render: () => (
    <Tab
      tree={{ ...SPLIT_TREE, orientation: "vertical" }}
      activeLeaf="right"
      onTabClick={() => undefined}
      onMenuClick={() => undefined}
      style={{ height: "100%" }}
    />
  ),
};
