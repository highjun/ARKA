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

/** 동작이 붙은 줄 — 단추는 명령 id 로 가리킨 것을 쓰는 쪽이 조립해 넘긴다. */
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

/** 왼쪽 구석에 쌓는다. */
export const BottomLeft: Story = { args: { placement: "bottom-left" } };
