import { CreateSessionRequest, EventsQuery, ProvideInputRequest, StartRunRequest, UpdateSessionRequest } from "contracts";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { IEventStore } from "../domain/IEventStore";
import type { RunManager } from "../runtime/RunManager";
import { agentErrorResponse } from "./agentErrorHandler";

/** 조용한 SSE 연결을 중간 프록시가 끊지 않게 — 파일 watch와 같은 간격. 주석 프레임이라 스키마 밖이다. */
const HEARTBEAT_MS = 15_000;

/**
 * `/api/agent/*`. 핸들러는 검증하고 런타임을 부르고 응답만 만든다.
 *
 * 이벤트 스트림은 `since` 뒤의 것을 먼저 전부 보내고 이어서 새 이벤트를 흘린다. 구독을 먼저 걸고
 * 그다음 `listSince`를 읽어 그 사이 틈을 없앤다 — 겹치는 것은 `seq`로 거른다.
 */
export const createAgentRoutes = ({ runManager, events }: { runManager: RunManager; events: IEventStore }): Hono => {
  const app = new Hono();

  app.get("/api/agent/sessions", (c) => c.json({ sessions: runManager.listSessions() }));

  app.post("/api/agent/sessions", async (c) => {
    const body = CreateSessionRequest.safeParse(await c.req.json().catch(() => ({})));
    if (!body.success) return c.json({ code: "BadRequest", message: body.error.message }, 400);
    return c.json({ session: runManager.createSession(body.data.title) }, 201);
  });

  app.get("/api/agent/sessions/:id", (c) => c.json({ session: runManager.getSession(c.req.param("id")) }));

  app.patch("/api/agent/sessions/:id", async (c) => {
    const body = UpdateSessionRequest.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ code: "BadRequest", message: body.error.message }, 400);
    return c.json({ session: runManager.updateSession(c.req.param("id"), body.data) });
  });

  app.post("/api/agent/sessions/:id/runs", async (c) => {
    const body = StartRunRequest.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ code: "BadRequest", message: body.error.message }, 400);
    return c.json(runManager.start(c.req.param("id"), body.data.input, body.data.mode), 202);
  });

  app.post("/api/agent/sessions/:id/runs/:runId/input", async (c) => {
    const body = ProvideInputRequest.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ code: "BadRequest", message: body.error.message }, 400);
    runManager.provideInput(c.req.param("id"), c.req.param("runId"), body.data.requestId, body.data.text);
    return c.body(null, 204);
  });

  app.delete("/api/agent/sessions/:id/runs/:runId", (c) => {
    runManager.cancel(c.req.param("id"), c.req.param("runId"));
    return c.body(null, 204);
  });

  app.get("/api/agent/sessions/:id/events", (c) => {
    const sessionId = c.req.param("id");
    runManager.getSession(sessionId);
    const query = EventsQuery.safeParse({ since: c.req.query("since") ?? "0" });
    if (!query.success) return c.json({ code: "BadRequest", message: query.error.message }, 400);
    const since = query.data.since;

    return streamSSE(c, async (stream) => {
      let last = since;
      const send = (event: { seq: number }): void => {
        if (event.seq <= last) return;
        last = event.seq;
        void stream.writeSSE({ id: String(event.seq), data: JSON.stringify(event) });
      };
      const unsubscribe = events.subscribe(sessionId, send);
      for (const event of events.listSince(sessionId, since)) send(event);
      const heartbeat = setInterval(() => void stream.write(": ping\n\n"), HEARTBEAT_MS);

      stream.onAbort(() => {
        clearInterval(heartbeat);
        unsubscribe();
      });
      await new Promise<void>((resolve) => stream.onAbort(resolve));
    });
  });

  app.onError((error, c) => {
    const response = agentErrorResponse(error, c);
    if (response === undefined) throw error;
    return response;
  });

  return app;
};
