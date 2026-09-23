import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";
import { Bottom } from "./index";
import type { BottomTab } from "./index";

const TABS: readonly BottomTab[] = [
  { id: "problems", title: "PROBLEMS", iconId: "warning", isActive: false },
  { id: "output", title: "OUTPUT", iconId: "file", isActive: false },
  { id: "terminal", title: "TERMINAL", iconId: "monitor", isActive: true },
];

const 동작 = (
  <>
    <IconButton variant="invisible" size="small" aria-label="새 터미널" icon={() => <Icon iconId="add" size="sm" />} />
    <IconButton
      variant="invisible"
      size="small"
      aria-label="더 보기"
      icon={() => <Icon iconId="ellipsis" size="sm" />}
    />
    <IconButton
      variant="invisible"
      size="small"
      aria-label="아래 창 닫기"
      icon={() => <Icon iconId="close" size="sm" />}
    />
  </>
);

const meta = {
  title: "01-workbench/Bottom",
  component: Bottom,
  subcomponents: { Header: Bottom.Header, Panel: Bottom.Panel },
  decorators: [
    (Story) => (
      <div style={{ width: 720 }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <Bottom {...args}>
      <Bottom.Header tabs={TABS} actions={동작} />
      <Bottom.Panel>
        <div style={{ padding: 8 }}>확장의 아래 창이 꽂히는 자리</div>
      </Bottom.Panel>
    </Bottom>
  ),
} satisfies Meta<typeof Bottom>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
