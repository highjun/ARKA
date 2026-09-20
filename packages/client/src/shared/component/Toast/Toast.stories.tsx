import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@primer/react";
import { Toast } from "./index";

const meta = {
  title: "00-shared/Toast",
  component: Toast,
  decorators: [
    (Story) => (
      <div style={{ position: "relative", height: 320, width: 640 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    children: (
      <>
        <Toast.Item severity="error" message="확장 filesystem 을 켜지 못했다" />
        <Toast.Item severity="warning" message="서버와 이어지지 않는다. 다시 붙는 중" />
        <Toast.Item severity="info" message="설정을 저장했다" />
      </>
    ),
  },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAction: Story = {
  args: {
    children: (
      <Toast.Item
        severity="error"
        message="파일을 저장하지 못했다 — EACCES"
        action={
          <Button size="small" variant="default">
            다시 시도
          </Button>
        }
      />
    ),
  },
};

export const BottomLeft: Story = { args: { placement: "bottom-left" } };
