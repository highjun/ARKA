import { Icon } from "#ui/Icon";
import type { TabDescriptor, TabProviderDescriptor } from "./api/ITabProviderDescriptor";
import { SettingsTabView } from "./view/SettingsTabView";

const SETTINGS_TAB: TabDescriptor = {
  icon: <Icon iconId="settingsGear" size="sm" />,
  title: "설정",
  isDirty: false,
  Content: () => <SettingsTabView />,
};

export const settingsTabProvider: TabProviderDescriptor = {
  id: "arka.workbench.settings",
  priority: 100,
  openTab: async (uri) => (uri.scheme === "arka" && uri.path === "settings" ? SETTINGS_TAB : undefined),
};
