import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "#component/Icon";
import { Tab } from "./index";
import type { TabGroupProps, TabRow } from "./index";

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

const meta = {
  title: "01-workbench/Tab",
  component: Tab,
  subcomponents: { Header: Tab.Header, Strip: Tab.Strip, Group: Tab.Group, Split: Tab.Split },
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

export const Default: GroupStory = {};
