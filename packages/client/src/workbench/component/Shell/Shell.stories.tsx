import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon } from '#components/common/Icon';
import { IconButton } from '#components/common/IconButton';
import { Menu } from '#components/common/Menu';
import { Shell } from './index';
import type { ActivityBarItem } from '../ActivityBar';

const ACTIVITY_ITEMS: readonly ActivityBarItem[] = [
  { id: 'files', iconId: 'files', label: '탐색기', isActive: true },
  { id: 'search', iconId: 'search', label: '검색' },
  { id: 'agent', iconId: 'brain', label: '에이전트' },
];

const meta = {
  title: 'workbench/Shell',
  component: Shell,
  decorators: [
    (Story) => (
      <div style={{ height: 480, width: 720 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    colorMode: 'light',
    brand: <span style={{ fontWeight: 600, paddingInline: 8 }}>ARKASHIC</span>,
    actions: <IconButton variant="invisible" size="small" aria-label="설정" icon={() => <Icon iconId="settingsGear" size="sm" />} />,
    activityItems: ACTIVITY_ITEMS,
    onActivitySelect: () => undefined,
    panelTitle: '탐색기',
    panelActions: <Menu.Item onSelect={() => undefined}>모두 접기</Menu.Item>,
    panelContent: <div style={{ padding: 8 }}>패널 내용</div>,
    sidebarAriaLabel: '사이드바',
    children: <div style={{ padding: 16 }}>본문 — 탭 등 무엇이든 여기 놓인다.</div>,
  },
} satisfies Meta<typeof Shell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Dark: Story = { args: { colorMode: 'dark' } };
/** 패널 콘텐츠가 없으면 활동 표시줄만 남아 사이드바가 좁게 뜬다. */
export const Collapsed: Story = { args: { panelContent: undefined } };
/** `activityItems`가 없으면 사이드바 자체가 없다. */
export const NoSidebar: Story = { args: { activityItems: undefined } };
export const Resizable: Story = { args: { sidebarResizable: true } };
