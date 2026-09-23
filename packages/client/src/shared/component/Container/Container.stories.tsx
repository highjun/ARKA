import type { Meta, StoryObj } from "@storybook/react-vite";
import { Container } from "./index";

const LINES = Array.from({ length: 40 }, (_, index) => `${index + 1}번째 줄 — 세로로 넘치는 내용`);

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
      <div style={{ padding: 8 }}>
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
