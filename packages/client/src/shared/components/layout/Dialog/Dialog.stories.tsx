import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@primer/react';
import { PortalProvider } from '#utils/portal';
import { Dialog } from './index';

/**
 * 대화상자는 포탈로 `document.body`에 뜨는데 VRT는 `#storybook-root`만 찍는다 — 포탈 대상을 이
 * 상자 안으로 돌리고, `transform`으로 fixed 포지션의 기준 상자까지 이 상자로 바꾼다.
 */
const OverlayStage = ({ children }: { readonly children: ReactNode }) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  return (
    <div style={{ position: 'relative', height: 480, width: 720, overflow: 'hidden', transform: 'translateZ(0)' }}>
      <PortalProvider container={container ?? undefined}>{children}</PortalProvider>
      <div ref={setContainer} />
    </div>
  );
};

const meta = {
  title: 'layout/Dialog',
  component: Dialog,
  decorators: [
    (Story) => (
      <OverlayStage>
        <Story />
      </OverlayStage>
    ),
  ],
  args: {
    iconId: 'trash',
    title: '탭을 닫을까요?',
    description: '저장하지 않은 변경 내용은 사라집니다.',
    onClose: () => undefined,
  },
  // 마운트돼 있으면 열려 있다 — `open` prop이 없는 컴포넌트라 렌더 자체가 열린 상태다.
  render: (args) => (
    <Dialog {...args}>
      <Dialog.Actions>
        <Button onClick={() => undefined}>취소</Button>
        <Button variant="danger" onClick={() => undefined}>
          닫기
        </Button>
      </Dialog.Actions>
    </Dialog>
  ),
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Attention: Story = { args: { tone: 'attention', iconId: 'warning' } };
export const Danger: Story = { args: { tone: 'danger' } };
