import type { AgentErrorCode } from "#contracts";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { AgentError } from "../domain/errors";

/** 에이전트 동작이 던진 것을 HTTP로 옮긴다. `AgentError`가 아니면 `undefined` — 앱 루트가 받는다. */
export const agentErrorResponse = (error: Error, c: Context): Response | undefined => {
  if (!(error instanceof AgentError)) return undefined;
  return c.json({ code: error.code, message: error.message }, statusOf(error.code));
};

function statusOf(code: AgentErrorCode): ContentfulStatusCode {
  switch (code) {
    case "SessionNotFound":
    case "RunNotFound":
      return 404;
    case "RunInProgress":
    case "NotWaitingInput":
      return 409;
    case "Unavailable":
      return 503;
  }
}
