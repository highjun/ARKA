import { beforeEach, describe, expect, it } from "vitest";
import type { AgentSession } from "contracts";
import { AgentError } from "./errors";
import type { ISessionStore } from "./ISessionStore";

const session = (id: string, at: number): AgentSession => ({
  id,
  title: `제목 ${id}`,
  createdAt: at,
  updatedAt: at,
  archived: false,
  lastRunStatus: null,
});

/** `ISessionStore`를 구현한 모든 것이 통과해야 하는 스위트. `setup`은 빈 저장소를 새로 준다. */
export const testSessionStoreContract = (name: string, setup: () => ISessionStore | Promise<ISessionStore>): void => {
  describe(`ISessionStore: ${name}`, () => {
    let store: ISessionStore;
    beforeEach(async () => {
      store = await setup();
    });

    it("만든 것을 그대로 읽는다", () => {
      store.create(session("a", 1));
      expect(store.get("a")).toEqual(session("a", 1));
      expect(store.get("nope")).toBeNull();
    });

    it("목록은 updatedAt 내림차순이고 보관된 것도 포함한다", () => {
      store.create(session("a", 1));
      store.create(session("b", 2));
      store.update("a", { updatedAt: 3, archived: true });
      expect(store.list().map((s) => s.id)).toEqual(["a", "b"]);
      expect(store.list()[0]?.archived).toBe(true);
    });

    it("update는 준 조각만 덮어쓰고 결과를 돌려준다", () => {
      store.create(session("a", 1));
      const updated = store.update("a", { title: "새 제목", lastRunStatus: "running" });
      expect(updated).toEqual({ ...session("a", 1), title: "새 제목", lastRunStatus: "running" });
      expect(store.get("a")).toEqual(updated);
    });

    it("없는 세션을 update하면 SessionNotFound를 던진다", () => {
      expect(() => store.update("nope", { title: "x" })).toThrow(AgentError);
      expect(() => store.update("nope", { title: "x" })).toThrow(/SessionNotFound|no such session/u);
    });
  });
};
