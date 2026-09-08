import type { ITabDirtyState } from '../model/ITabDirtyState';
import type { IWorkbenchStartup } from '../model/IWorkbenchStartup';

/**
 * 저장 안 된 변경을 안고 새로고침하면 그대로 사라진다 — 떠나기 전에 브라우저가 묻게 한다.
 *
 * 리스너는 한 번만 걸고 상태는 그때그때 `ITabDirtyState`에 묻는다. 값이 바뀔 때마다 리스너를
 * 갈아 끼우면 그 틈에 발생한 `beforeunload`를 놓칠 수 있다.
 */
export const createUnloadGuard = ({ tabDirtyState }: { tabDirtyState: ITabDirtyState }): IWorkbenchStartup => {
  const onBeforeUnload = (event: BeforeUnloadEvent) => {
    if (!tabDirtyState.hasAnyDirty()) return;
    event.preventDefault();
    // 크롬은 `returnValue`를 설정해야 확인 대화상자를 띄운다 — 문구는 브라우저가 정한다.
    event.returnValue = '';
  };
  return {
    start: () => window.addEventListener('beforeunload', onBeforeUnload),
    stop: () => window.removeEventListener('beforeunload', onBeforeUnload),
  };
};
