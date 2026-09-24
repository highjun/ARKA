import { useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PortalProvider } from "#lib/portal";
import { Icon } from "#ui/Icon";
import { Select } from "./index";

const MODELS = [
  { id: "opus", label: "Claude Opus 5" },
  { id: "sonnet", label: "Claude Sonnet 5" },
  { id: "haiku", label: "Claude Haiku 4.5", disabled: true },
];

const OverlayStage = ({ children }: { readonly children: ReactNode }) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  return (
    <div style={{ position: "relative", height: 320, width: 480, overflow: "hidden", transform: "translateZ(0)" }}>
      <PortalProvider container={container ?? undefined}>{children}</PortalProvider>
      <div ref={setContainer} />
    </div>
  );
};

const meta = {
  title: "00-shared/Select",
  component: Select,
  decorators: [
    (Story) => (
      <OverlayStage>
        <Story />
      </OverlayStage>
    ),
  ],
  render: (args) => (
    <Select {...args}>
      <Select.Trigger visual={<Icon iconId="brain" size="sm" />} value="Claude Opus 5" />
      <Select.Content>
        {MODELS.map((model) => (
          <Select.Item key={model.id} value={model.id} disabled={model.disabled}>
            {model.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select>
  ),
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { defaultOpen: true, defaultValue: "opus" } };
