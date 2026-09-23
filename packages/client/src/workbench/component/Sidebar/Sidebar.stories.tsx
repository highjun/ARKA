import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { isNarrowViewport } from "#utils/story";
import { Sidebar } from "./index";
import type { SidebarItem } from "./index";

const TOP: readonly SidebarItem[] = [
  { id: "files", iconId: "files", title: "탐색기" },
  { id: "search", iconId: "search", title: "검색" },
  { id: "sourceControl", iconId: "sourceControl", title: "소스 제어" },
  { id: "agent", iconId: "brain", title: "에이전트" },
];

const BOTTOM: readonly SidebarItem[] = [
  { id: "account", iconId: "account", title: "계정" },
  { id: "settings", iconId: "settingsGear", title: "설정" },
];

/**
 * 스토리에서도 실제로 고르고 접히도록, 활성 사이드바를 들고 있는 얇은 껍데기.
 * 레일은 제어 상태로 두고 패널은 그것을 따라간다 — 앱에서 ShellViewModel 이 하는 일과 같은 꼴이다.
 * 좁은 화면에는 접힘이 없다는 규칙도 같이 흉내 낸다.
 */
const InteractiveSidebar = ({ narrow }: { readonly narrow: boolean }) => {
  const [activeId, setActiveId] = useState<string | null>("files");
  const active = TOP.find((item) => item.id === activeId);

  return (
    <Sidebar>
      <Sidebar.RailTop
        items={TOP}
        activeId={activeId}
        onItemClick={(id) => setActiveId((current) => (current === id && !narrow ? null : id))}
      />
      <Sidebar.RailBottom items={BOTTOM} onItemClick={() => undefined} />
      {active === undefined ? null : (
        <Sidebar.Panel title={active.title} body={<div style={{ padding: 8 }}>{active.title} 본문</div>} />
      )}
    </Sidebar>
  );
};

const meta = {
  title: "01-workbench/Sidebar",
  component: Sidebar,
  subcomponents: {
    RailTop: Sidebar.RailTop,
    RailBottom: Sidebar.RailBottom,
    Panel: Sidebar.Panel,
  },
  decorators: [
    (Story) => (
      <div style={{ height: 480, width: 348 }}>
        <Story />
      </div>
    ),
  ],
  render: (_args, { globals }) => <InteractiveSidebar narrow={isNarrowViewport(globals)} />,
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
