import { describe, expect, it } from "vitest";
import { AgentEvent, type AgentEventInput } from "./events";

const head = { seq: 1, sessionId: "s1", runId: "r1", at: 0 };

describe("AgentEvent", () => {
  it("type으로 분기하는 union이다 — 각 type이 자기 필드를 요구한다", () => {
    expect(AgentEvent.parse({ ...head, type: "assistant.delta", messageId: "m1", text: "안" }).type).toBe(
      "assistant.delta",
    );
    expect(() => AgentEvent.parse({ ...head, type: "assistant.delta", text: "안" })).toThrow();
  });

  it("모르는 type은 거부한다 — 클라이언트는 그 프레임을 버린다", () => {
    expect(AgentEvent.safeParse({ ...head, type: "future.thing" }).success).toBe(false);
  });

  it("run.finished는 끝난 상태만 받는다", () => {
    expect(AgentEvent.safeParse({ ...head, type: "run.finished", status: "done" }).success).toBe(true);
    expect(AgentEvent.safeParse({ ...head, type: "run.finished", status: "running" }).success).toBe(false);
  });

  it("세션 수준 이벤트는 runId가 null일 수 있고, Run 이벤트는 그럴 수 없다", () => {
    expect(AgentEvent.safeParse({ ...head, runId: null, type: "session.renamed", title: "t" }).success).toBe(true);
    expect(
      AgentEvent.safeParse({ ...head, runId: null, type: "run.started", mode: "action", input: "x" }).success,
    ).toBe(false);
  });

  it("seq는 1 이상이다", () => {
    expect(AgentEvent.safeParse({ ...head, seq: 0, type: "assistant.done", messageId: "m" }).success).toBe(false);
  });

  it("AgentEventInput은 seq와 at을 뺀 모양이다", () => {
    const input: AgentEventInput = {
      sessionId: "s",
      runId: "r",
      type: "tool.call",
      callId: "c",
      toolId: "fs.read",
      input: { path: "a" },
    };
    expect(AgentEvent.parse({ ...input, seq: 1, at: 0 }).type).toBe("tool.call");
  });
});
