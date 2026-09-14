import type { Disposable } from "#core/di";
import { Emitter } from "#core/events";
import type { IMarkdownPreviewModel, Preview } from "./IMarkdownPreviewModel";
import type { IMarkdownSource } from "./IMarkdownSource";

/** `IMarkdownPreviewModel`의 유일한 구현체. */
export class MarkdownPreviewModel implements IMarkdownPreviewModel {
  readonly #source: IMarkdownSource;
  readonly #changed = new Emitter();
  readonly #watches = new Map<string, () => void>();
  #previews: Readonly<Record<string, Preview>> = {};

  /** 감시는 `open`에서 시작한다 — 만드는 것만으로는 아무것도 읽지 않는다. */
  constructor({ source }: { source: IMarkdownSource }) {
    this.#source = source;
  }

  /** 경로를 키로 하는 맵이다. 닫은 파일은 키째 사라진다. */
  get previews(): Readonly<Record<string, Preview>> {
    return this.#previews;
  }

  /** 이미 열려 있으면 아무 일도 안 한다. 열자마자 `loading`으로 두고 읽기 시작한다. */
  open(path: string): void {
    if (this.#watches.has(path)) return;
    this.#set({ path, status: "loading", markdown: "", truncated: false, failure: null });
    this.#watches.set(
      path,
      this.#source.watch(path, () => void this.#load(path)),
    );
    void this.#load(path);
  }

  /** 감시를 끊고 항목을 지운다. 열려 있지 않아도 안전하다. */
  close(path: string): void {
    this.#watches.get(path)?.();
    this.#watches.delete(path);
    const { [path]: _dropped, ...rest } = this.#previews;
    this.#previews = rest;
    this.#changed.fire();
  }

  /** 무엇이 바뀌었는지는 주지 않는다 — 받는 쪽이 `previews`를 다시 읽는다. */
  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }

  async #load(path: string): Promise<void> {
    const current = this.#previews[path];
    if (current === undefined) return;
    try {
      const document = await this.#source.read(path);
      // 그 사이 닫혔다
      if (this.#previews[path] === undefined) return;
      this.#set({ path, status: "loaded", markdown: document.content, truncated: document.truncated, failure: null });
    } catch (error) {
      if (this.#previews[path] === undefined) return;
      this.#set({
        ...(this.#previews[path] ?? current),
        status: "error",
        failure: error instanceof Error ? error.message : String(error),
      });
    }
  }

  #set(preview: Preview): void {
    this.#previews = { ...this.#previews, [preview.path]: preview };
    this.#changed.fire();
  }
}
