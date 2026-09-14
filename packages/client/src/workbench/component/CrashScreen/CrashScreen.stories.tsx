import type { Meta, StoryObj } from "@storybook/react-vite";
import { CrashScreen } from "./CrashScreen";

const meta = {
  title: "workbench/CrashScreen",
  component: CrashScreen,
  args: { message: "TypeError: Cannot read properties of undefined (reading 'tabs')", onReload: () => undefined },
} satisfies Meta<typeof CrashScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
