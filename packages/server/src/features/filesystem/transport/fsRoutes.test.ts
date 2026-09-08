import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PROTOCOL_VERSION } from "contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsRoutes } from "./fsRoutes";

let root: string;
let app: ReturnType<typeof createFsRoutes>;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "ade-routes-"));
  app = createFsRoutes(root);
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

/** 실제 서버를 띄우지 않고 라우트에 요청을 넣는다. */
async function post(body: unknown): Promise<Response> {
  return app.request("/fs/read", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /fs/read", () => {
  it("파일 내용을 base64로 돌려준다", async () => {
    await fs.writeFile(path.join(root, "a.txt"), "hi");

    const res = await post({ protocolVersion: PROTOCOL_VERSION, uri: "file:///a.txt" });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { content: string; etag: string };
    expect(Buffer.from(body.content, "base64").toString()).toBe("hi");
    expect(body.etag).toBeTruthy();
  });

  it("없는 파일은 404와 NotFound를 준다", async () => {
    const res = await post({ protocolVersion: PROTOCOL_VERSION, uri: "file:///없다.txt" });

    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: "NotFound" });
  });

  it("루트 밖 경로는 403과 NoPermission을 준다", async () => {
    const res = await post({
      protocolVersion: PROTOCOL_VERSION,
      uri: "file:///../etc/passwd",
    });

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: "NoPermission" });
  });

  it("모르는 프로토콜 버전은 426과 VersionMismatch를 준다", async () => {
    const res = await post({ protocolVersion: 999, uri: "file:///a.txt" });

    expect(res.status).toBe(426);
    expect(await res.json()).toMatchObject({ code: "VersionMismatch" });
  });

  it("스키마에 안 맞는 바디는 400과 BadRequest를 준다", async () => {
    const res = await post({ uri: "file:///a.txt" });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "BadRequest" });
  });

  it("URI 형식이 틀리면 400과 BadRequest를 준다", async () => {
    const res = await post({ protocolVersion: PROTOCOL_VERSION, uri: "그냥문자열" });

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "BadRequest" });
  });
});
