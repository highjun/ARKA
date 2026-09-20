import type { Meta, StoryObj } from "@storybook/react-vite";
import { NotificationList } from "./NotificationList";

const meta = {
  title: "01-workbench/NotificationList",
  component: NotificationList,
  args: {
    items: [
      { id: "1", severity: "info", message: "저장했다." },
      { id: "2", severity: "warning", message: "연결이 끊겨 다시 붙는 중이다." },
      { id: "3", severity: "error", message: "TypeError: Cannot read properties of undefined" },
    ],
    onDismiss: () => undefined,
  },
  decorators: [
    (Story) => (
      <div style={{ position: "relative", width: 480, height: 240 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NotificationList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { items: [] } };
