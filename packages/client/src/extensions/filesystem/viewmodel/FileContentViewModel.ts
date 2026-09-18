import type { Disposable } from "#core/di";
import { makeAutoObservable, observableRef, reaction } from "mobx";
import type { IFileContentModel, OpenFile } from "../model/IFileContentModel";
import type { IFileContentViewModel, FileRow, FileRowMap } from "./IFileContentViewModel";

/** `IFileContentViewModel`을 구현한다 — Model의 `OpenFile`을 화면용 `FileRow`로 변환한다. */
export class FileContentViewModel implements IFileContentViewModel {
  readonly #model: IFileContentModel;
  private rowsState: FileRowMap;
  readonly #subscription: Disposable;

  /** Model을 구독해 화면용 행으로 편다. */
  constructor({ fileContentModel }: { fileContentModel: IFileContentModel }) {
    this.#model = fileContentModel;
    // Model은 값과 이벤트만 준다 — 화면 상태는 여기서 소유한다.
    this.rowsState = this.#computeRows();
    this.#subscription = fileContentModel.onDidChange(() => this.syncRows());
    makeAutoObservable<this, "rowsState">(
      this,
      {
        rowsState: observableRef,
      },
      { autoBind: true },
    );
  }

  /** 구독을 끊는다. 컨테이너가 이 VM을 정리할 때 불린다. */
  dispose(): void {
    this.#subscription.dispose();
  }

  #computeRows(): FileRowMap {
    return Object.fromEntries(Object.entries(this.#model.files).map(([path, file]) => [path, this.#toRow(file)]));
  }

  /** `#rows`를 값으로 노출한다. */
  get rows(): FileRowMap {
    return this.rowsState;
  }

  /** `rows`가 바뀔 때마다 부른다 — 화면 밖(탭의 더티 표시)이 지켜보는 통로다. */
  onDidChange(listener: () => void): Disposable {
    const stop = reaction(
      () => this.rowsState,
      () => listener(),
    );
    return { dispose: stop };
  }

  private syncRows(): void {
    this.rowsState = this.#computeRows();
  }

  /** `#model.open`으로 읽은 뒤 판정한다. 읽기 실패·바이너리는 텍스트 탭이 열 수 없는 것이라 닫고 `false`다. */
  async openFile(path: string): Promise<boolean> {
    await this.#model.open(path);
    const file = this.#model.files[path];
    if (file !== undefined && file.status !== "error" && !file.binary) return true;
    this.#model.close(path);
    return false;
  }

  /** `#model.edit`에 위임한다. 미리보기 탭 고정은 셸이 `isDirty`가 켜지는 순간을 보고 한다. */
  editFile(path: string, content: string): void {
    this.#model.edit(path, content);
  }

  /** `#model.save`에 위임한다. */
  saveFile(path: string): void {
    void this.#model.save(path);
  }

  /** `#model.retargetOpenFile`에 위임한다. */
  retargetOpenFile(oldPrefix: string, newPrefix: string): void {
    this.#model.retargetOpenFile(oldPrefix, newPrefix);
  }

  /** `#model.startWatching`에 위임한다. */
  startWatching(): void {
    this.#model.startWatching();
  }

  /** `#model.stopWatching`에 위임한다. */
  stopWatching(): void {
    this.#model.stopWatching();
  }

  #toRow(file: OpenFile): FileRow {
    if (file.status === "loading") return this.#locked("", null, true);
    if (file.status === "error") return this.#locked("", file.failure ?? "읽지 못했다", false);
    if (file.binary) return this.#locked("", "텍스트가 아니라 보여줄 수 없다.", false);
    // 잘린 파일은 내용은 보여주되(있는 부분까지는 읽을 이유가 있다) 편집은 막는다 — 다시 쓰면
    // 상한 뒤의 내용이 통째로 사라진다.
    if (file.truncated) return this.#locked(file.content, "파일이 커서 앞부분만 보여준다. 편집할 수 없다.", false);

    return {
      content: file.content,
      notice: this.#saveNotice(file),
      readOnly: false,
      isDirty: file.content !== file.savedContent,
      isSaving: file.saveStatus === "saving",
      loading: false,
    };
  }

  /** 저장 중은 여기 담기지 않는다 — 저장 버튼 회전만으로 표현한다. 실패만 문장으로 남는다. */
  #saveNotice(file: OpenFile): string | null {
    if (file.saveStatus === "error") return `저장하지 못했다 — ${file.saveFailure ?? ""}`;
    return null;
  }

  #locked(content: string, notice: string | null, loading: boolean): FileRow {
    return { content, notice, readOnly: true, isDirty: false, isSaving: false, loading };
  }
}
