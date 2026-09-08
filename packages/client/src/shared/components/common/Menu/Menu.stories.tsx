import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PortalProvider } from '#utils/portal';
import { Icon } from '#components/common/Icon';
import { IconButton } from '#components/common/IconButton';
import { Menu } from './index';

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
  title: 'common/Menu',
  component: Menu,
  decorators: [
    (Story) => (
      <OverlayStage>
        <Story />
      </OverlayStage>
    ),
  ],
  render: (args) => (
    <Menu {...args}>
      <Menu.Trigger asChild>
        <IconButton variant="invisible" size="small" aria-label="더 보기" icon={() => <Icon iconId="ellipsis" size="sm" />} />
      </Menu.Trigger>
      <Menu.Content>
        <Menu.Label>세션</Menu.Label>
        <Menu.Item onSelect={() => undefined}>이름 바꾸기</Menu.Item>
        <Menu.Item onSelect={() => undefined}>보관</Menu.Item>
        <Menu.Separator />
        <Menu.Item disabled>삭제</Menu.Item>
      </Menu.Content>
    </Menu>
  ),
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { defaultOpen: true } };
export const Closed: Story = { args: { defaultOpen: false } };
