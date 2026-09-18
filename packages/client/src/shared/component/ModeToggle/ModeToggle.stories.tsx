import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "#component/Icon";
import { ModeToggle } from "./index";

const meta = {
  title: "00-shared/ModeToggle",
  component: ModeToggle,
  args: {
    values: ["light", "dark"],
    labels: ["다크 모드로", "라이트 모드로"],
    children: [<Icon key="sun" iconId="sun" size="sm" />, <Icon key="moon" iconId="moon" size="sm" />],
    onValueChange: () => undefined,
  },
} satisfies Meta<typeof ModeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Dark: Story = { args: { defaultValue: "dark" } };
export const Disabled: Story = { args: { disabled: true } };
