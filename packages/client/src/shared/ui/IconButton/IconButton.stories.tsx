import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "#ui/Icon";
import { IconButton } from "./index";

const meta = {
  title: "00-shared/IconButton",
  component: IconButton,
  args: { "aria-label": "검색", icon: () => <Icon iconId="search" size="sm" /> },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
