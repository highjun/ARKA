import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { isNarrowViewport } from "#lib/story";
import { Shell } from "./index";
import type { ShellProps } from "./Shell";
import type { SidebarItem } from "../Sidebar";

const SIDEBARS: readonly SidebarItem[] = [
  { id: "files", iconId: "files", title: "탐색기" },
  { id: "search", iconId: "search", title: "검색" },
  { id: "agent", iconId: "brain", title: "에이전트" },
];

/**
 * 스토리에서도 실제로 접히고 펴지도록, 활성 사이드바와 아래 창을 들고 있는 얇은 껍데기.
 * 좁은 화면 규칙(활성을 다시 눌러도 안 접힌다)까지 ShellViewModel 과 같은 꼴로 흉내 낸다.
 */
const InteractiveShell = ({ activeSidebarId: initialActiveSidebarId, ...args }: ShellProps) => {
  const [activeSidebarId, setActiveSidebarId] = useState(initialActiveSidebarId ?? null);
  const [bottomOpen, setBottomOpen] = useState(false);
  const narrow = args.isNarrow === true;
  /** 좁은 화면에는 접힘이 없다 — 비어 있으면 첫 사이드바가 선다. */
  const activeId = narrow ? (activeSidebarId ?? SIDEBARS[0]?.id ?? null) : activeSidebarId;

  return (
    <Shell
      {...args}
      activeSidebarId={activeId}
      sidebarTitle={SIDEBARS.find((sidebar) => sidebar.id === activeId)?.title}
      onSidebarSelect={(id) => setActiveSidebarId((current) => (current === id && !narrow ? null : id))}
      onSidebarToggle={() => setActiveSidebarId((current) => (current === null ? (SIDEBARS[0]?.id ?? null) : null))}
      renderSidebarContent={(id) => <div style={{ padding: 8 }}>{id} 패널 내용</div>}
      bottomContent={bottomOpen ? <div style={{ padding: 16 }}>터미널 내용</div> : undefined}
      onBottomToggle={() => setBottomOpen((current) => !current)}
      buildTimestamp="2026-09-20 11:18"
      buildSha="a1b2c3d"
      notificationCount={3}
      onNotificationsOpen={() => undefined}
    />
  );
};

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
    brandName: "ARKA",
    sidebars: SIDEBARS,
    activeSidebarId: "files",
    bottoms: [{ id: "terminal", title: "터미널" }],
    onBottomSelect: () => undefined,
    children: <div style={{ padding: 16 }}>본문 — 탭 등 무엇이든 여기 놓인다.</div>,
  },
  argTypes: { children: { table: { disable: true } } },
  render: (args, { globals }) => <InteractiveShell {...args} isNarrow={isNarrowViewport(globals)} />,
} satisfies Meta<typeof Shell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
