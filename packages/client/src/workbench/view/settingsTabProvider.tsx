import { Icon } from "#component/Icon";
import type { TabDescriptor, TabProviderDescriptor } from "../model/ITabProviderDescriptor";
import { SettingsTabView } from "./SettingsTabView";

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
