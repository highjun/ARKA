import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";
import { Panel } from "./index";

const meta = {
  title: "01-workbench/Panel",
  component: Panel,
  decorators: [
    (Story) => (
      <div style={{ height: 480, width: 720 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    title: "탐색기",
    actions: (
      <IconButton
        variant="invisible"
        size="small"
        aria-label="새 파일"
        icon={() => <Icon iconId="newFile" size="sm" />}
      />
    ),
    children: <div style={{ padding: 8 }}>본문 내용</div>,
  },
} satisfies Meta<typeof Panel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const TitleOnly: Story = { args: { actions: undefined } };
export const NoHeader: Story = { args: { title: undefined, actions: undefined } };

export const Compact: Story = { args: { density: "compact" } };
