import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon } from '#component/Icon';
import { IconButton } from '#component/IconButton';
import { SidebarLayout } from './index';

const meta = {
  title: 'layout/SidebarLayout',
  component: SidebarLayout,
  decorators: [
    (Story) => (
      <div style={{ height: 480, width: 720 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    title: '탐색기',
    actions: <IconButton variant="invisible" size="small" aria-label="새 파일" icon={() => <Icon iconId="newFile" size="sm" />} />,
    children: <div style={{ padding: 8 }}>본문 내용</div>,
  },
} satisfies Meta<typeof SidebarLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const TitleOnly: Story = { args: { actions: undefined } };
/** 제목·액션이 둘 다 없으면 헤더 행 자체를 그리지 않는다. */
export const NoHeader: Story = { args: { title: undefined, actions: undefined } };
