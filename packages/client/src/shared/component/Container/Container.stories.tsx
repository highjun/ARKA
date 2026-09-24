import type { Meta, StoryObj } from "@storybook/react-vite";
import { Container } from "./index";

const LINES = Array.from(
  { length: 40 },
  (_, index) => `${String(index + 1)}번째 줄 — 세로로도 가로로도 넘치도록 길게 늘여 둔 내용입니다`,
);

const meta = {
  title: "00-shared/Container",
  component: Container,
  decorators: [
    (Story) => (
      <div style={{ height: 480, width: 720 }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <Container {...args} style={{ height: "100%" }}>
      {/* 두 축 모두 넘겨 둔다 — `scroll`·`scrollbar` 값을 바꿔 가며 볼 수 있게. */}
      <div style={{ padding: 8, width: 960 }}>
        {LINES.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </Container>
  ),
} satisfies Meta<typeof Container>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
