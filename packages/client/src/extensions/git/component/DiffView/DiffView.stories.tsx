import type { Meta, StoryObj } from '@storybook/react-vite';
import { DiffView } from './index';

const DIFF = [
  'diff --git a/greet.ts b/greet.ts',
  'index 1a2b3c4..5d6e7f8 100644',
  '--- a/greet.ts',
  '+++ b/greet.ts',
  '@@ -1,4 +1,4 @@',
  ' export const greet = (name: string) => {',
  '-  return `Hello, ${name}`;',
  '+  return `안녕, ${name}`;',
  ' };',
].join('\n');

const meta = {
  title: 'git/DiffView',
  component: DiffView,
  args: { text: DIFF },
} satisfies Meta<typeof DiffView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 다섯 종류가 한 화면에 다 있다 — meta·hunk·context·add·del. */
export const Default: Story = {};

/** 추가만 있는 diff — 새 파일이 그렇다. */
export const AdditionsOnly: Story = {
  args: { text: ['@@ -0,0 +1,3 @@', '+첫 줄', '+둘째 줄', '+셋째 줄'].join('\n') },
};

/** 빈 원문 — 차이가 없을 때는 쓰는 쪽이 빈 상태를 낸다. */
export const Empty: Story = { args: { text: '' } };
