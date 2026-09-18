import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "./index";

/** 프리미티브라 상태가 없다 — 빈/로딩/에러를 지어내지 않고 크기 변화만 남긴다. */
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
