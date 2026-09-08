import type { Meta, StoryObj } from '@storybook/react-vite';
import { Timestamp } from './index';

/**
 * **시각을 고정한다.** `epoch`와 `now`를 둘 다 주지 않으면 렌더할 때마다 결과가 달라져
 * VRT 기준으로 쓸 수 없다 — `now`는 그러라고 있는 주입 지점이다.
 */
const FIXED = Date.UTC(2026, 0, 2, 3, 4, 5);

const meta = {
  title: 'common/Timestamp',
  component: Timestamp,
} satisfies Meta<typeof Timestamp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DateTime: Story = { args: { epoch: FIXED, mode: 'datetime' } };
export const Relative: Story = {
  args: { epoch: FIXED - 90_000, mode: 'relative', now: FIXED },
};
export const Duration: Story = {
  args: { epoch: FIXED - 3_600_000, mode: 'duration', now: FIXED },
};
