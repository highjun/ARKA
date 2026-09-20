import type { Meta, StoryObj } from "@storybook/react-vite";
import { KeybindingTable } from "./index";
import type { KeybindingRow } from "./index";

const ROWS: readonly KeybindingRow[] = [
  {
    actionId: "workbench.action.showCommands",
    label: "커맨드 팔레트 열기",
    keybinding: "ctrl+shift+p",
    isConflicting: false,
  },
  { actionId: "workbench.action.toggleSidebar", label: "사이드바 토글", keybinding: "ctrl+b", isConflicting: true },
  { actionId: "workbench.action.closeActiveTab", label: "탭 닫기", keybinding: "ctrl+b", isConflicting: true },
  { actionId: "filesystem.rename", label: "filesystem.rename", keybinding: "f2", isConflicting: false },
];

const meta = {
  title: "01-workbench/KeybindingTable",
  component: KeybindingTable,
  args: { rows: ROWS },
} satisfies Meta<typeof KeybindingTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { rows: [] } };
