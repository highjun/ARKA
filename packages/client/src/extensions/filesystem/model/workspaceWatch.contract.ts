import { beforeEach, describe, expect, it } from "vitest";
import type { IWorkspaceWatch } from "./IWorkspaceWatch";

export type WorkspaceWatchSetup = {
  readonly watch: IWorkspaceWatch;
  change(path: string): Promise<void>;
  mkdir(path: string): Promise<void>;
};

const waitFor = <T>(register: (resolve: (value: T) => void) => () => void, timeoutMs = 3_000): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      stop();
      reject(new Error("no change notification"));
    }, timeoutMs);
    const stop = register((value) => {
      clearTimeout(timer);
      resolve(value);
    });
  });

const settle = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export const testWorkspaceWatchContract = (
  name: string,
  setup: () => Promise<WorkspaceWatchSetup> | WorkspaceWatchSetup,
): void => {
  describe(`IWorkspaceWatch: ${name}`, () => {
    let s: WorkspaceWatchSetup;
    beforeEach(async () => {
      s = await setup();
    });

    it("감시한 경로 안이 바뀌면 그 경로로 알린다", async () => {
      const changed = await waitFor<readonly string[]>((resolve) => {
        const unsubscribe = s.watch.watch([""], resolve);
        void settle().then(() => s.change(""));
        return unsubscribe;
      });
      expect(changed).toContain("");
    });

    it("여러 경로를 감시하면 바뀐 것만 알린다", async () => {
      await s.mkdir("a");
      await s.mkdir("b");
      const changed = await waitFor<readonly string[]>((resolve) => {
        const unsubscribe = s.watch.watch(["a", "b"], resolve);
        void settle().then(() => s.change("b"));
        return unsubscribe;
      });
      expect(changed).toEqual(["b"]);
    });

    it("해지하면 더는 알리지 않는다", async () => {
      let calls = 0;
      const unsubscribe = s.watch.watch([""], () => {
        calls += 1;
      });
      await settle();
      unsubscribe();
      await s.change("");
      await settle(600);
      expect(calls).toBe(0);
    });

    it("빈 배열은 아무것도 감시하지 않고 해지 함수도 무해하다", async () => {
      let calls = 0;
      const unsubscribe = s.watch.watch([], () => {
        calls += 1;
      });
      await s.change("");
      await settle();
      unsubscribe();
      expect(calls).toBe(0);
    });
  });
};
