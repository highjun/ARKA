import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";
import { Shell } from "./index";
import type { SidebarRow } from "../ActivityBar";

const SIDEBARS: readonly SidebarRow[] = [
  { id: "files", iconId: "files", title: "탐색기", isActive: true },
  { id: "search", iconId: "search", title: "검색", isActive: false },
  { id: "agent", iconId: "brain", title: "에이전트", isActive: false },
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
    brand: <span style={{ fontWeight: 600, paddingInline: 8 }}>ARKASHIC</span>,
    actions: (
      <IconButton variant="invisible" size="small" aria-label="알림" icon={() => <Icon iconId="bell" size="sm" />} />
    ),
    sidebars: SIDEBARS,
    onSidebarSelect: () => undefined,
    sidebarTitle: "탐색기",
    sidebarActions: [{ actionId: "filesystem.newFile", iconId: "file", label: "새 파일" }],
    sidebarContent: <div style={{ padding: 8 }}>패널 내용</div>,
    children: <div style={{ padding: 16 }}>본문 — 탭 등 무엇이든 여기 놓인다.</div>,
  },
} satisfies Meta<typeof Shell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Dark: Story = { args: { colorMode: "dark" } };
/** 패널 콘텐츠가 없으면 활동 레일만 남아 사이드바가 좁게 뜬다. */
export const Collapsed: Story = { args: { sidebarContent: undefined } };
/** `sidebars`가 없으면 사이드바 자체가 없다. */
export const NoSidebar: Story = { args: { sidebars: undefined } };
export const Resizable: Story = { args: { sidebarResizable: true } };
/** 아래 창 — 터미널 같은 것이 온다. */
export const WithBottom: Story = {
  args: {
    bottoms: [
      { id: "terminal", iconId: "bell", title: "터미널", isActive: true },
      { id: "problems", iconId: "warning", title: "문제", isActive: false },
    ],
    bottomContent: <div style={{ padding: 8 }}>터미널 내용</div>,
  },
};
