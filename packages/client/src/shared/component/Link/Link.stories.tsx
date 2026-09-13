import type { Meta, StoryObj } from '@storybook/react-vite';
import { Link } from './index';

const meta = {
  title: 'common/text/Link',
  component: Link,
  args: { href: '#', children: '링크 텍스트' },
} satisfies Meta<typeof Link>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Tones: Story = {
  render: (args) => (
    <span style={{ display: 'inline-flex', gap: 16 }}>
      <Link {...args} tone="accent">
        accent
      </Link>
      <Link {...args} tone="muted">
        muted
      </Link>
      <Link {...args} tone="plain">
        plain
      </Link>
    </span>
  ),
};
