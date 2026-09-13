import type { Meta, StoryObj } from '@storybook/react-vite';
import { Container } from './index';

const LINES = Array.from({ length: 40 }, (_, index) => `${index + 1}번째 줄 — 세로로 넘치는 내용`);

const meta = {
  title: 'layout/Container',
  component: Container,
  decorators: [
    (Story) => (
      <div style={{ height: 480, width: 720 }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <Container {...args} style={{ height: '100%' }}>
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
export const NoChrome: Story = { args: { chrome: 'none' } };
export const Horizontal: Story = {
  args: { scroll: 'horizontal' },
  render: (args) => (
    <Container {...args} style={{ height: '100%' }}>
      <div style={{ padding: 8, whiteSpace: 'nowrap', width: 2000 }}>가로로만 넘치는 한 줄 — 세로 스크롤바는 뜨지 않는다.</div>
    </Container>
  ),
};
/** `scroll="none"` — 스크롤 영역 없이 순수 테두리 상자라 내용이 넘쳐도 자르지 않는다. */
export const NoScroll: Story = {
  args: { scroll: 'none' },
  render: (args) => (
    <Container {...args}>
      <div style={{ padding: 8 }}>테두리만 있는 상자</div>
    </Container>
  ),
};
