import type { ICommandService } from "#core/commands";
import { makeAutoObservable, observable } from "mobx";
import type { CommandRow, ICommandPaletteViewModel } from "./ICommandPaletteViewModel";

const OPEN_ACTION_ID = "shell.openCommandPalette";

export class CommandPaletteViewModel implements ICommandPaletteViewModel {
  readonly #commands: ICommandService;
  private isOpenState = false;
  private queryState = "";

  constructor({ commands }: { commands: ICommandService }) {
    this.#commands = commands;
    makeAutoObservable<this, "isOpenState" | "queryState">(
      this,
      { isOpenState: observable, queryState: observable, rows: false },
      { autoBind: true },
    );

    commands.actions.add({ id: OPEN_ACTION_ID, label: "커맨드 팔레트 열기", execute: () => this.open() });
    commands.keybindings.add({ keybinding: "ctrl+k", actionId: OPEN_ACTION_ID });
  }

  get isOpen(): boolean {
    return this.isOpenState;
  }

  open(): void {
    this.isOpenState = true;
  }

  close(): void {
    this.isOpenState = false;
    this.queryState = "";
  }

  get query(): string {
    return this.queryState;
  }

  setQuery(value: string): void {
    this.queryState = value;
  }

  get rows(): readonly CommandRow[] {
    return this.#commands.actions.list().map((action) => ({
      id: action.id,
      label: action.label,
      keybinding: this.#effectiveKeybinding(action.id),
    }));
  }

  get keybinding(): string {
    return this.#effectiveKeybinding(OPEN_ACTION_ID);
  }

  run(actionId: string): void {
    this.#commands.execute(actionId);
    this.close();
  }

  dispose(): void {}

  #effectiveKeybinding(actionId: string): string {
    const commands = this.#commands;
    const effective = commands.overrides.has(actionId)
      ? commands.overrides.get(actionId)
      : commands.keybindings.list().find((entry) => entry.actionId === actionId)?.keybinding;
    return typeof effective === "string" ? effective : "";
  }
}
