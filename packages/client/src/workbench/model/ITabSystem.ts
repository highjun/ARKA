import type { URI } from "#contracts";
import type { Container, Disposable } from "#core/di";
import type { OpenTab } from "./ITabLayout";
import type { OpenOptions, TabDescriptor } from "./ITabProviderDescriptor";

declare module "#core/di" {
  /** `ITabSystem`을 컨테이너에서 꺼내는 자리. 레지스트리(`arka.workbench.tabSystem`)와 다른 것이다. */
  interface InstanceMap {
    "arka.workbench.tabs": ITabSystem;
  }
}
/**
 * 무엇이든 탭으로 연다. `arka.workbench.open` 명령이 이것을 부른다.
 *
 * 탭에 대해 아는 것은 `uri`와 더티 여부뿐이다 — 무엇을 그리는지는 provider가 돌려준 `TabDescriptor`가 안다.
 * MobX를 모른다 — descriptor를 담고 읽을 뿐이고, 바뀌는 순간을 잡는 것은 ViewModel이다.
 */
export interface ITabSystem {
  /**
   * `priority` 순으로 provider에게 묻고 처음 받는 것으로 연다.
   * 같은 `uri`가 이미 열려 있으면 새로 열지 않고 그 탭을 활성화한다 — 미리보기 자리였으면 고정된다.
   * 아무도 못 열면 알림을 낸다.
   */
  open(uri: URI, options?: OpenOptions): Promise<void>;
  /**
   * 새로고침 복원. `kind`로 provider를 바로 찾아 `openTab`을 다시 부른다 — 우선순위를 안 돈다.
   * 이미 그려질 것이 있는 탭은 건너뛰고, 못 연 탭은 트리에서 뺀다.
   */
  restore(tabs: readonly OpenTab[]): Promise<void>;
  /**
   * 그 탭의 자식 컨테이너. **탭 목록에서 파생한다** — 목록에 생기면 따고 빠지면 `dispose`한다.
   * 부르는 자리가 없어 빠뜨릴 수 없다. 셸이 탭 본문을 `ContainerProvider`로 감쌀 때 쓴다.
   * @throws DescriptorNotFoundError 그 id의 탭이 없다.
   */
  containerOf(tabId: string): Container;
  /** 그 탭이 그릴 것. 아직 provider가 답하지 않았거나(복원 중) 없는 탭이면 `undefined`. 계약 밖이다. */
  descriptorOf(tabId: string): TabDescriptor | undefined;
  /** 어느 탭이든 저장 안 된 것이 있나 — 떠날 때 묻는 자리가 쓴다. 계약 밖이다. */
  hasAnyDirty(): boolean;
  /** 그릴 것이 생기거나 사라졌다 — 복원이 끝나 descriptor가 뒤늦게 붙을 때 화면이 알 길이다. 계약 밖이다. */
  onDidChange(listener: () => void): Disposable;
}
