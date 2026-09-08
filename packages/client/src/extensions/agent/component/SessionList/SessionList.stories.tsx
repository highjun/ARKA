import type { Meta, StoryObj } from '@storybook/react-vite';
import { Menu } from '#components/common/Menu';
import { SessionList } from './index';
import type { AgentSessionItem } from './index';

/** `timestamp`는 상대 시간(지금 기준)이라 결정적이지 않다 — 스토리에선 넘기지 않는다. */
const SESSIONS: readonly AgentSessionItem[] = [
  { id: 'a', title: '빌드 실패 분석', excerpt: 'tsconfig의 paths가 vite 설정과 어긋나 있습니다.', status: 'running', unread: 3 },
  { id: 'b', title: '리팩터링 계획', excerpt: 'Workbench.tsx를 해체하는 순서를 정리했습니다.', status: 'waitingInput', unread: 120 },
  { id: 'c', title: '테스트 추가', excerpt: '계약 스위트가 통과합니다.', status: 'done' },
  { id: 'd', title: '실패한 세션', excerpt: '네트워크 오류로 중단되었습니다.', status: 'error', disabled: true },
  { id: 'e', title: '보관된 세션', excerpt: '필터를 켜야 보인다.', status: 'done', archived: true },
];

const meta = {
  title: 'agent/SessionList',
  component: SessionList,
  decorators: [
    (Story) => (
      <div style={{ height: 480, width: 320 }}>
        <Story />
      </div>
    ),
  ],
  args: { sessions: SESSIONS, defaultActiveId: 'a', onActiveChange: () => undefined },
} satisfies Meta<typeof SessionList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { sessions: [] } };
export const WithActions: Story = {
  args: {
    onCreateSession: () => undefined,
    moreActions: <Menu.Item onSelect={() => undefined}>모두 보관</Menu.Item>,
  },
};
