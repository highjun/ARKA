import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "./index";

const meta = {
  title: "00-shared/Icon",
  component: Icon,
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { iconId: "files" } };
export const Sizes: Story = {
  args: { iconId: "files" },
  render: (args) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <Icon {...args} size="sm" />
      <Icon {...args} size="md" />
      <Icon {...args} size="lg" />
    </span>
  ),
};
