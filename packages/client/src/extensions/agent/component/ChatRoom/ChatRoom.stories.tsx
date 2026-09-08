import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChatRoom } from './index';
import type { ChatRoomMessage } from './index';

/** 시각을 고정한다 — `Message`가 HH:mm으로 그리므로 매 렌더 같은 그림이 나와야 한다. */
const FIXED = 1_757_000_000_000;

const MESSAGES: readonly ChatRoomMessage[] = [
  { id: 'm1', role: 'user', timestamp: FIXED, content: '이 프로젝트의 빌드가 왜 실패하는지 알려줘.' },
  { id: 'm2', role: 'agent', timestamp: FIXED + 60_000, content: 'tsconfig의 `paths`가 vite 설정과 어긋나 있습니다. 두 곳을 맞추겠습니다.' },
  { id: 'm3', role: 'system', timestamp: FIXED + 120_000, content: '파일 2개가 수정되었습니다.' },
];

const meta = {
  title: 'agent/ChatRoom',
  component: ChatRoom,
  decorators: [
    (Story) => (
      <div style={{ height: 480, width: 720 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    title: '빌드 실패 분석',
    status: 'running',
    messages: MESSAGES,
    onEdit: () => undefined,
    onArchive: () => undefined,
    onSetting: () => undefined,
  },
} satisfies Meta<typeof ChatRoom>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { messages: [], emptyLabel: '대화를 시작해보세요.' } };
export const WaitingInput: Story = { args: { status: 'waitingInput' } };
export const Done: Story = { args: { status: 'done' } };
export const Error: Story = { args: { status: 'error' } };
