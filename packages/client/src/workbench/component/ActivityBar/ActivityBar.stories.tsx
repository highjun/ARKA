import type { Meta, StoryObj } from "@storybook/react-vite";
import { Menu } from "#component/Menu";
import { ActivityBar } from "./index";
import type { SidebarRow } from "./index";

const TOP: readonly SidebarRow[] = [
  { id: "files", iconId: "files", title: "탐색기" },
  { id: "search", iconId: "search", title: "검색" },
  { id: "sourceControl", iconId: "sourceControl", title: "소스 제어" },
  { id: "agent", iconId: "brain", title: "에이전트" },
];

const BOTTOM: readonly SidebarRow[] = [
  { id: "account", iconId: "account", title: "계정" },
  { id: "settings", iconId: "settingsGear", title: "설정" },
];

const meta = {
  title: "01-workbench/ActivityBar",
  component: ActivityBar,
  args: {
    children: (
      <>
        <ActivityBar.Top items={TOP} activeId="files" onSelect={() => undefined} />
        <ActivityBar.Bottom items={BOTTOM} onSelect={() => undefined} />
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ height: 480, width: 48 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ActivityBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const EmptyTop: Story = {
  args: {
    children: (
      <>
        <ActivityBar.Top items={[]} onSelect={() => undefined} />
        <ActivityBar.Bottom items={BOTTOM} onSelect={() => undefined} />
      </>
    ),
  },
};

export const TopOnly: Story = {
  args: { children: <ActivityBar.Top items={TOP} activeId="files" onSelect={() => undefined} /> },
};

export const NoneActive: Story = {
  args: {
    children: (
      <>
        <ActivityBar.Top items={TOP} onSelect={() => undefined} />
        <ActivityBar.Bottom items={BOTTOM} onSelect={() => undefined} />
      </>
    ),
  },
};

export const WithItemMenu: Story = {
  args: {
    children: (
      <ActivityBar.Top
        items={TOP}
        activeId="files"
        onSelect={() => undefined}
        renderItemMenu={(item) => <Menu.Item onSelect={() => undefined}>{item.title} 숨기기</Menu.Item>}
      />
    ),
  },
};
