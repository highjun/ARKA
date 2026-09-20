import type { Meta, StoryObj } from "@storybook/react-vite";
import { CommandCenter } from "./index";

const meta = {
  title: "01-workbench/CommandCenter",
  component: CommandCenter,
  decorators: [
    (Story) => (
      <div style={{ width: 640 }}>
        <Story />
      </div>
    ),
  ],
  args: { value: "project" },
} satisfies Meta<typeof CommandCenter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongValue: Story = { args: { value: "아주 긴 작업 공간 이름이 여기 들어간다" } };
