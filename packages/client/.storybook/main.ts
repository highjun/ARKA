import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  framework: { name: "@storybook/react-vite", options: {} },
  core: { disableTelemetry: true },
  typescript: {
    reactDocgen: "react-docgen-typescript",
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
      propFilter: (prop) => !(prop.parent?.fileName ?? "").includes("node_modules"),
    },
  },
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
