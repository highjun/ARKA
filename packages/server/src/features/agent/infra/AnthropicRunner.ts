import type Anthropic from "@anthropic-ai/sdk";
import type { AgentEvent } from "#contracts";
import type { IAgentRunner, RunContext } from "../domain/IAgentRunner";
import type { IAgentTools } from "../domain/IAgentTools";
import { ASK_USER_TOOL, isApproval, WRITING_TOOLS } from "./workspaceTools";

/** 실행기가 클라이언트에게 바라는 것 — 테스트가 가짜 스트림을 꽂을 수 있게 좁힌다. */
export type MessagesClient = {
  messages: {
    stream(params: Anthropic.MessageStreamParams, options?: { signal?: AbortSignal }): AsyncIterable<Anthropic.MessageStreamEvent> & {
      finalMessage(): Promise<Anthropic.Message>;
    };
  };
};

/** 무한 루프 방어 — 모델이 툴만 계속 부르면 여기서 끊는다. */
const MAX_TURNS = 40;

const SYSTEM_PROMPT = `너는 ADE(Agent Development Environment) 안에서 사용자의 워크스페이스를 다루는 에이전트다.
파일을 읽거나 바꿀 때는 툴을 쓴다. 경로는 워크스페이스 루트 기준 상대 경로다.
모호하면 추측하지 말고 ask_user로 묻는다. 답은 한국어로, 간결하게.`;

/**
 * Anthropic Messages API로 Run을 굴리는 실행기. 스트리밍 + 수동 툴 루프.
 *
 * 이벤트 대응: thinking 블록 → `thinking.delta/done`, text 블록 → `assistant.delta/done`, tool_use →
 * `tool.call` 뒤 실행 결과를 `tool.result`. `ask_user` 툴은 실행하지 않고 `ctx.requestInput`으로
 * 사용자에게 넘긴다(→ `input.requested`).
 *
 * 세션 이력은 사용자/어시스턴트 텍스트만 다시 싣는다 — 옛 Run의 생각·툴 호출은 맥락으로 필요 없고
 * 토큰만 먹는다.
 */
export class AnthropicRunner implements IAgentRunner {
  readonly #client: MessagesClient;
  readonly #model: string;
  readonly #tools: IAgentTools;
  readonly #newId: () => string;

  constructor({ client, model, tools, newId = () => crypto.randomUUID() }: { client: MessagesClient; model: string; tools: IAgentTools; newId?: () => string }) {
    this.#client = client;
    this.#model = model;
    this.#tools = tools;
    this.#newId = newId;
  }

