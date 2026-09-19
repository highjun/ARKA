import type { Disposable } from "#core/di";

/** 단축키 표의 한 줄. */
export interface KeybindingRow {
  readonly actionId: string;
  readonly label: string;
  readonly keybinding: string;
  /** 같은 키에 둘 이상이 걸렸다. */
  readonly isConflicting: boolean;
}

declare module "#core/di" {
  /** `IKeybindingViewModel`를 컨테이너에서 꺼내는 자리. */
  interface InstanceMap {
    "arka.workbench.keybindingViewModel": IKeybindingViewModel;
  }
}
/** 단축키 표. 재정의가 있으면 그 키를 보이고, `null`로 꺼 둔 것은 빠진다. 충돌을 함께 보여준다. */
export interface IKeybindingViewModel extends Disposable {
  readonly rows: readonly KeybindingRow[];
}
