import type { Meta, StoryObj } from '@storybook/react-vite';
import { QuoteBlock } from './index';

const meta = {
  title: 'markdown/QuoteBlock',
  component: QuoteBlock,
  args: { children: '인용한 문장이다. 원문의 뜻을 바꾸지 않고 그대로 옮긴다.' },
} satisfies Meta<typeof QuoteBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const MultiParagraph: Story = {
  render: () => (
    <QuoteBlock>
      <p>첫째 문단.</p>
      <p>둘째 문단 — 문단이 여럿이어도 왼쪽 선 하나로 묶인다.</p>
    </QuoteBlock>
  ),
};
