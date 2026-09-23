import { useState } from "react";
import { PortalProvider } from "#utils/portal";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { TitleBar } from "./index";
import type { CommandRow } from "./index";

const ROWS: readonly CommandRow[] = [
  { id: "newFile", label: "새 파일", keybinding: "ctrl+n" },
  { id: "toggleTheme", label: "테마 전환", keybinding: "ctrl+j" },
  { id: "openSettings", label: "설정 열기", keybinding: "ctrl+," },
];

/** 팔레트는 포털로 뜬다 — 테마 토큰이 내려오도록 스토리 안에 담을 자리를 준다. */
const Stage = () => {
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [bottomOpen, setBottomOpen] = useState(false);
  const [colorMode, setColorMode] = useState<"light" | "dark">("light");

  return (
    <PortalProvider container={portal ?? undefined}>
      <TitleBar
        brandName="ARKA"
        brandIconSrc="/arka-mark.svg"
        paletteOpen={paletteOpen}
        paletteQuery={paletteQuery}
        paletteRows={ROWS}
        paletteKeybinding="ctrl+k"
        onPaletteOpenChange={setPaletteOpen}
        onPaletteQueryChange={setPaletteQuery}
        onPaletteSelect={() => setPaletteOpen(false)}
        buildTimestamp="2026-09-20 11:18"
        buildSha="a1b2c3d"
        notificationCount={3}
        onNotificationsOpen={() => undefined}
        sidebarVisible={sidebarVisible}
        onSidebarToggle={() => setSidebarVisible((visible) => !visible)}
        bottomOpen={bottomOpen}
        onBottomToggle={() => setBottomOpen((open) => !open)}
        colorMode={colorMode}
        onColorModeToggle={() => setColorMode((mode) => (mode === "light" ? "dark" : "light"))}
      />
      <div ref={setPortal} />
    </PortalProvider>
  );
};

const meta = {
  title: "01-workbench/TitleBar",
  component: TitleBar,
  args: { brandName: "ARKA" },
  render: () => <Stage />,
} satisfies Meta<typeof TitleBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
