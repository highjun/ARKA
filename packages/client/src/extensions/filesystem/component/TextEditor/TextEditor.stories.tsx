import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextEditor } from "./index";

const CONTENT = `import { greet } from './greet';

// 진입점
export const main = (): void => {
  const message = greet('ARKA');
  console.log(message);
};

main();
`;

const meta = {
  title: "filesystem/TextEditor",
  component: TextEditor,
  decorators: [
    (Story) => (
      <div style={{ height: 480, width: 720 }}>
        <Story />
      </div>
    ),
  ],
  args: { path: "src/main.ts", content: CONTENT },
} satisfies Meta<typeof TextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
