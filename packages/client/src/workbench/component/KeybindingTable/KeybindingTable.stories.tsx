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
  title: "workbench/KeybindingTable",
  component: KeybindingTable,
  args: { rows: ROWS },
} satisfies Meta<typeof KeybindingTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 키 칩이 여러 개인 줄과 하나인 줄이 섞여 있고, 같은 키에 둘이 걸린 줄은 충돌 표시가 붙는다. */
export const Default: Story = {};

/** 등록된 것이 없으면 머리만 남는다. */
export const Empty: Story = { args: { rows: [] } };
