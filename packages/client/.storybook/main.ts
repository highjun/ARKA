import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  addons: ["@storybook/addon-a11y"],
  framework: { name: "@storybook/react-vite", options: {} },
  core: { disableTelemetry: true },
  viteFinal: (config) => ({
    ...config,
    plugins: (config.plugins ?? [])
      .flat()
      .filter(
        (plugin) =>
          !(
            plugin !== null &&
            typeof plugin === "object" &&
            "name" in plugin &&
            String(plugin.name).startsWith("vite-plugin-pwa")
          ),
      ),
  }),
};

export default config;
