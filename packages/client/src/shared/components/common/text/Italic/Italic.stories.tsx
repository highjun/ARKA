import type { Meta, StoryObj } from '@storybook/react-vite';
import { Italic } from './index';

const meta = {
  title: 'common/text/Italic',
  component: Italic,
  args: { children: '기울인 글자' },
} satisfies Meta<typeof Italic>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const InSentence: Story = {
  render: (args) => (
    <span>
      문장 가운데 <Italic {...args} />가 놓인다.
    </span>
  ),
};
