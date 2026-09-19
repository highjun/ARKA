import type { Descriptor, Registry } from "#core/registry";
import type { IconId } from "#component/Icon";
import type { ComponentType } from "react";

/** 아래 창에 사는 것. 터미널이 이 자리다. */
export interface BottomDescriptor extends Descriptor {
  readonly title: string;
  readonly iconId: IconId;
  readonly Content: ComponentType;
}

declare module "#core/di" {
  /** 아래 창 기여 지점 — 확장이 `activate`에서 더한다. 아직 첫 기여자가 없다. */
  interface InstanceMap {
    "arka.workbench.bottom": Registry<BottomDescriptor>;
  }
}
