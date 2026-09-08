import type { Meta, StoryObj } from '@storybook/react-vite';
import { NotificationList } from './NotificationList';

const meta = {
  title: 'workbench/NotificationList',
  component: NotificationList,
  args: {
    items: [
      { id: '1', severity: 'info', message: '저장했다.' },
      { id: '2', severity: 'warning', message: '연결이 끊겨 다시 붙는 중이다.' },
      { id: '3', severity: 'error', message: 'TypeError: Cannot read properties of undefined' },
    ],
    onDismiss: () => undefined,
  },
  // 고정 위치 요소라 캔버스에 높이를 준다 — 없으면 VRT 스크린샷이 비어 보인다.
  decorators: [(Story) => <div style={{ position: 'relative', width: 480, height: 240 }}><Story /></div>],
} satisfies Meta<typeof NotificationList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { items: [] } };
