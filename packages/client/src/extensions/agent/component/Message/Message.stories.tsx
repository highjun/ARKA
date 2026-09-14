import type { Meta, StoryObj } from '@storybook/react-vite';
import { Message } from './index';

/** 시각을 고정한다 — HH:mm으로 그리므로 매 렌더 같은 그림이 나와야 한다. */
const FIXED = 1_757_000_000_000;

const meta = {
  title: 'agent/Message',
  component: Message,
  args: { author: 'user', timestamp: FIXED, children: '메시지 본문이다.' },
  decorators: [
    (Story) => (
      <div style={{ width: 480 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Message>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Agent: Story = { args: { author: 'agent', children: '에이전트의 답변이다.' } };
export const System: Story = { args: { author: 'system', children: '시스템 안내다.' } };
/** 타임스탬프가 없으면 자리는 비워 두고 레이아웃은 유지한다. */
export const NoTimestamp: Story = { args: { timestamp: undefined } };
export const CustomAvatar: Story = { args: { author: 'agent', avatar: '🤖' } };
