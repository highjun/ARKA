import type { Meta, StoryObj } from '@storybook/react-vite';
import { CodeBlock } from './index';

const CONTENT = `// 인사말을 만든다
export const greet = (name: string) => {
  const message = \`Hello, \${name}!\`;
  return message.length > 0 ? message : null;
};
`;

const meta = {
  title: 'shared/CodeBlock',
  component: CodeBlock,
  args: { content: CONTENT, language: 'typescript', title: 'greet.ts' },
  decorators: [
    (Story) => (
      <div style={{ width: 560 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CodeBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const NoTitle: Story = { args: { title: undefined } };
export const PlainText: Story = { args: { language: undefined, title: undefined, content: '언어 이름표 없이 그대로 보여주는 글' } };
export const Empty: Story = { args: { content: '', title: undefined } };
