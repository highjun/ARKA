import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";
import { Text } from "#component/Text";
import { CommandPalette } from "../CommandPalette";
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
  render: (args) => (
    <TitleBar
      {...args}
      brand={<Text size="small">ARKA</Text>}
      center={<CommandPalette.Trigger keybinding="ctrl+k" />}
      actions={
        <>
          <Text size="small" tone="muted">
            2026-09-20 11:18(a1b2c3d)
          </Text>
          <IconButton
            variant="invisible"
            size="small"
            aria-label="알림"
            icon={() => <Icon iconId="bell" size="sm" />}
          />
          <IconButton variant="invisible" size="small" aria-label="밝기" icon={() => <Icon iconId="sun" size="sm" />} />
        </>
      }
    />
  ),
} satisfies Meta<typeof TitleBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
