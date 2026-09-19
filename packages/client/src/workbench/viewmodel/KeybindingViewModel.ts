import type { ICommandService } from "#core/commands";
import { makeAutoObservable } from "mobx";
import type { IKeybindingViewModel, KeybindingRow } from "./IKeybindingViewModel";

/** `IKeybindingViewModel`의 유일한 구현체. */
export class KeybindingViewModel implements IKeybindingViewModel {
  readonly #commands: ICommandService;

  /** 명령 레지스트리만 본다 — 자기 상태가 없다. */
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

  /** 정리할 구독이 없다. */
  dispose(): void {
    // 자기 상태가 없다.
  }
}
