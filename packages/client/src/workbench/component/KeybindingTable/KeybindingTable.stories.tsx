import type { Meta, StoryObj } from "@storybook/react-vite";
import { KeybindingTable } from "./index";

const ROWS = [
  { id: "1", keys: ["Ctrl", "Shift", "P"], label: "커맨드 팔레트 열기", commandId: "workbench.action.showCommands" },
  { id: "2", keys: ["Ctrl", "B"], label: "사이드바 토글", commandId: "workbench.action.toggleSidebar" },
  { id: "3", keys: ["Ctrl", "W"], label: "탭 닫기", commandId: "workbench.action.closeActiveTab" },
  { id: "4", keys: ["F2"], label: "filesystem.rename", commandId: "filesystem.rename" },
];

const meta = {
  title: "workbench/KeybindingTable",
  component: KeybindingTable,
  args: { rows: ROWS },
} satisfies Meta<typeof KeybindingTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 키 칩이 여러 개인 줄과 하나인 줄이 섞여 있다. 이름이 없는 커맨드는 id 가 이름 자리에 온다. */
export const Default: Story = {};

/** 등록된 것이 없으면 머리만 남는다. */
export const Empty: Story = { args: { rows: [] } };
