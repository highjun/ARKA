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
