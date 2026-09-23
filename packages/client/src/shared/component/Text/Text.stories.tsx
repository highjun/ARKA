import type { Meta, StoryObj } from "@storybook/react-vite";
import { Text } from "./index";

const meta = {
  title: "00-shared/Text",
  component: Text,
  args: { children: "본문 텍스트" },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
