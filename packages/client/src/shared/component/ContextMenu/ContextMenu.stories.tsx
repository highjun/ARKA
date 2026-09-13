import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PortalProvider } from '#utils/portal';
import { ContextMenu } from './index';

/**
 * 메뉴는 포탈로 `document.body`에 뜨는데 VRT는 `#storybook-root`만 찍는다 — 포탈 대상을 이 상자
 * 안으로 돌리고, `transform`으로 fixed 포지션의 기준 상자까지 이 상자로 바꾼다.
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
  title: 'common/ContextMenu',
  component: ContextMenu,
  decorators: [
    (Story) => (
      <OverlayStage>
        <Story />
      </OverlayStage>
    ),
  ],
  render: (args) => (
    <ContextMenu {...args}>
      <ContextMenu.Trigger>
        <div style={{ padding: 24, border: '1px dashed var(--borderColor-muted)', color: 'var(--fgColor-muted)' }}>
          여기를 우클릭
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Label>파일</ContextMenu.Label>
        <ContextMenu.Item onSelect={() => undefined}>새 파일</ContextMenu.Item>
        <ContextMenu.Item onSelect={() => undefined}>이름 바꾸기</ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Item disabled>삭제</ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu>
  ),
} satisfies Meta<typeof ContextMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 우클릭 없이 열어 둔다 — 좌표가 없어 좌상단에 앵커링되는 건 의도된 동작이다. */
export const Default: Story = { args: { defaultOpen: true } };
export const Closed: Story = { args: { defaultOpen: false } };
