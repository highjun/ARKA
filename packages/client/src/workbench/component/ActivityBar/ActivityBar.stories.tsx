import type { Meta, StoryObj } from "@storybook/react-vite";
import { Menu } from "#component/Menu";
import { ActivityBar } from "./index";
import type { SidebarRow } from "./index";

const ITEMS: readonly SidebarRow[] = [
  { id: "files", iconId: "files", title: "탐색기", isActive: true },
  { id: "search", iconId: "search", title: "검색", isActive: false },
  { id: "sourceControl", iconId: "sourceControl", title: "소스 제어", isActive: false },
  { id: "agent", iconId: "brain", title: "에이전트", isActive: false },
];

const meta = {
  title: "01-workbench/ActivityBar",
  component: ActivityBar,
  args: { items: ITEMS, onSelect: () => undefined, onSettingsSelect: () => undefined },
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
/** 사이드바가 하나도 없어도 설정 톱니는 남는다. */
export const Empty: Story = { args: { items: [] } };
export const NoneActive: Story = { args: { items: ITEMS.map((item) => ({ ...item, isActive: false })) } };
export const WithItemMenu: Story = {
  args: {
    renderItemMenu: (item) => <Menu.Item onSelect={() => undefined}>{item.title} 숨기기</Menu.Item>,
  },
};
