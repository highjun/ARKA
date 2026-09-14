import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChangeList } from "./index";

const ENTRIES = [
  { path: "packages/client/src/workbench/view/ShellView.tsx", badge: "M" },
  { path: "docs/adr/0008-component-surface.md", badge: "A" },
  { path: "packages/client/src/shared/component/Link/Link.tsx", badge: "D" },
  { path: "ops/lint/rules/fileNames.ts", badge: "R" },
];

const meta = {
  title: "git/ChangeList",
  component: ChangeList,
  args: {
    heading: "변경 사항",
    entries: ENTRIES,
    action: { label: "스테이지", iconId: "add", onAll: () => undefined, onOne: () => undefined },
    onSelect: () => undefined,
  },
} satisfies Meta<typeof ChangeList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 상태표 넷이 각자 다른 색을 받는다 — 색은 `data-badge`가 고른다. */
export const Default: Story = {};

/** 스테이지된 묶음 — 동작이 "해제"로 바뀐다. */
export const Staged: Story = {
  args: {
    heading: "스테이지된 변경",
    action: { label: "해제", iconId: "close", onAll: () => undefined, onOne: () => undefined },
  },
};

/** 비면 머리글만 남고 "전부" 버튼이 사라진다. */
export const Empty: Story = { args: { entries: [] } };

/** 긴 경로는 잘린다 — 목록 폭이 사이드바 폭이다. */
export const LongPath: Story = {
  args: {
    entries: [{ path: "packages/client/src/extensions/filesystem/component/FileTree/FileTree.module.css", badge: "M" }],
  },
};
