import { createToken, type Disposable } from '#core/di';

export const TabDirtyStateToken = createToken<ITabDirtyState>("tabDirtyState");
/**
 * "이 탭에 저장 안 된 변경이 있는가"를 셸이 묻는 자리.
 *
 * **셸이 파일을 모르게 하는 계약이다.** 셸은 묻기만 하고, 답은 탭을 기여한 쪽이 채운다 —
 * 누가 채우는지는 조립부(`registerServices.tsx`)만 안다. `IPinTab`을 뒤집은 모양이다.
 *
 * VSCode의 `IWorkingCopyService`(`registerWorkingCopy`/`isDirty(resource)`/`onDidChangeDirty`)와
 * 같은 역할이다 — 거기서도 탭 UI는 파일 계층이 아니라 이 서비스에 묻는다. 다만 VSCode는 열린
 * 에디터마다 `IWorkingCopy` 객체를 등록받는 레지스트리이고, 여기서는 탭 id로 조회하는 서비스
 * 하나다(탭이 `{id, kind}` 값이라 등록할 인스턴스가 없다).
 */
export interface ITabDirtyState {
  /** 없거나 더러워질 수 없는 탭이면 `false`. */
  isDirty(tabId: string): boolean;
  /** 어느 탭이든 저장 안 된 변경이 있는가 — 새로고침 경고가 쓴다. VSCode의 `dirtyCount`에 해당한다. */
  hasAnyDirty(): boolean;
  /** 답이 바뀌었음을 알린다 — 셸이 구독해 탭 표시를 다시 계산한다. */
  onDidChange(listener: () => void): Disposable;
}
