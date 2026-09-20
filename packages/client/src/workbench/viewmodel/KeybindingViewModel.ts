import type { ICommandService } from "#core/commands";
import { makeAutoObservable } from "mobx";
import type { IKeybindingViewModel, KeybindingRow } from "./IKeybindingViewModel";

export class KeybindingViewModel implements IKeybindingViewModel {
  readonly #commands: ICommandService;
  private recordingIdState: string | null = null;

  constructor({ commands }: { commands: ICommandService }) {
    this.#commands = commands;
    makeAutoObservable(this, { rows: false }, { autoBind: true });
  }

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

  get recordingId(): string | null {
    return this.recordingIdState;
  }

  startRecording(actionId: string): void {
    this.recordingIdState = actionId;
  }

  cancelRecording(): void {
    this.recordingIdState = null;
  }

  rebind(actionId: string, keybinding: string): void {
    this.#commands.setKeybinding(actionId, keybinding);
    this.recordingIdState = null;
  }

  dispose(): void {}
}
