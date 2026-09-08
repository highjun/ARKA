import { describe, expect, it } from "vitest";
import type { RunMode } from "contracts";
import type { RunContext, RunEventInput } from "../domain/IAgentRunner";
import { ScriptedRunner } from "./ScriptedRunner";

const contextOf = (input: string, { mode = "action", answer = "준" }: { mode?: RunMode; answer?: string } = {}) => {
  const emitted: RunEventInput[] = [];
  const prompts: string[] = [];
  const ctx: RunContext = {
    sessionId: "s",
    runId: "r",
    input,
    mode,
    confirmWrites: false,
    history: [],
    signal: new AbortController().signal,
    emit: (event) => emitted.push(event),
    requestInput: (prompt) => {
      prompts.push(prompt);
      return Promise.resolve(answer);
    },
  };
  return { ctx, emitted, prompts };
};

const runner = () => new ScriptedRunner({ chunkMs: 0, newId: () => "id" });

describe("ScriptedRunner", () => {
  it("생각 → 툴 → 답변 순서로 낸다", async () => {
    const { ctx, emitted } = contextOf("안녕 세상");
    await runner().run(ctx);
    expect(emitted.map((e) => e.type)).toEqual([
      "thinking.delta", "thinking.done", "tool.call", "tool.result",
      "assistant.delta", "assistant.delta", "assistant.delta", "assistant.done",
    ]);
    const text = emitted.filter((e) => e.type === "assistant.delta").map((e) => ("text" in e ? e.text : "")).join("");
    expect(text.trim()).toBe("받은 입력: 안녕 세상");
  });

  it("입력에 ?가 있으면 되묻고 답을 반영한다", async () => {
    const { ctx, emitted, prompts } = contextOf("이게 뭐야?");
    await runner().run(ctx);
    expect(prompts).toHaveLength(1);
    const text = emitted.filter((e) => e.type === "assistant.delta").map((e) => ("text" in e ? e.text : "")).join("");
    expect(text).toContain("준님,");
  });

  it("plan 모드는 계획을 적는다", async () => {
    const { ctx, emitted } = contextOf("x", { mode: "plan" });
    await runner().run(ctx);
    expect("text" in (emitted[4] ?? {}) ? (emitted[4] as { text: string }).text : "").toBe("계획: ");
  });

  it("끊기면 던진다", async () => {
    const abort = new AbortController();
    const { ctx } = contextOf("x");
    abort.abort();
    await expect(new ScriptedRunner({ chunkMs: 10 }).run({ ...ctx, signal: abort.signal })).rejects.toThrow(/cancelled/u);
  });
});
