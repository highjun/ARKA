import { describe, expect, it } from "vitest";
import { AgentError } from "../domain/errors";
import type { IAgentRunner, RunContext } from "../domain/IAgentRunner";
import { MemoryEventStore } from "../infra/MemoryEventStore";
import { MemorySessionStore } from "../infra/MemorySessionStore";
import { RunManager } from "./RunManager";

const silent = { info: () => undefined, warn: () => undefined, error: () => undefined };
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const make = (runner: IAgentRunner) => {
  const events = new MemoryEventStore({ now: () => 0 });
  const sessions = new MemorySessionStore();
  let id = 0;
  const manager = new RunManager({ events, sessions, runner, log: silent, now: () => 0, newId: () => `id${String(++id)}` });
  return { events, sessions, manager };
};

const types = (events: MemoryEventStore, sessionId: string) => events.listSince(sessionId, 0).map((e) => e.type);

/** 던져진 AgentError의 code. 안 던지면 null. */
const codeOf = (fn: () => unknown): string | null => {
  try {
    fn();
    return null;
  } catch (error) {
    return error instanceof AgentError ? error.code : `not-AgentError: ${String(error)}`;
  }
};

describe("RunManager", () => {
  it("시작하면 run.started, 실행기가 끝나면 run.finished(done)를 남기고 세션 상태를 투영한다", async () => {
    const { events, sessions, manager } = make({
      run: (ctx) => {
        ctx.emit({ type: "assistant.delta", messageId: "m", text: "안녕" });
        ctx.emit({ type: "assistant.done", messageId: "m" });
        return Promise.resolve();
      },
    });
    const session = manager.createSession(undefined);
    const response = manager.start(session.id, "hi", "action");
    expect(response.status).toBe("running");
    expect(sessions.get(session.id)?.lastRunStatus).toBe("running");
    await tick();
    expect(types(events, session.id)).toEqual(["session.renamed", "run.started", "assistant.delta", "assistant.done", "run.finished"]);
    expect(events.listSince(session.id, 0).at(-1)).toMatchObject({ type: "run.finished", status: "done" });
    expect(sessions.get(session.id)).toMatchObject({ lastRunStatus: "done", title: "hi" });
  });

  it("도는 Run이 있으면 RunInProgress", async () => {
    let release: () => void = () => undefined;
    const { manager } = make({ run: () => new Promise<void>((resolve) => (release = resolve)) });
    const session = manager.createSession("t");
    manager.start(session.id, "a", "action");
    expect(codeOf(() => manager.start(session.id, "b", "action"))).toBe("RunInProgress");
    release();
    await tick();
    expect(manager.activeCount).toBe(0);
  });

  it("없는 세션은 SessionNotFound", () => {
    const { manager } = make({ run: () => Promise.resolve() });
    expect(codeOf(() => manager.start("nope", "a", "action"))).toBe("SessionNotFound");
  });

  it("실행기가 던지면 run.error와 run.finished(error)", async () => {
    const { events, manager } = make({ run: () => Promise.reject(new Error("boom")) });
    const session = manager.createSession("t");
    manager.start(session.id, "a", "action");
    await tick();
    expect(types(events, session.id).slice(-2)).toEqual(["run.error", "run.finished"]);
    expect(events.listSince(session.id, 0).at(-1)).toMatchObject({ status: "error" });
  });

  it("입력 요청은 이벤트로 남고, provideInput이 답을 실행기에 전달한다", async () => {
    let answered = "";
    const { events, sessions, manager } = make({
      run: async (ctx: RunContext) => {
        answered = await ctx.requestInput("이름은?");
      },
    });
    const session = manager.createSession("t");
    const { runId } = manager.start(session.id, "a", "action");
    await tick();
    expect(sessions.get(session.id)?.lastRunStatus).toBe("waitingInput");
    const requested = events.listSince(session.id, 0).find((e) => e.type === "input.requested");
    expect(requested).toMatchObject({ prompt: "이름은?" });
    const requestId = requested !== undefined && "requestId" in requested ? requested.requestId : "";

    expect(codeOf(() => manager.provideInput(session.id, runId, "wrong", "x"))).toBe("NotWaitingInput");
    manager.provideInput(session.id, runId, requestId, "준");
    await tick();
    expect(answered).toBe("준");
    expect(types(events, session.id).slice(-2)).toEqual(["input.provided", "run.finished"]);
  });

  it("끊으면 signal이 abort되고 run.finished(cancelled)", async () => {
    const { events, manager } = make({
      run: (ctx) =>
        new Promise<void>((_, reject) => {
          ctx.signal.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    });
    const session = manager.createSession("t");
    const { runId } = manager.start(session.id, "a", "action");
    manager.cancel(session.id, runId);
    await tick();
    expect(events.listSince(session.id, 0).at(-1)).toMatchObject({ type: "run.finished", status: "cancelled" });
    expect(codeOf(() => manager.cancel(session.id, runId))).toBe("RunNotFound");
  });

  it("실행기가 emit한 이벤트에 세션·Run 식별자가 붙는다", async () => {
    const { events, manager } = make({
      run: (ctx) => {
        ctx.emit({ type: "tool.call", callId: "c", toolId: "echo", input: { x: 1 } });
        return Promise.resolve();
      },
    });
    const session = manager.createSession("t");
    const { runId } = manager.start(session.id, "a", "action");
    await tick();
    expect(events.listSince(session.id, 0)[1]).toMatchObject({ type: "tool.call", sessionId: session.id, runId, input: { x: 1 } });
  });

  it("updateSession은 이벤트로 남기고 요약을 갱신한다", () => {
    const { events, manager } = make({ run: () => Promise.resolve() });
    const session = manager.createSession("t");
    manager.updateSession(session.id, { title: "새", archived: true });
    expect(types(events, session.id)).toEqual(["session.renamed", "session.archived"]);
    expect(manager.getSession(session.id)).toMatchObject({ title: "새", archived: true });
  });
});
