import { AgentErrorBody, RunResponse, SessionListResponse, SessionResponse } from "#contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { expectResponse, probeApp, withProtocol } from "../../../responseContract";
import type { RouteProbe } from "../../../responseContract";

/**
 * 에이전트 라우트의 **응답 모양**만 본다. Run이 실제로 무엇을 하는지는 `runtime/RunManager.test.ts`와
 * `infra/ScriptedRunner.test.ts`가 본다. 키가 없으므로 스크립트 실행기가 돈다(→ ADR 0019).
 */
let probe: RouteProbe;
let dispose: () => Promise<void>;

beforeEach(async () => {
  const started = await probeApp();
  probe = started;
  dispose = started.dispose;
});

afterEach(async () => {
  await dispose();
});

const createSession = async (): Promise<string> => {
  const body = await expectResponse(
    probe,
    // 만들기는 201이다 — 계약에는 상태 코드도 들어간다.
    { url: "/api/agent/sessions", init: { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) }, status: 201 },
    SessionResponse,
  );
  return body.session.id;
};

describe("에이전트 라우트의 응답 계약", () => {
  it("빈 목록도 SessionListResponse다", async () => {
    const body = await expectResponse(probe, { url: "/api/agent/sessions" }, SessionListResponse);
    expect(body.sessions).toEqual([]);
  });

  it("세션을 만들면 SessionResponse다 — session의 모양까지 본다", async () => {
    const id = await createSession();
    expect(id).not.toBe("");
  });

  it("만든 세션을 하나로 읽어도 SessionResponse다", async () => {
    const id = await createSession();
    await expectResponse(probe, { url: `/api/agent/sessions/${id}` }, SessionResponse);
  });

  it("Run을 시작하면 RunResponse다 — runId·status가 빠지면 계약 위반이다", async () => {
    const id = await createSession();
    const body = await expectResponse(
      probe,
      { url: `/api/agent/sessions/${id}/runs`, init: { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input: "안녕" }) }, status: 202 },
      RunResponse,
    );
    expect(body.runId).not.toBe("");
  });

  // 오류도 계약이다 — 클라이언트가 `code`로 분기한다.
  it("없는 세션은 404와 AgentErrorBody다", async () => {
    await expectResponse(probe, { url: "/api/agent/sessions/nope", status: 404 }, AgentErrorBody);
  });

  it("이미 도는 Run이 있으면 409와 AgentErrorBody다", async () => {
    const id = await createSession();
    const start = () =>
      probe.app.request(`/api/agent/sessions/${id}/runs`, withProtocol({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input: "hi" }) }));
    await start();
    const second = await start();
    if (second.status === 409) await expectResponse(probe, { url: `/api/agent/sessions/${id}/runs`, init: { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ input: "hi" }) }, status: 409 }, AgentErrorBody);
  });
});
