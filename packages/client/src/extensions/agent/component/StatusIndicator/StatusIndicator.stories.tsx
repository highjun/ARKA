import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusIndicator } from './index';

const meta = {
  title: 'agent/StatusIndicator',
  component: StatusIndicator,
  args: { status: 'running' },
} satisfies Meta<typeof StatusIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Done: Story = { args: { status: 'done' } };
export const WaitingInput: Story = { args: { status: 'waitingInput' } };
export const Error: Story = { args: { status: 'error' } };
export const All: Story = {
  render: () => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
      <StatusIndicator status="running" />
      <StatusIndicator status="done" />
      <StatusIndicator status="waitingInput" />
      <StatusIndicator status="error" />
    </span>
  ),
};
