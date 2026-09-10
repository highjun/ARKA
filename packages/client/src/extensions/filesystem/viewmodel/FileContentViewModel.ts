import type { Disposable } from '#core/di';
import { ViewModelBase } from '#core/viewmodel';
import { atom } from 'nanostores';
import type { IFileContentModel, OpenFile } from '../model/IFileContentModel';
import type { IPinTab } from '../model/IPinTab';
import type { IFileContentViewModel, FileRow, FileRowMap } from './IFileContentViewModel';

/** `IFileContentViewModel`을 구현한다 — Model의 `OpenFile`을 화면용 `FileRow`로 변환한다. */
export class FileContentViewModel extends ViewModelBase implements IFileContentViewModel {
  readonly #model: IFileContentModel;
  readonly #pinTab: IPinTab;
  readonly #rows;
  readonly #subscription: Disposable;

  /** `pinTab`을 받는 이유는 편집이 시작되면 미리보기 탭을 고정해야 해서다. */
  constructor({ fileContentModel, pinTab }: { fileContentModel: IFileContentModel; pinTab: IPinTab }) {
    super();
    this.#model = fileContentModel;
    this.#pinTab = pinTab;
    // Model은 값과 이벤트만 준다 — 화면 상태(atom)는 여기서 소유한다.
    this.#rows = this.observe(atom(this.#computeRows()));
    this.#subscription = fileContentModel.onDidChange(() => {
      this.#rows.set(this.#computeRows());
    });
  }

  /** 구독을 끊는다. 컨테이너가 이 VM을 정리할 때 불린다. */
  dispose(): void {
    this.#subscription.dispose();
  }

  #computeRows(): FileRowMap {
    return Object.fromEntries(
      Object.entries(this.#model.files).map(([path, file]) => [path, this.#toRow(file)]),
    );
  }

  /** `#rows`를 값으로 노출한다. */
  get rows(): FileRowMap {
    return this.#rows.get();
  }

  /** `ViewModelBase.subscribe`(React 배선)를 계약이 쓰는 `Disposable` 모양으로 감싼다. */
  onDidChange(listener: () => void): Disposable {
    return { dispose: this.subscribe(listener) };
  }

  /** `#model.open`에 위임한다. */
  openFile(path: string): void {
    void this.#model.open(path);
  }

  /**
   * `#model.edit`에 위임한다. 편집이 이 파일을 처음 dirty로 만드는 순간 탭을 고정한다 —
   * 미리보기(italic) 상태로 남아 있으면 "아직 안 읽어본 파일"이라는 원래 뜻과 어긋난다.
   */
  editFile(path: string, content: string): void {
    const wasDirty = this.#rows.get()[path]?.isDirty ?? false;
    this.#model.edit(path, content);
    if (!wasDirty && this.#rows.get()[path]?.isDirty) this.#pinTab.pin(path);
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
    if (file.status === 'loading') return this.#locked('', null, true);
    if (file.status === 'error') return this.#locked('', file.failure ?? '읽지 못했다', false);
    if (file.binary) return this.#locked('', '텍스트가 아니라 보여줄 수 없다.', false);
    // 잘린 파일은 내용은 보여주되(있는 부분까지는 읽을 이유가 있다) 편집은 막는다 — 다시 쓰면
    // 상한 뒤의 내용이 통째로 사라진다.
    if (file.truncated) return this.#locked(file.content, '파일이 커서 앞부분만 보여준다. 편집할 수 없다.', false);

    return {
      content: file.content,
      notice: this.#saveNotice(file),
      readOnly: false,
      isDirty: file.content !== file.savedContent,
      isSaving: file.saveStatus === 'saving',
      loading: false,
    };
  }

  /** 저장 중은 여기 담기지 않는다 — 저장 버튼 회전만으로 표현한다. 실패만 문장으로 남는다. */
  #saveNotice(file: OpenFile): string | null {
    if (file.saveStatus === 'error') return `저장하지 못했다 — ${file.saveFailure ?? ''}`;
    return null;
  }

  #locked(content: string, notice: string | null, loading: boolean): FileRow {
    return { content, notice, readOnly: true, isDirty: false, isSaving: false, loading };
  }
}
