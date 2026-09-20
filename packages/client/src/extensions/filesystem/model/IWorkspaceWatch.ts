export type WorkspaceWatchUnsubscribe = () => void;

declare module "#core/di" {
  interface InstanceMap {
    "arka.filesystem.workspaceWatch": IWorkspaceWatch;
  }
}
export interface IWorkspaceWatch {
  watch(paths: readonly string[], onChange: (changed: readonly string[]) => void): WorkspaceWatchUnsubscribe;
}
