import type { IMarkdownSource, MarkdownDocument } from '../model/IMarkdownSource';

/**
 * 조립부가 넘겨주는 파일 통로의 최소 모양. `filesystem` 슬라이스의 타입을 그대로 쓰지 않고 구조만
 * 적는다 — 슬라이스끼리는 서로를 import하지 않는다. 조립부가 실제 포트를 꽂으면 구조가 맞는다.
 */
export type MarkdownFileReader = {
  read(path: string): Promise<{ readonly content: string; readonly encoding: string; readonly truncated: boolean }>;
};

export type MarkdownDirectoryWatcher = {
  watch(paths: readonly string[], onChange: (changed: readonly string[]) => void): () => void;
};

/** 워크스페이스 포트 둘을 마크다운이 바라는 모양으로 감싼다. */
class WorkspaceMarkdownSourceAdapter implements IMarkdownSource {
  readonly #files: MarkdownFileReader;
  readonly #watch: MarkdownDirectoryWatcher;

  constructor({ files, watch }: { files: MarkdownFileReader; watch: MarkdownDirectoryWatcher }) {
    this.#files = files;
    this.#watch = watch;
  }

  async read(path: string): Promise<MarkdownDocument> {
    const file = await this.#files.read(path);
    if (file.encoding === 'binary') throw new Error('텍스트 파일이 아니다.');
    return { content: file.content, truncated: file.truncated };
  }

  /**
   * 파일 자체가 아니라 **부모 디렉터리**를 감시한다 — 에디터의 저장은 임시 파일에 쓰고 rename
   * 하는 경우가 많아, 파일 자체를 보면 inotify가 그 교체를 놓친다.
   */
  watch(path: string, onChange: () => void): () => void {
    return this.#watch.watch([path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''], onChange);
  }
}

/** `IMarkdownSource`의 실제 구현을 만든다. 조립부가 `filesystem`의 두 포트를 넘긴다. */
export const createWorkspaceMarkdownSource = (ports: { files: MarkdownFileReader; watch: MarkdownDirectoryWatcher }): IMarkdownSource =>
  new WorkspaceMarkdownSourceAdapter(ports);
