import type { Meta, StoryObj } from '@storybook/react-vite';
import { Highlight } from './index';

const meta = {
  title: 'common/text/Highlight',
  component: Highlight,
  args: { children: '형광펜으로 표시한 글자' },
} satisfies Meta<typeof Highlight>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const InSentence: Story = {
  render: (args) => (
    <span>
      문장 가운데 <Highlight {...args} />가 놓인다.
    </span>
  ),
};
