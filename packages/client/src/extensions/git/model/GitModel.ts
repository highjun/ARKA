import type { Disposable } from "#core/di";
import { Emitter } from "#core/events";
import type { GitFileStatus } from "#contracts";
import { diffKeyOf, type DiffEntry, type GitLoadStatus, type IGitModel } from "./IGitModel";
import type { IGitService } from "./IGitService";

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** `IGitModel`의 유일한 구현체. */
export class GitModel implements IGitModel {
  readonly #service: IGitService;
  readonly #changed = new Emitter();
  #repository = false;
  #branch: string | null = null;
  #files: readonly GitFileStatus[] = [];
  #status: GitLoadStatus = "idle";
  #failure: string | null = null;
  #diffs: Readonly<Record<string, DiffEntry>> = {};

  /** 만들기만 해서는 아무것도 읽지 않는다 — `refresh`를 불러야 한다. */
  constructor({ gitService }: { gitService: IGitService }) {
    this.#service = gitService;
  }

  /** 아직 안 읽었으면 `false`다 — 모르면 저장소가 아니라고 답한다. */
  get repository(): boolean {
    return this.#repository;
  }

  /** 분리 HEAD거나 아직 안 읽었으면 `null`이다. */
  get branch(): string | null {
    return this.#branch;
  }

  /** 스테이지된 것과 아닌 것이 한 목록에 섞여 온다 — 가르는 것은 ViewModel의 몫이다. */
  get files(): readonly GitFileStatus[] {
    return this.#files;
  }

  /** 조작(`stage`·`commit`) 중에도 `loading`이 된다 — 뒤이어 상태를 다시 읽기 때문이다. */
  get status(): GitLoadStatus {
    return this.#status;
  }

  /** 마지막 실패의 메시지. 성공하면 지워진다. */
  get failure(): string | null {
    return this.#failure;
  }

  /** `diffKeyOf`가 만든 키를 쓴다 — 같은 파일의 staged/worktree가 따로 산다. */
  get diffs(): Readonly<Record<string, DiffEntry>> {
    return this.#diffs;
  }

  /** 실패해도 던지지 않는다 — `status`가 `error`가 되고 `failure`에 남는다. */
  async refresh(): Promise<void> {
    this.#status = "loading";
    this.#changed.fire();
    try {
      const result = await this.#service.status();
      this.#repository = result.repository;
      this.#branch = result.branch;
      this.#files = result.files;
      this.#status = "loaded";
      this.#failure = null;
    } catch (error) {
      this.#status = "error";
      this.#failure = messageOf(error);
    }
    this.#changed.fire();
  }

  /** 끝나면 상태를 다시 읽는다. 실패는 던지지 않고 `failure`에 남는다. */
  async stage(paths: readonly string[]): Promise<void> {
    await this.#act(() => this.#service.stage(paths));
  }

  /** 끝나면 상태를 다시 읽는다. 실패는 던지지 않고 `failure`에 남는다. */
  async unstage(paths: readonly string[]): Promise<void> {
    await this.#act(() => this.#service.unstage(paths));
  }

  /** 성공하면 커밋 해시, 실패하면 `null`이다 — 실패 사유는 `failure`에 있다. */
  async commit(message: string): Promise<string | null> {
    let hash: string | null = null;
    await this.#act(async () => {
      hash = await this.#service.commit(message);
    });
    return hash;
  }

  /** 읽는 동안 직전 텍스트를 유지한다. 실패하면 그 항목만 `error`가 된다. */
  async loadDiff(path: string, staged: boolean): Promise<void> {
    const key = diffKeyOf(path, staged);
    this.#setDiff(key, { status: "loading", text: this.#diffs[key]?.text ?? "", failure: null });
    try {
      this.#setDiff(key, { status: "loaded", text: await this.#service.diff(path, staged), failure: null });
    } catch (error) {
      this.#setDiff(key, { status: "error", text: "", failure: messageOf(error) });
    }
  }

  /** 무엇이 바뀌었는지는 주지 않는다 — 받는 쪽이 다시 읽는다. */
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
