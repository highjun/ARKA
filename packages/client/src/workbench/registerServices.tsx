import { Container } from "#core/di";
import { activateExtensions, type ExtensionModule } from "#core/extensions";
import { extensions } from "../extensions";
import { collectTabs } from "./model/paneTree";
import { workbench } from "./workbenchModule";

/**
 * 조립은 여기 한 곳이다 — 셸 모듈과 확장 전부를 한 컨테이너에 켠다. 무엇이 도는지는 각 모듈이 말한다.
 *
 * `overrides`는 테스트 대역 모듈이다 — 같은 id를 다시 물려 실물을 가린다(나중 등록이 이긴다). 활성화 전에
 * 끼어들어야 해서 컨테이너를 돌려준 뒤에는 늦다 — 활성화가 곧 만드는 것이기 때문이다.
 */
export function createApplication(overrides: readonly ExtensionModule[] = []): Container {
  const container = new Container("app");
  const result = activateExtensions([workbench, ...extensions, ...overrides], container);

  // 켜지 못한 확장은 알림으로 남긴다 — 조용히 빠지면 왜 메뉴가 없는지 알 길이 없다.
  const notifications = container.resolve("arka.workbench.notifications");
  for (const failure of result.failed)
    notifications.notify("error", `확장 ${failure.id}을(를) 켜지 못했다(${failure.phase}) — ${failure.error.message}`);

  // 새로고침 전에 열려 있던 탭을 provider에게 다시 묻는다 — 못 여는 것은 여기서 빠진다.
  const layout = container.resolve("arka.workbench.tabLayout");
  void container.resolve("arka.workbench.tabs").restore(collectTabs(layout.tree));

  return container;
}
