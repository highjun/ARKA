import type { AgentErrorCode } from "#contracts";

/** 에이전트 동작의 실패. `code`는 그대로 클라이언트에 전달되므로 contracts의 `AgentErrorCode`만 담는다. */
export class AgentError extends Error {
  readonly code: AgentErrorCode;

  constructor(code: AgentErrorCode, message: string) {
    super(message);
    this.name = "AgentError";
    this.code = code;
  }
}
