import type { IMarkdownSource, MarkdownDocument } from "./IMarkdownSource";

/** 메모리 안의 `IMarkdownSource`. `write`로 바꾸면 감시자가 불린다. */
export class MockMarkdownSource implements IMarkdownSource {
  readonly #files = new Map<string, string>();
  readonly #watchers = new Map<string, Set<() => void>>();

  /** 처음 담을 파일을 경로→내용 맵으로 준다. */
  constructor(files: Readonly<Record<string, string>> = {}) {
    for (const [path, content] of Object.entries(files)) this.#files.set(path, content);
  }

  /** 없는 경로면 reject한다 — 실제 소스의 실패 경로를 흉내낸다. */
  read(path: string): Promise<MarkdownDocument> {
    const content = this.#files.get(path);
    if (content === undefined) return Promise.reject(new Error(`no such file: ${path}`));
    return Promise.resolve({ content, truncated: false });
  }

  /** 지금 값을 바로 주지 않는다 — `write`로 바뀔 때만 부른다. */
  watch(path: string, onChange: () => void): () => void {
    const set = this.#watchers.get(path) ?? new Set();
    set.add(onChange);
    this.#watchers.set(path, set);
    return () => {
      set.delete(onChange);
    };
  }

  /** 테스트가 파일 변경을 일으키는 자리다 — 실제 소스에는 없는 메서드다. */
  write(path: string, content: string): void {
    this.#files.set(path, content);
    for (const listener of [...(this.#watchers.get(path) ?? [])]) listener();
  }
}
