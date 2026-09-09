import { createContainer, singleton } from '#core/di';
import { ViewModelProvider } from '#core/viewmodel';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { TranscriptItem } from '../model/IChatModel';
import { ChatViewModelToken } from '../viewmodel/IChatViewModel';
import type { ChatState, IChatViewModel } from '../viewmodel/IChatViewModel';
import { ChatTabView } from './ChatTabView';

const SESSION_ID = 'story-session';
/** `timestamp`가 상대 시간이 아니라 절대 시각으로 찍히도록 고정한다 — 그러지 않으면 그림이 매번 다르다. */
const AT = Date.parse('2026-09-09T15:33:00Z');

const chat = (state: Partial<ChatState>): ChatState => ({
  items: [],
  status: null,
  pendingInput: null,
  canCancel: false,
  reconnecting: false,
  failure: null,
  ...state,
  composer: { value: '', mode: 'action', canSubmit: false, sending: false, placeholder: '요청 입력…', ...state.composer },
});

/**
 * 고정된 VM을 꽂는다 — 실물은 마운트에 세션 목록을 읽고 SSE에 붙으므로 스토리가 서버를 요구하고,
 * 스트리밍 중이면 찍는 순간마다 그림이 다르다.
 */
const viewModel = (state: ChatState): IChatViewModel => ({
  onMount: () => undefined,
  onDispose: () => undefined,
  sessions: [],
  sessionsLoading: false,
  sessionsFailure: null,
  createSession: () => Promise.resolve(null),
  archiveSession: () => undefined,
  openSession: () => undefined,
  chatOf: () => state,
  setDraft: () => undefined,
  setMode: () => undefined,
  submit: () => undefined,
  cancel: () => undefined,
});

const meta = {
  title: 'agent/ChatTabView',
  component: ChatTabView,
  args: { sessionId: SESSION_ID },
} satisfies Meta<typeof ChatTabView>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (state: Partial<ChatState>): Story => ({
  decorators: [
    (Story) => {
      const container = createContainer('story');
      container.register(ChatViewModelToken, singleton(() => viewModel(chat(state))));
      return (
        <ViewModelProvider container={container.createScope('view')}>
          <div style={{ height: 560, width: 720 }}>
            <Story />
          </div>
        </ViewModelProvider>
      );
    },
  ],
});

const ITEMS: readonly TranscriptItem[] = [
  { kind: 'user', id: '1', text: '이 프로젝트의 빌드가 왜 실패하는지 알려줘.', at: AT },
  { kind: 'thinking', id: '2', text: 'tsconfig와 vite 설정을 대조한다.', done: true, at: AT + 1000 },
  { kind: 'tool', id: '3', toolId: 'read_file', input: { path: 'tsconfig.json' }, output: '{ "paths": { "#core/*": ["src/core/*"] } }', isError: false, done: true, at: AT + 2000 },
  { kind: 'assistant', id: '4', text: 'tsconfig의 `paths`가 vite 설정과 어긋나 있습니다. 두 곳을 맞추겠습니다.', done: true, at: AT + 3000 },
];

export const Default: Story = story({ items: ITEMS, status: 'done' });

/** 탭이 막 열려 아직 아무것도 없을 때 — 안내 문구가 뜬다. */
export const Empty: Story = story({});

/** 응답이 흐르는 중 — 마지막 말풍선에 커서가 붙고 "중지"가 뜬다. */
export const Running: Story = story({
  items: [...ITEMS.slice(0, 3), { kind: 'assistant', id: '4', text: 'tsconfig의 `paths`가', done: false, at: AT + 3000 }],
  status: 'running',
  canCancel: true,
  composer: { value: '', mode: 'action', canSubmit: false, sending: true, placeholder: '응답 중…' },
});

export const Error: Story = story({
  items: [...ITEMS.slice(0, 1), { kind: 'error', id: '9', message: 'ADE_ANTHROPIC_API_KEY가 없습니다.', at: AT + 1000 }],
  status: 'error',
  failure: '요청을 보내지 못했다 — 502 Bad Gateway',
});

/** 스트림이 끊겨 다시 붙는 중 — 실패 띠와 달리 경고 띠다. */
export const Reconnecting: Story = story({ items: ITEMS, status: 'running', reconnecting: true, canCancel: true });

/** 계획 모드로 초안을 쓰던 중. */
export const PlanMode: Story = story({
  items: ITEMS,
  status: 'done',
  composer: { value: '다음 라운드 순서를 정리해줘', mode: 'plan', canSubmit: true, sending: false, placeholder: '요청 입력…' },
});
