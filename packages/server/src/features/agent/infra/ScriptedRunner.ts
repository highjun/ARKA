import type { IAgentRunner, RunContext } from "../domain/IAgentRunner";

/** 스트리밍 조각 사이의 간격. 0이면 테스트처럼 즉시 흐른다. */
const DEFAULT_CHUNK_MS = 30;

/**
 * API 키 없이 도는 실행기 — 계약 테스트·E2E·스토리의 기준이다.
 *
 * 하는 일은 정해져 있다: 생각 한 블록 → `echo` 툴 호출 → 입력을 되풀이하는 답변을 단어 단위로 스트리밍.
 * 입력에 `?`가 있으면 답하기 전에 사용자에게 되묻는다 — 입력 요청 경로를 화면에서 확인하기 위해서다.
 * `plan` 모드는 실행 대신 계획을 적는다.
 */
export class ScriptedRunner implements IAgentRunner {
  readonly #chunkMs: number;
  readonly #newId: () => string;

  /** `chunkMs`를 0으로 주면 기다리지 않는다 — 테스트가 그렇게 쓴다. */
  constructor({
    chunkMs = DEFAULT_CHUNK_MS,
    newId = () => crypto.randomUUID(),
  }: { chunkMs?: number; newId?: () => string } = {}) {
    this.#chunkMs = chunkMs;
    this.#newId = newId;
  }

  /** 정해진 순서로 이벤트를 흘린다. 모델을 부르지 않으므로 API 키 없이도 화면이 돈다. */
  async run(ctx: RunContext): Promise<void> {
    const thinking = this.#newId();
    ctx.emit({ type: "thinking.delta", blockId: thinking, text: `입력을 읽는다: "${ctx.input}"` });
    await this.#pause(ctx.signal);
    ctx.emit({ type: "thinking.done", blockId: thinking });

    const call = this.#newId();
    ctx.emit({ type: "tool.call", callId: call, toolId: "echo", input: { text: ctx.input } });
    await this.#pause(ctx.signal);
    ctx.emit({ type: "tool.result", callId: call, output: { text: ctx.input }, isError: false });

    let name = "";
    if (ctx.input.includes("?")) {
      name = await ctx.requestInput("답하기 전에 — 뭐라고 부를까요?");
    }

    const message = this.#newId();
    const prefix = ctx.mode === "plan" ? "계획:" : "받은 입력:";
    const words = [prefix, ...(name === "" ? [] : [`${name}님,`]), ...ctx.input.split(/\s+/u)];
    for (const word of words) {
      await this.#pause(ctx.signal);
      ctx.emit({ type: "assistant.delta", messageId: message, text: `${word} ` });
    }
    ctx.emit({ type: "assistant.done", messageId: message });
  }

  #pause(signal: AbortSignal): Promise<void> {
    if (signal.aborted) throw new Error("run cancelled");
    if (this.#chunkMs === 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, this.#chunkMs);
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(new Error("run cancelled"));
        },
        { once: true },
      );
    });
  }
}
