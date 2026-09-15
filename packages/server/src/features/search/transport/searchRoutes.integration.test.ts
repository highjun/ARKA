import { SearchResponse } from "#contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { expectResponse, probeApp, withProtocol } from "../../../responseContract";
import type { RouteProbe } from "../../../responseContract";

/** 검색 라우트의 **응답 모양**만 본다. 찾기 자체는 `infra/searchFiles.test.ts`가 본다. */
let probe: RouteProbe;
let dispose: () => Promise<void>;

const seed = async (path: string, content: string): Promise<void> => {
  await probe.app.request(
    "/api/files",
    withProtocol({
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path, type: "file" }),
    }),
  );
  await probe.app.request(
    "/api/files/content",
    withProtocol({
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path, content }),
    }),
  );
};

describe("검색 라우트의 응답 계약", () => {
  beforeEach(async () => {
    const started = await probeApp();
    probe = started;
    dispose = started.dispose;
  });

  afterEach(async () => {
    await dispose();
  });

  it("결과가 없어도 SearchResponse다 — matches가 빠지면 계약 위반이다", async () => {
    const body = await expectResponse(probe, { url: "/api/search?query=nope" }, SearchResponse);
    expect(body.matches).toEqual([]);
  });

  it("결과가 있으면 match의 line·column·preview까지 계약대로다", async () => {
    await seed("a.ts", "const hello = 1;");
    const body = await expectResponse(probe, { url: "/api/search?query=hello" }, SearchResponse);
    expect(body.matches[0]?.line).toBe(1);
  });
});
