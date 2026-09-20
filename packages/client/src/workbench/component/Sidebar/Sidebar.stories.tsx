import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "#component/Icon";
import { IconButton } from "#component/IconButton";
import { Sidebar } from "./index";

const 새파일 = (
  <IconButton variant="invisible" size="small" aria-label="새 파일" icon={() => <Icon iconId="newFile" size="sm" />} />
);

const meta = {
  title: "01-workbench/Sidebar",
  component: Sidebar,
  decorators: [
    (Story) => (
      <div style={{ height: 480, width: 720 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    children: (
      <>
        <Sidebar.Header title="탐색기" actions={새파일} />
        <Sidebar.Body>
          <div style={{ padding: 8 }}>본문 내용</div>
        </Sidebar.Body>
      </>
    ),
  },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TitleOnly: Story = {
  args: {
    children: (
      <>
        <Sidebar.Header title="탐색기" />
        <Sidebar.Body>
          <div style={{ padding: 8 }}>본문 내용</div>
        </Sidebar.Body>
      </>
    ),
  },
};

/** 제목·액션이 둘 다 없으면 머리 자체를 그리지 않는다. */
export const NoHeader: Story = {
  args: {
    children: (
      <>
        <Sidebar.Header />
        <Sidebar.Body>
          <div style={{ padding: 8 }}>본문 내용</div>
        </Sidebar.Body>
      </>
    ),
  },
};

/** 사이드바에 쓰는 빽빽한 머리 — 낮은 행에 작은 대문자 제목(VS Code 탐색기와 같은 자리). */
export const Compact: Story = { args: { density: "compact" } };
