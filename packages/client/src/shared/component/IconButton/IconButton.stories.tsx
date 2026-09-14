import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon } from '#component/Icon';
import { IconButton } from './index';

const meta = {
  title: 'shared/IconButton',
  component: IconButton,
  args: { 'aria-label': '검색', icon: () => <Icon iconId="search" size="sm" /> },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Variants: Story = {
  render: (args) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <IconButton {...args} variant="default" />
      <IconButton {...args} variant="primary" />
      <IconButton {...args} variant="invisible" />
      <IconButton {...args} variant="danger" />
      <IconButton {...args} disabled />
    </span>
  ),
};
export const Sizes: Story = {
  render: (args) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <IconButton {...args} size="small" />
      <IconButton {...args} size="medium" />
      <IconButton {...args} size="large" />
    </span>
  ),
};
