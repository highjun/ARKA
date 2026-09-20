import { useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PortalProvider } from "#utils/portal";
import { CommandPalette } from "./index";
import type { CommandRow } from "./index";

const ROWS: readonly CommandRow[] = [
  { id: "newFile", label: "새 파일", keybinding: "ctrl+n" },
  { id: "newFolder", label: "새 폴더", keybinding: "" },
  { id: "toggleTheme", label: "테마 전환", keybinding: "ctrl+shift+t" },
  { id: "openPalette", label: "커맨드 팔레트", keybinding: "ctrl+shift+p" },
];

const OverlayStage = ({ children }: { readonly children: ReactNode }) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  return (
    <div style={{ position: "relative", height: 480, width: 720, overflow: "hidden", transform: "translateZ(0)" }}>
      <PortalProvider container={container ?? undefined}>{children}</PortalProvider>
      <div ref={setContainer} />
    </div>
  );
};

const meta = {
  title: "01-workbench/CommandPalette",
  component: CommandPalette,
  decorators: [
    (Story) => (
      <OverlayStage>
        <Story />
      </OverlayStage>
    ),
  ],
  args: { open: true, query: "", rows: ROWS, onSelect: () => undefined, onOpenChange: () => undefined },
} satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { rows: [] } };
export const NoMatch: Story = { args: { query: "없는 명령" } };
