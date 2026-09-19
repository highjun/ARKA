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

/** props가 `tree` 유무로 갈리는 유니온이라 `StoryObj<typeof meta>`는 never로 무너진다 — Group/Split 스토리 타입을 나눈다. */
type GroupStory = StoryObj<Meta<TabGroupProps>>;
type SplitStory = StoryObj<Meta<TabSplitProps>>;

export const Default: GroupStory = {};
/** 탭이 0개면 스트립 없이 `emptyMessage`만 그린다. */
export const Empty: GroupStory = { args: { tabs: [], activeTabId: null, emptyMessage: "탐색기에서 파일을 고르세요." } };
export const NoChrome: GroupStory = { args: { chrome: "none" } };
// Split은 `render`로 직접 그린다 — 메타 args(`tabs`/`activeTabId`)가 합쳐져 Split 루트 DOM으로 새는 걸 막는다.
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
