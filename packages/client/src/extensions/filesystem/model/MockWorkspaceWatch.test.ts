import { MockWorkspaceWatch } from "./MockWorkspaceWatch";
import { testWorkspaceWatchContract } from "./workspaceWatch.contract";

testWorkspaceWatchContract("MockWorkspaceWatch", () => {
  const watch = new MockWorkspaceWatch();
  return {
    watch,
    change: (path) => {
      watch.emit([path]);
      return Promise.resolve();
    },
    mkdir: () => Promise.resolve(),
  };
});
