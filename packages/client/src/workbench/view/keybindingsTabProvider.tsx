import { Icon } from "#component/Icon";
import type { TabDescriptor, TabProviderDescriptor } from "../model/ITabProviderDescriptor";
import { KeybindingsTabView } from "./KeybindingsTabView";

const KEYBINDINGS_TAB: TabDescriptor = {
  icon: <Icon iconId="keyboard" size="sm" />,
  title: "키보드 단축키",
  isDirty: false,
  Content: () => <KeybindingsTabView />,
};

export const keybindingsTabProvider: TabProviderDescriptor = {
  id: "arka.workbench.keybindings",
  priority: 100,
  openTab: async (uri) => (uri.scheme === "arka" && uri.path === "keybindings" ? KEYBINDINGS_TAB : undefined),
};
