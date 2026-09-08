import type { Disposable } from '#core/di';
import { Emitter } from '#core/events';
import type { GitFileStatus } from 'contracts';
import { diffKeyOf, type DiffEntry, type GitLoadStatus, type IGitModel } from './IGitModel';
import type { IGitService } from './IGitService';

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** `IGitModel`의 유일한 구현체. */
export class GitModel implements IGitModel {
  readonly #service: IGitService;
  readonly #changed = new Emitter();
  #repository = false;
  #branch: string | null = null;
  #files: readonly GitFileStatus[] = [];
  #status: GitLoadStatus = 'idle';
  #failure: string | null = null;
  #diffs: Readonly<Record<string, DiffEntry>> = {};

  constructor({ gitService }: { gitService: IGitService }) {
    this.#service = gitService;
  }

  get repository(): boolean {
    return this.#repository;
  }

  get branch(): string | null {
    return this.#branch;
  }

  get files(): readonly GitFileStatus[] {
    return this.#files;
  }

  get status(): GitLoadStatus {
    return this.#status;
  }

  get failure(): string | null {
    return this.#failure;
  }

  get diffs(): Readonly<Record<string, DiffEntry>> {
    return this.#diffs;
  }

  async refresh(): Promise<void> {
    this.#status = 'loading';
    this.#changed.fire();
    try {
      const result = await this.#service.status();
      this.#repository = result.repository;
      this.#branch = result.branch;
      this.#files = result.files;
      this.#status = 'loaded';
      this.#failure = null;
    } catch (error) {
      this.#status = 'error';
      this.#failure = messageOf(error);
    }
    this.#changed.fire();
  }

  async stage(paths: readonly string[]): Promise<void> {
    await this.#act(() => this.#service.stage(paths));
  }

  async unstage(paths: readonly string[]): Promise<void> {
    await this.#act(() => this.#service.unstage(paths));
  }

  async commit(message: string): Promise<string | null> {
    let hash: string | null = null;
    await this.#act(async () => {
      hash = await this.#service.commit(message);
    });
    return hash;
  }

  async loadDiff(path: string, staged: boolean): Promise<void> {
    const key = diffKeyOf(path, staged);
    this.#setDiff(key, { status: 'loading', text: this.#diffs[key]?.text ?? '', failure: null });
    try {
      this.#setDiff(key, { status: 'loaded', text: await this.#service.diff(path, staged), failure: null });
    } catch (error) {
      this.#setDiff(key, { status: 'error', text: '', failure: messageOf(error) });
    }
  }

  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }

  /** 조작 뒤에는 상태를 다시 읽는다. 실패는 `failure`에 남기고 던지지 않는다. */
  async #act(run: () => Promise<void>): Promise<void> {
    try {
      await run();
      this.#failure = null;
    } catch (error) {
      this.#failure = messageOf(error);
      this.#changed.fire();
      return;
    }
    await this.refresh();
  }

  #setDiff(key: string, entry: DiffEntry): void {
    this.#diffs = { ...this.#diffs, [key]: entry };
    this.#changed.fire();
  }
}
