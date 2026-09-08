import type { Meta, StoryObj } from '@storybook/react-vite';
import { Code } from './index';

const meta = {
  title: 'common/text/Code',
  component: Code,
  args: { children: 'const answer = 42;' },
} satisfies Meta<typeof Code>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const InSentence: Story = {
  render: (args) => (
    <span>
      문장 가운데 <Code {...args} /> 같은 인라인 코드가 놓인다.
    </span>
  ),
};
