import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IEventStore } from "./IEventStore";

/** `IEventStore`를 구현한 모든 것이 통과해야 하는 스위트. `setup`은 빈 저장소를 새로 준다. */
export const testEventStoreContract = (name: string, setup: () => IEventStore | Promise<IEventStore>): void => {
  describe(`IEventStore: ${name}`, () => {
    let store: IEventStore;
    beforeEach(async () => {
      store = await setup();
    });

    const renamed = (sessionId: string, title: string) =>
      store.append({ sessionId, runId: null, type: "session.renamed", title });

    it("seq는 세션마다 1부터 단조 증가한다", () => {
      expect(renamed("a", "1").seq).toBe(1);
      expect(renamed("a", "2").seq).toBe(2);
      expect(renamed("b", "1").seq).toBe(1);
    });

    it("at을 붙인다", () => {
      expect(typeof renamed("a", "1").at).toBe("number");
    });

    it("listSince는 since보다 큰 seq만 순서대로 준다", () => {
      renamed("a", "1");
      renamed("a", "2");
      renamed("a", "3");
      expect(store.listSince("a", 0).map((e) => e.seq)).toEqual([1, 2, 3]);
      expect(store.listSince("a", 2).map((e) => e.seq)).toEqual([3]);
      expect(store.listSince("a", 3)).toEqual([]);
      expect(store.listSince("nope", 0)).toEqual([]);
    });

    it("저장한 이벤트를 그대로 돌려준다 — unknown 필드(툴 입력)도 잃지 않는다", () => {
      const saved = store.append({ sessionId: "a", runId: "r", type: "tool.call", callId: "c", toolId: "echo", input: { text: "x", n: [1, 2] } });
      expect(store.listSince("a", 0)[0]).toEqual(saved);
      expect(saved).toMatchObject({ input: { text: "x", n: [1, 2] } });
    });

    it("구독자는 append 직후 동기로 불리고, 다른 세션의 이벤트는 받지 않는다", () => {
      const listener = vi.fn();
      const unsubscribe = store.subscribe("a", listener);
      const saved = renamed("a", "1");
      expect(listener).toHaveBeenCalledWith(saved);
      renamed("b", "1");
      expect(listener).toHaveBeenCalledTimes(1);
      unsubscribe();
      renamed("a", "2");
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
};
