import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileIcon } from "./index";

const FILE_NAMES = [
  "main.ts",
  "App.tsx",
  "index.js",
  "styles.css",
  "README.md",
  "package.json",
  "Dockerfile",
  "photo.png",
  "unknown.xyz",
];

const meta = {
  title: "filesystem/FileIcon",
  component: FileIcon,
  args: { fileName: "main.ts" },
} satisfies Meta<typeof FileIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Sizes: Story = {
  render: (args) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <FileIcon {...args} size="sm" />
      <FileIcon {...args} size="md" />
      <FileIcon {...args} size="lg" />
    </span>
  ),
};
export const ByExtension: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {FILE_NAMES.map((fileName) => (
        <span key={fileName} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <FileIcon fileName={fileName} />
          <span>{fileName}</span>
        </span>
      ))}
    </div>
  ),
};
