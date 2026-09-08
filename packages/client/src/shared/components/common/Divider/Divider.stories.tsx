import type { Meta, StoryObj } from '@storybook/react-vite';
import { Divider } from './index';

const meta = {
  title: 'common/Divider',
  component: Divider,
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: () => (
    <div style={{ width: 160 }}>
      <Divider />
    </div>
  ),
};
export const Vertical: Story = {
  render: () => (
    <div style={{ height: 40 }}>
      <Divider orientation="vertical" />
    </div>
  ),
};
