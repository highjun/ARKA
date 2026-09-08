import { z } from "zod";

/**
 * 에이전트 도메인의 형태. → docs/adr/0019-agent-domain.md
 *
 * 식별자는 전부 서버가 만드는 불투명 문자열이다. 클라이언트는 비교와 전달만 한다.
 */

export const SessionId = z.string().min(1);
export type SessionId = z.infer<typeof SessionId>;

export const RunId = z.string().min(1);
export type RunId = z.infer<typeof RunId>;

/**
 * Run의 상태. `waitingInput`은 에이전트가 사용자에게 무언가를 물어 멈춘 상태다.
 * `cancelled`는 사용자가 끊은 것, `error`는 실행기가 실패한 것.
 */
export const RunStatus = z.enum(["queued", "running", "waitingInput", "done", "error", "cancelled"]);
export type RunStatus = z.infer<typeof RunStatus>;

/** 입력 모드. `plan`은 실행 없이 계획만 세운다. */
export const RunMode = z.enum(["action", "plan"]);
export type RunMode = z.infer<typeof RunMode>;

/**
 * 세션 요약 — 목록에 그리는 것. 메시지 본문은 이벤트 로그에 있고 여기 없다.
 *
 * `status`는 마지막 Run의 상태에서 투영된다. Run이 없으면 `null`.
 */
export const AgentSession = z.object({
  id: SessionId,
  title: z.string(),
  /** ms since epoch. */
  createdAt: z.number().int().nonnegative(),
  /** 마지막 이벤트 시각. */
  updatedAt: z.number().int().nonnegative(),
  archived: z.boolean(),
  lastRunStatus: RunStatus.nullable(),
});
export type AgentSession = z.infer<typeof AgentSession>;

/** 에이전트 동작의 실패 종류. 전송 경계에서 HTTP 상태를 이것으로 한 번만 바꾼다. */
export const AgentErrorCode = z.enum([
  "SessionNotFound",
  "RunNotFound",
  /** 세션에 이미 도는 Run이 있다 — 끝나거나 끊길 때까지 새 Run을 받지 않는다. */
  "RunInProgress",
  /** 입력을 기다리는 Run이 없는데 입력이 왔다. */
  "NotWaitingInput",
  "Unavailable",
]);
export type AgentErrorCode = z.infer<typeof AgentErrorCode>;
