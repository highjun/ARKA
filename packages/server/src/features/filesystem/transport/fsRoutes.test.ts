import { DirectoryListing, FileContent, FileErrorBody, PathResult } from "#contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { expectResponse, probeApp, withProtocol } from "../../../responseContract";
import type { RouteProbe } from "../../../responseContract";

/**
 * 파일 라우트의 **응답이 계약을 지키는지** 본다. 클라이언트를 모른다 — 어댑터를 붙이지 않고
 * 스키마에만 대고 잰다(→ `responseContract.ts`).
 *
 * 동작이 맞는지(옮기면 옛 경로가 사라지는가 등)는 `infra/fileOperations.test.ts`가 본다.
 * 여기는 **모양**만 본다.
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

describe("파일 라우트의 응답 계약", () => {
  it("빈 루트 목록이 DirectoryListing이다", async () => {
    const body = await expectResponse(probe, { url: "/api/files?path=" }, DirectoryListing);
    expect(body).toEqual({ path: "", parent: null, entries: [] });
  });

  it("만들기가 PathResult를 돌려준다", async () => {
    await expectResponse(
      probe,
      { url: "/api/files", init: { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: "a.txt", type: "file" }) } },
      PathResult,
    );
  });

  it("항목이 있는 목록도 DirectoryListing이다 — entries의 모양까지 본다", async () => {
    await probe.app.request("/api/files", withProtocol({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: "dir", type: "dir" }) }));
    const body = await expectResponse(probe, { url: "/api/files?path=" }, DirectoryListing);
    expect(body.entries).toHaveLength(1);
  });

  it("읽기가 FileContent다 — encoding·truncated가 빠지면 계약 위반이다", async () => {
    await probe.app.request("/api/files", withProtocol({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: "a.txt", type: "file" }) }));
    const body = await expectResponse(probe, { url: "/api/files/content?path=a.txt" }, FileContent);
    expect(body.encoding).toBe("utf8");
  });

  it("쓰기가 PathResult다", async () => {
    await probe.app.request("/api/files", withProtocol({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: "a.txt", type: "file" }) }));
    await expectResponse(
      probe,
      { url: "/api/files/content", init: { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: "a.txt", content: "A" }) } },
      PathResult,
    );
  });

  it("옮기기가 PathResult다", async () => {
    await probe.app.request("/api/files", withProtocol({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: "a.txt", type: "file" }) }));
    await expectResponse(
      probe,
      { url: "/api/files/move", init: { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ from: "a.txt", to: "b.txt" }) } },
      PathResult,
    );
  });

  it("지우기가 PathResult다", async () => {
    await probe.app.request("/api/files", withProtocol({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path: "a.txt", type: "file" }) }));
    await expectResponse(probe, { url: "/api/files?path=a.txt", init: { method: "DELETE" } }, PathResult);
  });

  // 오류도 계약이다 — 클라이언트가 `code`로 분기한다.
  it("없는 파일을 읽으면 404와 FileErrorBody다", async () => {
    await expectResponse(probe, { url: "/api/files/content?path=nope.txt", status: 404 }, FileErrorBody);
  });

  // 루트 밖은 `NotFound`로 답한다 — 밖에 무엇이 있는지 알려주지 않는다.
  it("루트 밖 경로는 거부하고 FileErrorBody다", async () => {
    const body = await expectResponse(probe, { url: "/api/files?path=..", status: 404 }, FileErrorBody);
    expect(body.code).toBe("NotFound");
  });
});
