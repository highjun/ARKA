import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "./index";

const meta = {
  title: "00-shared/Icon",
  component: Icon,
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { iconId: "files" } };
