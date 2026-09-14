import type { Meta, StoryObj } from '@storybook/react-vite';
import { SessionListItem } from './Item';

/** `timestamp`는 상대 시간(지금 기준)이라 결정적이지 않다 — 스토리에선 넘기지 않는다. */
const meta = {
  title: 'agent/SessionList/Item',
  component: SessionListItem,
  args: { title: '빌드 실패 분석', excerpt: 'tsconfig의 paths가 vite 설정과 어긋나 있습니다.', onSelect: () => undefined },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SessionListItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Active: Story = { args: { isActive: true, status: 'running' } };
export const Unread: Story = { args: { unread: 7, status: 'waitingInput' } };
/** 99를 넘으면 "99+"로 캡핑된다. */
export const UnreadCapped: Story = { args: { unread: 250 } };
export const Error: Story = { args: { status: 'error' } };
export const Disabled: Story = { args: { disabled: true } };
export const NoExcerpt: Story = { args: { excerpt: undefined } };
