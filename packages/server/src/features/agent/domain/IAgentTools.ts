/**
 * 실행기가 모델에게 내주는 툴. 정의(JSON Schema)와 실행이 한 쌍이다.
 *
 * 워크스페이스 파일 조작이 첫 툴 집합인데, 그 구현은 filesystem feature의 것이라 여기서 직접
 * 부를 수 없다(feature끼리 import 금지). 조립부(`app.ts`)가 그쪽 유스케이스를 넘겨 준다.
 */
export type AgentToolDefinition = {
  readonly name: string;
  readonly description: string;
  /** JSON Schema(object). 모델이 이 모양으로 `input`을 만든다. */
  readonly inputSchema: Record<string, unknown>;
};

export type ToolOutcome = { readonly output: unknown; readonly isError: boolean };

export interface IAgentTools {
  readonly definitions: readonly AgentToolDefinition[];
  /** 없는 툴 이름이면 `isError: true`로 답한다 — 던지지 않는다. 모델이 그 결과를 보고 고친다. */
  execute(name: string, input: unknown, signal: AbortSignal): Promise<ToolOutcome>;
}
