import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bold } from './index';

const meta = {
  title: 'common/text/Bold',
  component: Bold,
  args: { children: '굵게 강조한 글자' },
} satisfies Meta<typeof Bold>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const InSentence: Story = {
  render: (args) => (
    <span>
      문장 가운데 <Bold {...args} />가 놓인다.
    </span>
  ),
};
