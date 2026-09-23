import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileIcon } from "./index";

const meta = {
  title: "filesystem/FileIcon",
  component: FileIcon,
  args: { fileName: "main.ts" },
} satisfies Meta<typeof FileIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
