import type { Disposable } from "#core/di";
import type { ISettings } from "#core/settings";
import { makeAutoObservable, observableRef } from "mobx";
import type { ISettingsViewModel, SettingsRow } from "./ISettingsViewModel";

/** `ISettingsViewModel`의 유일한 구현체. 스키마 순서대로 줄을 편다. */
export class SettingsViewModel implements ISettingsViewModel {
  readonly #settings: ISettings;
  readonly #subscription: Disposable;
  private rowsState: readonly SettingsRow[];
  private queryState = "";

  /** 값이 바뀔 때마다 줄을 다시 편다 — 스키마는 부팅 때 굳는다. */
  constructor({ settings }: { settings: ISettings }) {
    this.#settings = settings;
    this.rowsState = this.#computeRows();
    makeAutoObservable<this, "rowsState">(this, { rowsState: observableRef }, { autoBind: true });
    this.#subscription = settings.onDidChange(() => this.sync());
  }

  /** 스키마 순서 그대로. */
  get rows(): readonly SettingsRow[] {
    return this.rowsState;
  }

  /** 찾을 말. 화면에 하나뿐이고 단축키 줄도 이것으로 걸러진다. */
  get query(): string {
    return this.queryState;
  }

  /** 거르지는 않는다 — 그것은 화면의 순수 변환이다. */
  setQuery(value: string): void {
    this.queryState = value;
  }

  /** `ISettings.set`에 넘긴다 — 저장과 알림은 그쪽이 한다. */
  set(id: string, value: unknown): void {
    this.#settings.set(id, value);
  }

  /** 구독을 끊는다. */
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
      category: descriptor.category ?? "일반",
      ...(descriptor.description === undefined ? {} : { description: descriptor.description }),
      type: descriptor.type,
      value: this.#settings.get<unknown>(descriptor.id),
      ...(descriptor.type === "enum" ? { options: descriptor.options } : {}),
    }));
  }
}
