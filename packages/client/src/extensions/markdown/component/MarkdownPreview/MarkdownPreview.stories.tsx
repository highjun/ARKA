import type { Meta, StoryObj } from '@storybook/react-vite';
import { MarkdownPreview } from './MarkdownPreview';

const meta = {
  title: 'markdown/MarkdownPreview',
  component: MarkdownPreview,
  args: { markdown: '# 제목\n\n본문 문단과 **굵게**, `코드`.\n\n- 항목\n- [x] 완료\n\n> 인용\n\n```ts\nconst a = 1;\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |' },
} satisfies Meta<typeof MarkdownPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Empty: Story = { args: { markdown: '' } };
