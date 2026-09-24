import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "#ui/Icon";
import { ModeToggle } from "./index";

const meta = {
  title: "00-shared/ModeToggle",
  component: ModeToggle,
  args: {
    values: ["light", "dark"],
    labels: ["다크 모드로", "라이트 모드로"],
    onValueChange: () => undefined,
    children: [<Icon key="sun" iconId="sun" size="sm" />, <Icon key="moon" iconId="moon" size="sm" />],
  },
  argTypes: { children: { table: { disable: true } } },
} satisfies Meta<typeof ModeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
