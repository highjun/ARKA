import { ThemeProvider } from "@primer/react";
import type { Preview } from "@storybook/react-vite";

import "../src/workbench/reset.css";
import "../src/workbench/globals.css";

const preview: Preview = {
  tags: ["autodocs"],
  parameters: {
    backgrounds: { disable: true },
  },
  globalTypes: {
    colorMode: {
      description: "Primer 색 모드",
      toolbar: { title: "Color mode", items: ["light", "dark"], dynamicTitle: true },
    },
  },
  initialGlobals: { colorMode: "light" },
  decorators: [
    (Story, { globals }) => (
      <ThemeProvider colorMode={globals["colorMode"] === "dark" ? "dark" : "light"}>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default preview;
