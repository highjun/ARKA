import { createToken } from '#core/di';

/** 화면이 그대로 쓰는 행. `staged`로 어느 목록에 놓일지가 갈린다. */
export type ChangeRow = {
  readonly path: string;
  /** 화면 라벨 — `M`·`A`·`D`·`R`·`U`. */
  readonly badge: string;
  readonly staged: boolean;
};

/** 화면이 그대로 쓰는 모양 — Model의 `status`가 `loading` 불리언으로 펴져 있다. */
export type DiffState = {
  readonly loading: boolean;
  readonly text: string;
  readonly failure: string | null;
};

export const SourceControlViewModelToken = createToken<ISourceControlViewModel>('sourceControlViewModel');
/** 소스 제어 패널과 diff 탭이 함께 보는 화면 상태. VSCode의 SCM 뷰에 해당한다. */
export interface ISourceControlViewModel {
  /** 마운트에 상태를 읽는다. */
  onMount(): void;
  onDispose(): void;

  readonly repository: boolean;
  readonly branch: string | null;
  readonly loading: boolean;
  readonly staged: readonly ChangeRow[];
  readonly unstaged: readonly ChangeRow[];
  readonly message: string;
  /** 메시지가 있고 스테이지된 것이 있고 요청 중이 아니다. */
  readonly canCommit: boolean;
  readonly failure: string | null;
  /** 마지막 커밋 해시 앞 7자. 이번 세션에 커밋한 적 없으면 `null`. */
  readonly lastCommit: string | null;

  refresh(): void;
  setMessage(message: string): void;
  stage(path: string): void;
  unstage(path: string): void;
  stageAll(): void;
  unstageAll(): void;
  commit(): void;

  /** diff 탭이 렌더마다 부른다 — 이미 읽고 있으면 아무 일도 없다. */
  openDiff(tabId: string): void;
  diffOf(tabId: string): DiffState;
}
