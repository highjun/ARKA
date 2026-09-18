import type { Descriptor, Registry } from "#core/registry";
import type { IconId } from "#component/Icon";
import type { ComponentType } from "react";

/** 사이드바 머리의 버튼 하나. 명령을 부를 뿐이다 — 라벨과 실행은 명령 쪽 것을 쓴다. */
interface SidebarAction {
  readonly actionId: string;
  readonly iconId: IconId;
}

/**
 * 사이드바 하나. 활동 레일의 아이콘과 사이드바 내용이 한 덩어리다 — 아이콘을 누르면 이 내용이 열린다.
 *
 * **크롬은 커널이 두른다** — 확장은 본문과 액션만 낸다.
 *
 * **슬롯이 아무것도 안 받는다** — 확장이 필요한 것은 DI로 꺼낸다. 커널이 "파일"처럼 확장의
 * 어휘를 계약에 박으면 그것을 안 쓰는 확장에게도 내밀게 된다.
 */
export interface SidebarDescriptor extends Descriptor {
  readonly title: string;
  readonly iconId: IconId;
  readonly Content: ComponentType;
  /** 머리 오른쪽의 아이콘 버튼들. 자주 쓰는 것 한둘이다. */
  readonly actions?: readonly SidebarAction[];
}

declare module "#core/di" {
  /** 사이드바 기여 지점 — 확장이 `activate`에서 더한다. */
  interface InstanceMap {
    "arka.workbench.sidebar": Registry<SidebarDescriptor>;
  }
}
