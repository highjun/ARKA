import type { Meta, StoryObj } from '@storybook/react-vite';
import { Heading } from './index';

const meta = {
  title: 'common/text/Heading',
  component: Heading,
  args: { level: 1, children: '제목' },
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Levels: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Heading level={1}>h1 제목</Heading>
      <Heading level={2}>h2 제목</Heading>
      <Heading level={3}>h3 제목</Heading>
      <Heading level={4}>h4 제목</Heading>
      <Heading level={5}>h5 제목</Heading>
      <Heading level={6}>h6 제목</Heading>
    </div>
  ),
};
