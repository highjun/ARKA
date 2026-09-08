import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon } from '#components/common/Icon';
import { IconButton } from '#components/common/IconButton';
import { ShortcutBar } from './index';

/**
 * 터치 기기(`pointer: coarse`)에서만 보이는 컴포넌트다. VRT는 마우스 환경이라 그대로 두면 빈 화면이
 * 되어 스크린샷이 실패한다 — 스토리에서만 표시를 강제한다. 실제 숨김 동작은 CSS 미디어 쿼리의 몫이다.
 */
const meta = {
  title: 'layout/ShortcutBar',
  component: ShortcutBar,
  render: (args) => (
    <div style={{ width: 320 }}>
      <style>{'[data-component="ShortcutBar"] { display: block !important; }'}</style>
      <ShortcutBar {...args}>
        <IconButton variant="invisible" size="medium" aria-label="새 파일" icon={() => <Icon iconId="newFile" size="sm" />} />
        <IconButton variant="invisible" size="medium" aria-label="새 폴더" icon={() => <Icon iconId="newFolder" size="sm" />} />
        <IconButton variant="invisible" size="medium" aria-label="저장" icon={() => <Icon iconId="save" size="sm" />} />
        <IconButton variant="invisible" size="medium" aria-label="검색" icon={() => <Icon iconId="search" size="sm" />} />
      </ShortcutBar>
    </div>
  ),
} satisfies Meta<typeof ShortcutBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
