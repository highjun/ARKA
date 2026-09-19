import type { Meta, StoryObj } from "@storybook/react-vite";
import { Kbd } from "./index";

const meta = {
  title: "00-shared/Kbd",
  component: Kbd,
  args: { children: "Ctrl" },
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Combination: Story = {
  render: (args) => (
    <span style={{ display: "inline-flex", gap: 4 }}>
      <Kbd {...args}>Ctrl</Kbd>
      <Kbd {...args}>Shift</Kbd>
      <Kbd {...args}>P</Kbd>
    </span>
  ),
};
export const OnEmphasis: Story = {
  args: { tone: "onEmphasis" },
  decorators: [
    (Story) => (
      <div style={{ display: "inline-block", padding: 8, background: "var(--bgColor-accent-emphasis)" }}>
        <Story />
      </div>
    ),
  ],
};
