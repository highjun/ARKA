import type { AgentEvent, AgentEventInput, RunId, RunMode, SessionId } from "contracts";

/** Run 안에서 실행기가 낼 수 있는 이벤트 — 세션·Run 식별자는 런타임이 붙이므로 뺀 모양이다. */
export type RunEventInput = Extract<AgentEventInput, { runId: string }> extends infer E
  ? E extends { type: "run.started" | "run.finished" }
    ? never
    : E extends object
      ? Omit<E, "sessionId" | "runId">
      : never
  : never;

/** 실행기가 Run 하나를 굴리며 쓰는 것. 런타임(`RunManager`)이 만들어 넘긴다. */
export interface RunContext {
  readonly sessionId: SessionId;
  readonly runId: RunId;
  readonly input: string;
  readonly mode: RunMode;
  /** 파일을 바꾸는 툴 앞에서 `requestInput`으로 허락을 구해야 한다. */
  readonly confirmWrites: boolean;
  /** 이 Run이 시작되기 전까지의 세션 이벤트 전부 — 대화 맥락이다. */
  readonly history: readonly AgentEvent[];
  /** 사용자가 끊으면 abort된다. 실행기는 이것을 LLM 요청·툴 프로세스에 전달해야 한다. */
  readonly signal: AbortSignal;
  /** 이벤트를 로그에 붙인다. 동기다. */
  emit(event: RunEventInput): void;
  /**
   * 사용자에게 묻고 답을 기다린다. `input.requested`/`input.provided` 이벤트는 런타임이 낸다.
   * @throws Error 기다리는 동안 Run이 끊기면 거부된다.
   */
  requestInput(prompt: string): Promise<string>;
}

/**
 * Run을 실제로 굴리는 것. LLM 제공자·툴 집합은 구현의 사정이다(→ ADR 0019).
 *
 * `run`이 정상 반환하면 `done`, 던지면 `error`, `signal`이 abort된 채 끝나면 `cancelled`로 런타임이
 * `run.finished`를 낸다. 실행기는 `run.started`/`run.finished`를 내지 않는다.
 */
export interface IAgentRunner {
  run(context: RunContext): Promise<void>;
}