  async run(ctx: RunContext): Promise<void> {
    const messages: Anthropic.MessageParam[] = [...historyToMessages(ctx.history), { role: "user", content: ctx.input }];
    const tools: Anthropic.Tool[] = this.#tools.definitions.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
    }));
    const system = ctx.mode === "plan" ? `${SYSTEM_PROMPT}\n지금은 계획 모드다 — 파일을 바꾸지 말고 무엇을 어떻게 할지 단계로 적어라.` : SYSTEM_PROMPT;

    for (let turn = 0; turn < MAX_TURNS; turn += 1) {
      if (ctx.signal.aborted) throw new Error("run cancelled");
      const stream = this.#client.messages.stream(
        {
          model: this.#model,
          max_tokens: 64_000,
          system,
          tools,
          messages,
          thinking: { type: "adaptive", display: "summarized" },
        },
        { signal: ctx.signal },
      );

      const blockIds = new Map<number, string>();
      for await (const event of stream) {
        if (event.type === "content_block_start") {
          const id = this.#newId();
          blockIds.set(event.index, id);
          if (event.content_block.type === "thinking") ctx.emit({ type: "thinking.delta", blockId: id, text: "" });
          if (event.content_block.type === "text") ctx.emit({ type: "assistant.delta", messageId: id, text: "" });
        } else if (event.type === "content_block_delta") {
          const id = blockIds.get(event.index) ?? this.#newId();
          if (event.delta.type === "thinking_delta") ctx.emit({ type: "thinking.delta", blockId: id, text: event.delta.thinking });
          if (event.delta.type === "text_delta") ctx.emit({ type: "assistant.delta", messageId: id, text: event.delta.text });
        }
      }
      const message = await stream.finalMessage();
      for (const [index, block] of message.content.entries()) {
        const id = blockIds.get(index);
        if (id === undefined) continue;
        if (block.type === "thinking") ctx.emit({ type: "thinking.done", blockId: id });
        if (block.type === "text") ctx.emit({ type: "assistant.done", messageId: id });
      }

      if (message.stop_reason === "refusal") {
        throw new Error(`모델이 요청을 거절했다${message.stop_details?.explanation ? `: ${message.stop_details.explanation}` : ""}`);
      }
      if (message.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: message.content });
        continue;
      }
      if (message.stop_reason !== "tool_use") return;

      const toolUses = message.content.filter((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
      messages.push({ role: "assistant", content: message.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const use of toolUses) {
        ctx.emit({ type: "tool.call", callId: use.id, toolId: use.name, input: use.input });
        const outcome = await this.#execute(ctx, use);
        ctx.emit({ type: "tool.result", callId: use.id, output: outcome.output, isError: outcome.isError });
        results.push({ type: "tool_result", tool_use_id: use.id, content: JSON.stringify(outcome.output), is_error: outcome.isError });
      }
      // 병렬 호출의 결과는 한 user 메시지에 전부 담는다 — 나눠 보내면 모델이 병렬 호출을 그만둔다.
      messages.push({ role: "user", content: results });
    }
    throw new Error(`툴 호출이 ${String(MAX_TURNS)}번을 넘었다 — Run을 끊는다.`);
  }

  async #execute(ctx: RunContext, use: Anthropic.ToolUseBlock): Promise<{ output: unknown; isError: boolean }> {
    if (use.name === ASK_USER_TOOL) {
      const question = (use.input as { question?: unknown }).question;
      const answer = await ctx.requestInput(typeof question === "string" ? question : "계속하려면 답이 필요하다.");
      return { output: { answer }, isError: false };
    }
    if (ctx.confirmWrites && WRITING_TOOLS.has(use.name)) {
      const path = (use.input as { path?: unknown }).path;
      const answer = await ctx.requestInput(`파일을 바꾸려 한다: ${use.name} ${typeof path === "string" ? path : ""} — 허용하려면 '예'라고 답하세요.`);
      if (!isApproval(answer)) return { output: { error: `사용자가 거부했다: ${answer}` }, isError: true };
    }
    return this.#tools.execute(use.name, use.input, ctx.signal);
  }
}

/** 옛 이벤트를 대화 이력으로. 사용자 입력과 완성된 어시스턴트 답만 싣는다. */
export const historyToMessages = (history: readonly AgentEvent[]): Anthropic.MessageParam[] => {
  const messages: Anthropic.MessageParam[] = [];
  const assistant = new Map<string, string>();
  const push = (role: "user" | "assistant", text: string): void => {
    if (text.trim() === "") return;
    const last = messages.at(-1);
    // 같은 역할이 이어지면 합친다 — API는 허용하지만 이력이 깔끔하다.
    if (last !== undefined && last.role === role && typeof last.content === "string") {
      last.content = `${last.content}\n\n${text}`;
      return;
    }
    messages.push({ role, content: text });
  };
  for (const event of history) {
    switch (event.type) {
      case "run.started":
        push("user", event.input);
        break;
      case "input.provided":
        push("user", event.text);
        break;
      case "assistant.delta":
        assistant.set(event.messageId, (assistant.get(event.messageId) ?? "") + event.text);
        break;
      case "assistant.done":
        push("assistant", assistant.get(event.messageId) ?? "");
        assistant.delete(event.messageId);
        break;
      default:
        break;
    }
  }
  // 첫 메시지는 user여야 한다 — 이력이 어시스턴트로 시작하면 잘라 낸다.
  while (messages[0]?.role === "assistant") messages.shift();
  return messages;
};
