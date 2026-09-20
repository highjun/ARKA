import type { ICommandService } from "#core/commands";
import { makeAutoObservable } from "mobx";
import type { IKeybindingViewModel, KeybindingRow } from "./IKeybindingViewModel";

/** `IKeybindingViewModel`의 유일한 구현체. */
export class KeybindingViewModel implements IKeybindingViewModel {
  readonly #commands: ICommandService;
  private recordingIdState: string | null = null;

  /** 명령 레지스트리를 보고, 재지정 중인 줄 하나만 스스로 든다. */
  constructor({ commands }: { commands: ICommandService }) {
    this.#commands = commands;
    // `rows`는 관찰하지 않는다 — 명령 레지스트리는 observable이 아니라, 캐시하면 뒤늦게 등록된 것을 놓친다.
    makeAutoObservable(this, { rows: false }, { autoBind: true });
  }

  /** 등록 순서 그대로. 같은 실효 키에 둘 이상이 걸리면 충돌이다. */
  get rows(): readonly KeybindingRow[] {
    const commands = this.#commands;
    const effective = commands.keybindings.list().flatMap((entry) => {
      const keybinding = commands.overrides.has(entry.actionId)
        ? commands.overrides.get(entry.actionId)
        : entry.keybinding;
      return typeof keybinding === "string" ? [{ actionId: entry.actionId, keybinding }] : [];
    });
    const countOf = new Map<string, number>();
    for (const entry of effective) countOf.set(entry.keybinding, (countOf.get(entry.keybinding) ?? 0) + 1);
    return effective.map((entry) => ({
      actionId: entry.actionId,
      label: commands.actions.tryGet(entry.actionId)?.label ?? entry.actionId,
      keybinding: entry.keybinding,
      isConflicting: (countOf.get(entry.keybinding) ?? 0) > 1,
    }));
  }

  /** 지금 키를 기다리는 줄. 없으면 `null`. */
  get recordingId(): string | null {
    return this.recordingIdState;
  }

  /** 다른 줄이 기다리던 중이면 그쪽은 그만둔다 — 값이 하나라 저절로 그렇게 된다. */
  startRecording(actionId: string): void {
    this.recordingIdState = actionId;
  }

  /** 이미 아니면 아무 일도 없다. */
  cancelRecording(): void {
    this.recordingIdState = null;
  }

  /**
   * 새 조합을 건다. **덮어쓰기는 `ICommandService`가 든다** — 기본값은 확장이 기여한 것이라
   * 그대로 두고, 사용자가 바꾼 것만 따로 쌓인다.
   */
  rebind(actionId: string, keybinding: string): void {
    this.#commands.setKeybinding(actionId, keybinding);
    this.recordingIdState = null;
  }

  /** 정리할 구독이 없다. */
  dispose(): void {
    // 구독이 없다.
  }
}
