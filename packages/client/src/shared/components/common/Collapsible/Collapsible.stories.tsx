import type { Meta, StoryObj } from '@storybook/react-vite';
import { Collapsible } from './index';

const meta = {
  title: 'common/Collapsible',
  component: Collapsible,
  render: (args) => (
    <div style={{ width: 320 }}>
      <Collapsible {...args}>
        <Collapsible.Trigger>세부 정보</Collapsible.Trigger>
        <Collapsible.Content>펼치면 보이는 내용이다. 접으면 이 문단이 감춰진다.</Collapsible.Content>
      </Collapsible>
    </div>
  ),
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 펼친 상태 — 내용까지 보이는 게 기본 스냅샷이다. */
export const Default: Story = { args: { defaultOpen: true } };
export const Closed: Story = { args: { defaultOpen: false } };
