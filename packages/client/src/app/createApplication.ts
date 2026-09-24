import { Container } from "#core/di";
import { activateExtensions, type ExtensionModule } from "#core/extensions";
import { extensions } from "./extensions";
import { collectTabs } from "../workbench/model/paneTree";
import { workbench } from "../workbench/workbenchModule";

/** overrides가 물리는 토큰은 본 모듈에서 뺀다 — 같은 토큰을 두 번 등록하면 컨테이너가 막는다. */
const without = (module: ExtensionModule, overridden: ReadonlySet<string>): ExtensionModule => ({
  ...module,
  provides: module.provides?.filter((registration) => !overridden.has(registration.id)),
});

export function createApplication(overrides: readonly ExtensionModule[] = []): Container {
  const container = new Container("app");
  const overridden = new Set(overrides.flatMap((module) => (module.provides ?? []).map((r) => r.id)));
  const modules = [workbench, ...extensions].map((module) => without(module, overridden));
  const result = activateExtensions([...modules, ...overrides], container);

  const notifications = container.resolve("arka.workbench.notifications");
  for (const failure of result.failed)
    notifications.notify("error", `확장 ${failure.id}을(를) 켜지 못했다(${failure.phase}) — ${failure.error.message}`);

  const layout = container.resolve("arka.workbench.tabLayout");
  void container.resolve("arka.workbench.tabs").restore(collectTabs(layout.tree));

  return container;
}
