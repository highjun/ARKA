import { GitStatusResponse } from "#contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { expectResponse, probeApp } from "../../../responseContract";
import type { RouteProbe } from "../../../responseContract";

/**
 * git 라우트의 **응답 모양**만 본다. 워크스페이스가 저장소가 아닌 경우까지 계약이다 —
 * `repository: false`에 나머지가 비어 있어야 한다.
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

describe("git 라우트의 응답 계약", () => {
  it("저장소가 아니어도 GitStatusResponse다", async () => {
    const body = await expectResponse(probe, { url: "/api/git/status" }, GitStatusResponse);
    expect(body).toEqual({ repository: false, branch: null, files: [] });
  });
});
