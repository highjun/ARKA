import { useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { PortalProvider } from "#utils/portal";
import { CommandPalette } from "./index";
import type { CommandPaletteItem } from "./index";

const ITEMS: readonly CommandPaletteItem[] = [
  { id: "newFile", label: "새 파일", shortcut: ["Ctrl", "N"] },
  { id: "newFolder", label: "새 폴더" },
  { id: "toggleTheme", label: "테마 전환", shortcut: ["Ctrl", "Shift", "T"] },
  { id: "openPalette", label: "커맨드 팔레트", shortcut: ["Ctrl", "Shift", "P"] },
];

/**
 * 팔레트는 포탈로 `document.body`에 뜨는데 VRT는 `#storybook-root`만 찍는다 — 포탈 대상을 이
 * 상자 안으로 돌리고, `transform`으로 fixed 포지션의 기준 상자까지 이 상자로 바꾼다.
 */
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
  args: { defaultOpen: true, items: ITEMS, onSelect: () => undefined, onOpenChange: () => undefined },
} satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { items: [] } };
export const CustomEmptyMessage: Story = { args: { items: [], emptyMessage: "등록된 커맨드가 없습니다." } };
