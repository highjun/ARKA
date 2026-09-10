import type { Disposable } from '#core/di';
import { Emitter } from '#core/events';
import type { IMarkdownPreviewModel, Preview } from './IMarkdownPreviewModel';
import type { IMarkdownSource } from './IMarkdownSource';

/** `IMarkdownPreviewModel`의 유일한 구현체. */
export class MarkdownPreviewModel implements IMarkdownPreviewModel {
  readonly #source: IMarkdownSource;
  readonly #changed = new Emitter();
  readonly #watches = new Map<string, () => void>();
  #previews: Readonly<Record<string, Preview>> = {};

  constructor({ source }: { source: IMarkdownSource }) {
    this.#source = source;
  }

  get previews(): Readonly<Record<string, Preview>> {
    return this.#previews;
  }

  open(path: string): void {
    if (this.#watches.has(path)) return;
    this.#set({ path, status: 'loading', markdown: '', truncated: false, failure: null });
    this.#watches.set(
      path,
      this.#source.watch(path, () => void this.#load(path)),
    );
    void this.#load(path);
  }

  close(path: string): void {
    this.#watches.get(path)?.();
    this.#watches.delete(path);
    const { [path]: _dropped, ...rest } = this.#previews;
    this.#previews = rest;
    this.#changed.fire();
  }

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
      this.#set({ path, status: 'loaded', markdown: document.content, truncated: document.truncated, failure: null });
    } catch (error) {
      if (this.#previews[path] === undefined) return;
      this.#set({ ...(this.#previews[path] ?? current), status: 'error', failure: error instanceof Error ? error.message : String(error) });
    }
  }

  #set(preview: Preview): void {
    this.#previews = { ...this.#previews, [preview.path]: preview };
    this.#changed.fire();
  }
}
