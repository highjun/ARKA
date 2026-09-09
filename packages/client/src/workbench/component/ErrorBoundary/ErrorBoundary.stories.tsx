import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text } from '#components/common';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * 이 컴포넌트는 자기 모양이 없다 — 자식이거나 fallback이거나 둘 중 하나를 그린다. 그래서
 * 스토리가 보여 주는 것은 **경계가 실제로 잡는가**다. 앱이 쓰는 fallback의 생김새는
 * `workbench/CrashScreen`의 스토리에 있다.
 */
const Boom = (): never => {
  throw new Error('렌더 중 터졌다 — MockService가 준비되지 않았습니다.');
};

const meta = {
  title: 'workbench/ErrorBoundary',
  component: ErrorBoundary,
  decorators: [
    (Story) => (
      <div style={{ padding: 16, width: 560 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    renderFallback: (error: Error) => (
      <Text tone="danger" size="small">
        {error.message}
      </Text>
    ),
  },
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 자식이 멀쩡하면 경계는 아무것도 하지 않는다 — 자식이 그대로 보인다. */
export const Default: Story = {
  args: { children: <Text>평범한 자식이다.</Text> },
};

/**
 * 자식이 렌더 중 던지면 fallback으로 바뀐다. 복구는 하지 않는다 — 어떤 상태에서 죽었는지
 * 모르는 채로 다시 그리면 같은 자리에서 또 죽는다.
 */
export const Caught: Story = {
  args: { children: <Boom /> },
};
