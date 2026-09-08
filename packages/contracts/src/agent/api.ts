import { z } from "zod";
import { ErrorBody } from "../common/errors";
import { AgentErrorCode, AgentSession, RunId, RunMode, RunStatus } from "./types";

/** `/api/agent/*` 엔드포인트가 반환하는 에러 바디. */
export const AgentErrorBody = ErrorBody.extend({ code: AgentErrorCode });
export type AgentErrorBody = z.infer<typeof AgentErrorBody>;

/** `GET /api/agent/sessions` */
export const SessionListResponse = z.object({ sessions: z.array(AgentSession) });
export type SessionListResponse = z.infer<typeof SessionListResponse>;

/** `POST /api/agent/sessions` — 제목이 없으면 서버가 첫 입력에서 만든다. */
export const CreateSessionRequest = z.object({ title: z.string().optional() });
export type CreateSessionRequest = z.infer<typeof CreateSessionRequest>;

/** `PATCH /api/agent/sessions/:id` */
export const UpdateSessionRequest = z.object({
  title: z.string().optional(),
  archived: z.boolean().optional(),
});
export type UpdateSessionRequest = z.infer<typeof UpdateSessionRequest>;

export const SessionResponse = z.object({ session: AgentSession });
export type SessionResponse = z.infer<typeof SessionResponse>;

/**
 * `POST /api/agent/sessions/:id/runs` — 입력 하나로 Run을 시작한다. 이미 도는 Run이 있으면
 * `RunInProgress`. 응답은 즉시 온다 — 진행은 이벤트 스트림으로 본다.
 */
export const StartRunRequest = z.object({
  input: z.string().min(1),
  mode: RunMode.default("action"),
});
export type StartRunRequest = z.infer<typeof StartRunRequest>;

export const RunResponse = z.object({ runId: RunId, status: RunStatus });
export type RunResponse = z.infer<typeof RunResponse>;

/** `POST /api/agent/sessions/:id/runs/:runId/input` — `input.requested`에 답한다. */
export const ProvideInputRequest = z.object({
  requestId: z.string().min(1),
  text: z.string(),
});
export type ProvideInputRequest = z.infer<typeof ProvideInputRequest>;

/**
 * `GET /api/agent/sessions/:id/events?since=<seq>` — SSE. `since` 뒤의 이벤트를 먼저 전부 보내고
 * 이어서 새 이벤트를 흘린다. 프레임 하나가 `AgentEvent` 하나다. 하트비트는 빈 데이터가 아니라
 * SSE 주석(`: ping`)으로 보낸다 — 이벤트 스키마를 더럽히지 않기 위해서다.
 */
export const EventsQuery = z.object({
  since: z.coerce.number().int().nonnegative().default(0),
});
export type EventsQuery = z.infer<typeof EventsQuery>;
