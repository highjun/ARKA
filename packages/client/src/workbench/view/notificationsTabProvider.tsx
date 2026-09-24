import { Icon } from "#component/Icon";
import type { TabDescriptor, TabProviderDescriptor } from "../api/ITabProviderDescriptor";
import { NotificationsTabView } from "./NotificationsTabView";

const NOTIFICATIONS_TAB: TabDescriptor = {
  icon: <Icon iconId="bell" size="sm" />,
  title: "알림",
  isDirty: false,
  Content: () => <NotificationsTabView />,
};

export const notificationsTabProvider: TabProviderDescriptor = {
  id: "arka.workbench.notifications",
  priority: 100,
  openTab: async (uri) => (uri.scheme === "arka" && uri.path === "notifications" ? NOTIFICATIONS_TAB : undefined),
};
