import type { Meta, StoryObj } from "@storybook/react-vite";
import { Text } from "./index";

const meta = {
  title: "shared/Text",
  component: Text,
  args: { children: "본문 텍스트" },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Sizes: Story = {
  render: (args) => (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 16 }}>
      <Text {...args} size="small">
        small
      </Text>
      <Text {...args} size="medium">
        medium
      </Text>
      <Text {...args} size="large">
        large
      </Text>
    </span>
  ),
};
export const Tones: Story = {
  render: (args) => (
    <span style={{ display: "inline-flex", gap: 16 }}>
      <Text {...args} tone="default">
        default
      </Text>
      <Text {...args} tone="muted">
        muted
      </Text>
      <Text {...args} tone="danger">
        danger
      </Text>
    </span>
  ),
};
