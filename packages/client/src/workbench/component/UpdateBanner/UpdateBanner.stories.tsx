import type { Meta, StoryObj } from '@storybook/react-vite';
import { UpdateBanner } from './UpdateBanner';

const meta = {
  title: 'workbench/UpdateBanner',
  component: UpdateBanner,
  args: { onReload: () => undefined },
} satisfies Meta<typeof UpdateBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
