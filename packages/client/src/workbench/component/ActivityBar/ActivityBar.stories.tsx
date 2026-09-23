import type { Meta, StoryObj } from "@storybook/react-vite";
import { ActivityBar } from "./index";
import type { ActivityBarItem } from "./index";

const TOP: readonly ActivityBarItem[] = [
  { id: "files", iconId: "files", title: "탐색기" },
  { id: "search", iconId: "search", title: "검색" },
  { id: "sourceControl", iconId: "sourceControl", title: "소스 제어" },
  { id: "agent", iconId: "brain", title: "에이전트" },
];

const BOTTOM: readonly ActivityBarItem[] = [
  { id: "account", iconId: "account", title: "계정" },
  { id: "settings", iconId: "settingsGear", title: "설정" },
];

const meta = {
  title: "01-workbench/ActivityBar",
  component: ActivityBar,
  subcomponents: { Top: ActivityBar.Top, Bottom: ActivityBar.Bottom },
  decorators: [
    (Story) => (
      <div style={{ height: 480, width: 48 }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <ActivityBar {...args}>
      <ActivityBar.Top items={TOP} defaultActiveId="files" onItemClick={() => undefined} />
      <ActivityBar.Bottom items={BOTTOM} onItemClick={() => undefined} />
    </ActivityBar>
  ),
} satisfies Meta<typeof ActivityBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
