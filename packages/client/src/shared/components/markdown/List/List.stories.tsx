import type { Meta, StoryObj } from '@storybook/react-vite';
import { List } from './index';

const meta = {
  title: 'markdown/List',
  component: List,
  render: (args) => (
    <List {...args}>
      <List.Item>첫째 항목</List.Item>
      <List.Item>둘째 항목</List.Item>
      <List.Item>셋째 항목</List.Item>
    </List>
  ),
} satisfies Meta<typeof List>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Ordered: Story = { args: { variant: 'ordered' } };
export const Checkbox: Story = {
  args: { variant: 'checkbox' },
  render: (args) => (
    <List {...args}>
      <List.Item checked>끝낸 일</List.Item>
      <List.Item>남은 일</List.Item>
      <List.Item checked>끝낸 다른 일</List.Item>
    </List>
  ),
};
/** 목록 종류는 일반이지만 항목 하나만 체크박스로 강제한 경우. */
export const MixedItem: Story = {
  render: (args) => (
    <List {...args}>
      <List.Item>일반 항목</List.Item>
      <List.Item checkbox checked>
        체크박스 항목
      </List.Item>
    </List>
  ),
};
