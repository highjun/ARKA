import type { Meta, StoryObj } from '@storybook/react-vite';
import { ContextMenu } from '#components/common/ContextMenu';
import { ActivityBar } from './index';
import type { ActivityBarItem } from './index';

const ITEMS: readonly ActivityBarItem[] = [
  { id: 'files', iconId: 'files', label: '탐색기' },
  { id: 'search', iconId: 'search', label: '검색' },
  { id: 'sourceControl', iconId: 'sourceControl', label: '소스 제어' },
  { id: 'agent', iconId: 'brain', label: '에이전트' },
];

const meta = {
  title: 'workbench/ActivityBar',
  component: ActivityBar,
  args: { items: ITEMS, defaultActiveId: 'files', onSelect: () => undefined },
  decorators: [
    (Story) => (
      <div style={{ height: 480, width: 48 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ActivityBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { items: [] } };
export const NoneActive: Story = { args: { defaultActiveId: undefined } };
export const WithContextMenu: Story = {
  args: {
    renderItemContextMenu: (item) => <ContextMenu.Item onSelect={() => undefined}>{item.label} 숨기기</ContextMenu.Item>,
  },
};
