import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";
import { Shell } from "./index";
import type { ActivityBarItem } from "../ActivityBar";

const SIDEBARS: readonly ActivityBarItem[] = [
  { id: "files", iconId: "files", title: "탐색기" },
  { id: "search", iconId: "search", title: "검색" },
  { id: "agent", iconId: "brain", title: "에이전트" },
];

const meta = {
  title: "01-workbench/Shell",
  component: Shell,
  decorators: [
    (Story) => (
      <div style={{ height: 480, width: 720 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    colorMode: "light",
    sidebars: SIDEBARS,
    onSidebarSelect: () => undefined,
    sidebarTitle: "탐색기",
    sidebarActions: [{ actionId: "filesystem.newFile", iconId: "file", label: "새 파일" }],
    bottoms: [{ id: "terminal", iconId: "monitor", title: "터미널", isActive: false }],
    onBottomSelect: () => undefined,
    onSidebarToggle: () => undefined,
    onBottomToggle: () => undefined,
    children: <div style={{ padding: 16 }}>본문 — 탭 등 무엇이든 여기 놓인다.</div>,
  },
  argTypes: { children: { table: { disable: true } } },
  render: (args) => (
    <Shell
      {...args}
      brand={<span style={{ fontWeight: 600, paddingInline: 8 }}>ARKA</span>}
      actions={
        <IconButton variant="invisible" size="small" aria-label="알림" icon={() => <Icon iconId="bell" size="sm" />} />
      }
      sidebarContent={<div style={{ padding: 8 }}>패널 내용</div>}
    />
  ),
} satisfies Meta<typeof Shell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
