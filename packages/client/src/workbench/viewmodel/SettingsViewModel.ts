import type { Disposable } from "#core/di";
import type { ISettings } from "#core/settings";
import { makeAutoObservable, observableRef } from "mobx";
import type { ISettingsViewModel, SettingsRow } from "./ISettingsViewModel";

export class SettingsViewModel implements ISettingsViewModel {
  readonly #settings: ISettings;
  readonly #subscription: Disposable;
  private rowsState: readonly SettingsRow[];

  constructor({ settings }: { settings: ISettings }) {
    this.#settings = settings;
    this.rowsState = this.#computeRows();
    makeAutoObservable<this, "rowsState">(this, { rowsState: observableRef }, { autoBind: true });
    this.#subscription = settings.onDidChange(() => this.sync());
  }

  get rows(): readonly SettingsRow[] {
    return this.rowsState;
  }

  set(id: string, value: unknown): void {
    this.#settings.set(id, value);
  }

  dispose(): void {
    this.#subscription.dispose();
  }

  private sync(): void {
    this.rowsState = this.#computeRows();
  }

  #computeRows(): readonly SettingsRow[] {
    return this.#settings.schema.list().map((descriptor) => ({
      id: descriptor.id,
      title: descriptor.title,
      type: descriptor.type,
      value: this.#settings.get<unknown>(descriptor.id),
      ...(descriptor.type === "enum" ? { options: descriptor.options } : {}),
    }));
  }
}
