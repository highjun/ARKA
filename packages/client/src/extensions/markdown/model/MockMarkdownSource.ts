import type { IMarkdownSource, MarkdownDocument } from './IMarkdownSource';

/** 메모리 안의 `IMarkdownSource`. `write`로 바꾸면 감시자가 불린다. */
export class MockMarkdownSource implements IMarkdownSource {
  readonly #files = new Map<string, string>();
  readonly #watchers = new Map<string, Set<() => void>>();

  constructor(files: Readonly<Record<string, string>> = {}) {
    for (const [path, content] of Object.entries(files)) this.#files.set(path, content);
  }

  read(path: string): Promise<MarkdownDocument> {
    const content = this.#files.get(path);
    if (content === undefined) return Promise.reject(new Error(`no such file: ${path}`));
    return Promise.resolve({ content, truncated: false });
  }

  watch(path: string, onChange: () => void): () => void {
    const set = this.#watchers.get(path) ?? new Set();
    set.add(onChange);
    this.#watchers.set(path, set);
    return () => {
      set.delete(onChange);
    };
  }

  write(path: string, content: string): void {
    this.#files.set(path, content);
    for (const listener of [...(this.#watchers.get(path) ?? [])]) listener();
  }
}
