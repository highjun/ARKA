import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bottom } from "./index";
import type { BottomItem } from "./index";

const ITEMS: readonly BottomItem[] = [
  { id: "problems", title: "problems" },
  { id: "output", title: "output" },
  { id: "terminal", title: "terminal" },
];

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
      <Bottom.Header items={ITEMS} defaultActiveId="terminal" onClose={() => undefined} />
      <Bottom.Panel>
        <div style={{ padding: 8 }}>확장의 아래 창이 꽂히는 자리</div>
      </Bottom.Panel>
    </Bottom>
  ),
} satisfies Meta<typeof Bottom>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
