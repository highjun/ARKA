import type { IWorkspaceWatch, WorkspaceWatchUnsubscribe } from './IWorkspaceWatch';

/**
 * 메모리 안의 `IWorkspaceWatch`. 테스트가 `emit`으로 변경을 흉내 낸다 — 실물처럼 구독한 경로만 걸러 알린다.
 */
export class MockWorkspaceWatch implements IWorkspaceWatch {
  readonly #subscriptions = new Set<{ paths: readonly string[]; onChange: (changed: readonly string[]) => void }>();

  watch(paths: readonly string[], onChange: (changed: readonly string[]) => void): WorkspaceWatchUnsubscribe {
    if (paths.length === 0) return () => undefined;
    const subscription = { paths, onChange };
    this.#subscriptions.add(subscription);
    return () => {
      this.#subscriptions.delete(subscription);
    };
  }

  /** 이 경로들이 바뀌었다고 알린다. 구독마다 자기 경로에 해당하는 것만 받는다. */
  emit(changed: readonly string[]): void {
    for (const subscription of [...this.#subscriptions]) {
      const mine = changed.filter((path) => subscription.paths.includes(path));
      if (mine.length > 0) subscription.onChange(mine);
    }
  }
}
