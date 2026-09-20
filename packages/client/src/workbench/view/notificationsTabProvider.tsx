import { Icon } from "#component/Icon";
import type { TabDescriptor, TabProviderDescriptor } from "../model/ITabProviderDescriptor";
import { NotificationsTabView } from "./NotificationsTabView";

/** 알림 화면은 하나뿐이고 바뀌지 않는다 — observable로 만들 것이 없다. */
const NOTIFICATIONS_TAB: TabDescriptor = {
  icon: <Icon iconId="bell" size="sm" />,
  title: "알림",
  isDirty: false,
  Content: () => <NotificationsTabView />,
};

/** `arka:///notifications`를 알림 화면으로 연다. 가상 경로라 다른 provider와 겨루지 않는다(`priority 100`). */
export const notificationsTabProvider: TabProviderDescriptor = {
  id: "arka.workbench.notifications",
  priority: 100,
  // `async`인 이유 — `view/`는 `.resolve(` 호출을 금지해서 `Promise.resolve`도 못 쓴다.
  openTab: async (uri) => (uri.scheme === "arka" && uri.path === "notifications" ? NOTIFICATIONS_TAB : undefined),
};
