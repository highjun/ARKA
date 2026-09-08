import type { Meta, StoryObj } from '@storybook/react-vite';
import { Slider } from './index';

const meta = {
  title: 'common/Slider',
  component: Slider,
  args: { 'aria-label': '재생 위치', max: 100, defaultValue: 40, onValueChange: () => undefined },
  decorators: [
    (Story) => (
      <div style={{ width: 320, padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { defaultValue: 0 } };
export const Full: Story = { args: { defaultValue: 100 } };
export const Disabled: Story = { args: { disabled: true } };
