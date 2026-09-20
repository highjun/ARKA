import type { IWorkspaceWatch, WorkspaceWatchUnsubscribe } from "./IWorkspaceWatch";

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

  emit(changed: readonly string[]): void {
    for (const subscription of [...this.#subscriptions]) {
      const mine = changed.filter((path) => subscription.paths.includes(path));
      if (mine.length > 0) subscription.onChange(mine);
    }
  }
}
