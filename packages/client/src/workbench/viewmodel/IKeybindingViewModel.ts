import type { Disposable } from "#core/di";

export interface KeybindingRow {
  readonly actionId: string;
  readonly label: string;
  readonly keybinding: string;
  readonly isConflicting: boolean;
}

declare module "#core/di" {
  interface InstanceMap {
    "arka.workbench.keybindingViewModel": IKeybindingViewModel;
  }
}
export interface IKeybindingViewModel extends Disposable {
  readonly rows: readonly KeybindingRow[];
  /**
   * 지금 재지정 중인 줄의 명령 id. **한 번에 하나다** — 줄이 아니라 여기가 드는 까닭이다.
   * 둘이 동시에 키를 기다리면 누구 것인지 알 수 없다.
   */
  readonly recordingId: string | null;
  /** 그 줄이 키를 기다리게 한다. 다른 줄이 기다리던 중이면 그쪽은 그만둔다. */
  startRecording(actionId: string): void;
  /** 기다리기를 그만둔다. 이미 아니면 아무 일도 없다. */
  cancelRecording(): void;
  /** 새 조합을 건다. 기다리기도 함께 끝난다. */
  rebind(actionId: string, keybinding: string): void;
}
