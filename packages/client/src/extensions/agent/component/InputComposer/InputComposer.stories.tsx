import type { Meta, StoryObj } from "@storybook/react-vite";
import { InputComposer } from "./index";

const meta = {
  title: "agent/InputComposer",
  component: InputComposer,
  args: { onSubmitValue: () => undefined },
  decorators: [
    (Story) => (
      <div style={{ width: 560 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InputComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithValue: Story = { args: { defaultValue: "테스트를 먼저 돌려줘." } };
export const PlanMode: Story = { args: { defaultMode: "plan" } };
export const Loading: Story = { args: { loading: true, value: "테스트를 먼저 돌려줘." } };
export const Disabled: Story = { args: { disabled: true, value: "입력이 막혀 있다." } };
/** 모델 목록이 비면 모델 버튼이 비활성화된다. */
export const NoModels: Story = { args: { models: [] } };
