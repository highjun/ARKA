import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import type { RunContext, RunEventInput } from "../domain/IAgentRunner";
import type { IAgentTools } from "../domain/IAgentTools";
import { AnthropicRunner, historyToMessages, type MessagesClient } from "./AnthropicRunner";

/** 한 요청의 답을 미리 적어 둔 가짜 스트림. 실제 SDK의 이벤트 모양을 그대로 흉내 낸다. */
type Scripted = { readonly events: Anthropic.MessageStreamEvent[]; readonly final: Anthropic.Message };

const message = (content: Anthropic.ContentBlock[], stop_reason: Anthropic.Message["stop_reason"]): Anthropic.Message =>
  ({ id: "m", type: "message", role: "assistant", model: "test", content, stop_reason, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } }) as unknown as Anthropic.Message;

const textTurn = (text: string, stop: Anthropic.Message["stop_reason"] = "end_turn"): Scripted => ({
  events: [
    { type: "content_block_start", index: 0, content_block: { type: "text", text: "", citations: null } },
    { type: "content_block_delta", index: 0, delta: { type: "text_delta", text } },
  ] as unknown as Anthropic.MessageStreamEvent[],
  final: message([{ type: "text", text, citations: null }], stop),
});

const toolTurn = (name: string, input: Record<string, unknown>): Scripted => ({
  events: [
    { type: "content_block_start", index: 0, content_block: { type: "thinking", thinking: "", signature: "" } },
    { type: "content_block_delta", index: 0, delta: { type: "thinking_delta", thinking: "파일을 본다" } },
    { type: "content_block_start", index: 1, content_block: { type: "tool_use", id: "tu1", name, input: {} } },
  ] as unknown as Anthropic.MessageStreamEvent[],
  final: message(
    [
      { type: "thinking", thinking: "파일을 본다", signature: "" },
      { type: "tool_use", id: "tu1", name, input, caller: { type: "direct" } },
    ],
    "tool_use",
  ),
});

const clientOf = (turns: Scripted[]): MessagesClient & { requests: Anthropic.MessageStreamParams[] } => {
  const requests: Anthropic.MessageStreamParams[] = [];
  return {
    requests,
    messages: {
      stream: (params) => {
        requests.push(params);
        const turn = turns.shift();
        if (turn === undefined) throw new Error("no more scripted turns");
        return {
          [Symbol.asyncIterator]: async function* () {
            for (const event of turn.events) yield event;
          },
          finalMessage: () => Promise.resolve(turn.final),
        };
      },
    },
  };
};

const tools: IAgentTools = {
  definitions: [{ name: "read_file", description: "read", inputSchema: { type: "object" } }, { name: "ask_user", description: "ask", inputSchema: { type: "object" } }],
  execute: (name, input) => Promise.resolve(name === "read_file" ? { output: { content: `내용 of ${String((input as { path: string }).path)}` }, isError: false } : { output: { error: "unknown" }, isError: true }),
};

const contextOf = (input: string, answer = "예") => {
  const emitted: RunEventInput[] = [];
  const prompts: string[] = [];
  const ctx: RunContext = {
    sessionId: "s",
    runId: "r",
    input,
    mode: "action",
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

describe("AnthropicRunner", () => {
  it("텍스트 답변을 스트리밍 이벤트로 옮긴다", async () => {
    const client = clientOf([textTurn("안녕하세요")]);
    const { ctx, emitted } = contextOf("안녕");
    await new AnthropicRunner({ client, model: "test", tools, newId: () => "id" }).run(ctx);
    expect(emitted.map((e) => e.type)).toEqual(["assistant.delta", "assistant.delta", "assistant.done"]);
    expect(client.requests[0]).toMatchObject({ model: "test", thinking: { type: "adaptive" }, messages: [{ role: "user", content: "안녕" }] });
    expect(client.requests[0]?.tools?.map((t) => ("name" in t ? t.name : ""))).toEqual(["read_file", "ask_user"]);
  });

  it("툴을 부르면 실행해 결과를 돌려주고 다음 요청에 싣는다", async () => {
    const client = clientOf([toolTurn("read_file", { path: "a.md" }), textTurn("a.md를 읽었다")]);
    const { ctx, emitted } = contextOf("a.md 읽어");
    await new AnthropicRunner({ client, model: "test", tools }).run(ctx);
    const types = emitted.map((e) => e.type);
    expect(types).toEqual(["thinking.delta", "thinking.delta", "thinking.done", "tool.call", "tool.result", "assistant.delta", "assistant.delta", "assistant.done"]);
    expect(emitted.find((e) => e.type === "tool.result")).toMatchObject({ output: { content: "내용 of a.md" }, isError: false });
    const second = client.requests[1]?.messages ?? [];
    expect(second).toHaveLength(3);
    expect(second[2]).toMatchObject({ role: "user", content: [{ type: "tool_result", tool_use_id: "tu1", is_error: false }] });
  });

  it("ask_user 툴은 사용자에게 묻고 답을 툴 결과로 돌려준다", async () => {
    const client = clientOf([toolTurn("ask_user", { question: "어느 파일?" }), textTurn("알겠다")]);
    const { ctx, emitted, prompts } = contextOf("정리해", "b.md");
    await new AnthropicRunner({ client, model: "test", tools }).run(ctx);
    expect(prompts).toEqual(["어느 파일?"]);
    expect(emitted.find((e) => e.type === "tool.result")).toMatchObject({ output: { answer: "b.md" } });
  });

  it("거절되면 던진다 — 런타임이 run.error로 남긴다", async () => {
    const client = clientOf([textTurn("", "refusal")]);
    const { ctx } = contextOf("x");
    await expect(new AnthropicRunner({ client, model: "test", tools }).run(ctx)).rejects.toThrow(/거절/u);
  });

  it("plan 모드는 시스템 프롬프트에 계획 지시를 더한다", async () => {
    const client = clientOf([textTurn("계획")]);
    const { ctx } = contextOf("x");
    await new AnthropicRunner({ client, model: "test", tools }).run({ ...ctx, mode: "plan" });
    expect(String(client.requests[0]?.system)).toContain("계획 모드");
  });
});

describe("historyToMessages", () => {
  it("사용자 입력과 완성된 답만 이력으로 싣고 같은 역할은 합친다", () => {
    const head = { sessionId: "s", runId: "r", at: 0 };
    const messages = historyToMessages([
      { ...head, seq: 1, type: "run.started", mode: "action", input: "첫" },
      { ...head, seq: 2, type: "thinking.delta", blockId: "b", text: "생각" },
      { ...head, seq: 3, type: "assistant.delta", messageId: "m", text: "안" },
      { ...head, seq: 4, type: "assistant.delta", messageId: "m", text: "녕" },
      { ...head, seq: 5, type: "assistant.done", messageId: "m" },
      { ...head, seq: 6, type: "input.requested", requestId: "q", prompt: "?" },
      { ...head, seq: 7, type: "input.provided", requestId: "q", text: "답" },
    ]);
    expect(messages).toEqual([
      { role: "user", content: "첫" },
      { role: "assistant", content: "안녕" },
      { role: "user", content: "답" },
    ]);
  });
});
