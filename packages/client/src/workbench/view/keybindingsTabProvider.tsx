import { Icon } from "#component/Icon";
import type { TabDescriptor, TabProviderDescriptor } from "../model/ITabProviderDescriptor";
import { KeybindingsTabView } from "./KeybindingsTabView";

/** 단축키 표는 하나뿐이고 바뀌지 않는다 — observable로 만들 것이 없다. */
const KEYBINDINGS_TAB: TabDescriptor = {
  icon: <Icon iconId="keyboard" size="sm" />,
  title: "키보드 단축키",
  isDirty: false,
  Content: () => <KeybindingsTabView />,
};

/** `arka:///keybindings`를 단축키 표로 연다. 가상 경로라 다른 provider와 겨루지 않는다(`priority 100`). */
export const keybindingsTabProvider: TabProviderDescriptor = {
  id: "arka.workbench.keybindings",
  priority: 100,
  // `async`인 이유 — `view/`는 `.resolve(` 호출을 금지해서 `Promise.resolve`도 못 쓴다.
  openTab: async (uri) => (uri.scheme === "arka" && uri.path === "keybindings" ? KEYBINDINGS_TAB : undefined),
};
