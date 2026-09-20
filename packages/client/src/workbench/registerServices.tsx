import { Container } from "#core/di";
import { activateExtensions, type ExtensionModule } from "#core/extensions";
import { extensions } from "../extensions";
import { collectTabs } from "./model/paneTree";
import { workbench } from "./workbenchModule";

export function createApplication(overrides: readonly ExtensionModule[] = []): Container {
  const container = new Container("app");
  const result = activateExtensions([workbench, ...extensions, ...overrides], container);

  const notifications = container.resolve("arka.workbench.notifications");
  for (const failure of result.failed)
    notifications.notify("error", `확장 ${failure.id}을(를) 켜지 못했다(${failure.phase}) — ${failure.error.message}`);

  const layout = container.resolve("arka.workbench.tabLayout");
  void container.resolve("arka.workbench.tabs").restore(collectTabs(layout.tree));

  return container;
}
