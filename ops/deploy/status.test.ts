import { describe, expect, it } from "vitest";
import { formatStatus, status } from "./status.ts";
import { execResult, makeFakeFs, makeFakePorts, routeExec } from "./testFakes.ts";

const MANIFEST = JSON.stringify({
  sourceFile: "/repo/x.ts", name: "ade", hostname: "arka.sangjun.dev",
  tunnelId: "a35b3f82-9881-48a1-b00e-9636c6a4801c", image: "ade:2026-09-11",
  generatedAt: "2026-09-11T00:00:00.000Z",
});

const inspected = (over: Record<string, unknown> = {}): string =>
  JSON.stringify([{
    Name: "/ade-app",
    Mounts: [{ Source: "/live" }],
    State: { Status: "running", Health: { Status: "healthy" } },
    Config: { Labels: { "com.docker.compose.project": "ade", "com.docker.compose.project.config_files": "/state/ade/compose.yml" } },
    ...over,
  }]);

const ports = (docker: string, code = 0, extra: Record<string, string> = {}) =>
  makeFakePorts({
    fs: makeFakeFs({ "/state/ade/manifest.json": MANIFEST, "/live": "x", ...extra }),
    exec: routeExec([], { "docker inspect": () => execResult({ stdout: docker, code }) }),
  });

describe("status는 아무것도 바꾸지 않는다", () => {
  it("manifest와 컨테이너 상태를 읽는다", async () => {
    const state = await status("ade", "/state", ports(inspected()));
    expect(state.manifest?.hostname).toBe("arka.sangjun.dev");
    expect(state.containers["ade-app"]).toBe("healthy");
  });

  it("healthcheck가 없으면 State.Status로 떨어진다", async () => {
    const state = await status("ade", "/state", ports(inspected({ State: { Status: "running" } })));
    expect(state.containers["ade-app"]).toBe("running");
  });

  it("컨테이너가 없으면 빈 목록이다 — 배포한 적 없는 이름이다", async () => {
    const state = await status("ade", "/state", ports("", 1));
    expect(state.containers).toEqual({});
  });

  it("manifest가 없으면 undefined다", async () => {
    const p = makeFakePorts({ fs: makeFakeFs(), exec: routeExec([], { "docker inspect": () => execResult({ code: 1 }) }) });
    expect((await status("ade", "/state", p)).manifest).toBeUndefined();
  });
});

describe("배포하지 않고도 유령 마운트를 묻는다", () => {
  it("없어진 마운트를 잡는다", async () => {
    const state = await status("ade", "/state", ports(inspected({ Mounts: [{ Source: "/사라진곳" }] })));
    expect(state.violations[0]).toMatchObject({ kind: "ghost-mount" });
  });

  it("멀쩡하면 비어 있다", async () => {
    const state = await status("ade", "/state", ports(inspected()));
    expect(state.violations).toEqual([]);
  });
});

describe("사람이 읽는 모양", () => {
  it("호스트·터널·이미지를 한 줄에 담는다", async () => {
    const text = formatStatus(await status("ade", "/state", ports(inspected())));
    expect(text).toContain("arka.sangjun.dev");
    expect(text).toContain("ade:2026-09-11");
  });

  it("manifest가 없으면 그렇다고 말한다 — 빈 줄로 넘기지 않는다", async () => {
    const p = makeFakePorts({ fs: makeFakeFs(), exec: routeExec([], { "docker inspect": () => execResult({ code: 1 }) }) });
    expect(formatStatus(await status("ade", "/state", p))).toContain("manifest 없음");
  });

  it("위반은 경고 표시와 함께 나온다", async () => {
    const text = formatStatus(await status("ade", "/state", ports(inspected({ Mounts: [{ Source: "/사라진곳" }] }))));
    expect(text).toContain("⚠");
  });
});
