import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";
import { Text } from "#component/Text";
import { CommandCenter } from "../CommandCenter";
import { TitleBar } from "./index";

const meta = {
  title: "01-workbench/TitleBar",
  component: TitleBar,
  decorators: [
    (Story) => (
      <div style={{ height: 35, width: 960 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    brand: <Text size="small">ARKA</Text>,
    center: <CommandCenter value="project" />,
    actions: (
      <>
        <Text size="small" tone="muted">
          2026-09-20 11:18(a1b2c3d)
        </Text>
        <IconButton variant="invisible" size="small" aria-label="알림" icon={() => <Icon iconId="bell" size="sm" />} />
        <IconButton variant="invisible" size="small" aria-label="밝기" icon={() => <Icon iconId="sun" size="sm" />} />
      </>
    ),
  },
} satisfies Meta<typeof TitleBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 가운데 칸이 비어도 좌우는 제자리다 — 격자가 잡기 때문이다. */
export const NoCenter: Story = { args: { center: undefined } };

/** 작업 공간 이름이 길어져도 가운데 칸이 안 밀린다. */
export const LongBrand: Story = {
  args: { brand: <Text size="small">아주 긴 작업 공간 이름이 여기 들어간다</Text> },
};
