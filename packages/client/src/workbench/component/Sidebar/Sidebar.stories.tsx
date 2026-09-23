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
  subcomponents: { Header: Sidebar.Header, Body: Sidebar.Body },
  decorators: [
    (Story) => (
      <div style={{ height: 480, width: 720 }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <Sidebar {...args}>
      <Sidebar.Header title="탐색기" actions={새파일} />
      <Sidebar.Body>
        <div style={{ padding: 8 }}>본문 내용</div>
      </Sidebar.Body>
    </Sidebar>
  ),
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
