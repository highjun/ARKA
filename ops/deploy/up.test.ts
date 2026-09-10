import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseEnvFile, up } from "./up.ts";
import { DeploySpec } from "./spec.ts";
import { execResult, makeFakeFs, makeFakePorts, routeExec } from "./testFakes.ts";
import type { Ports } from "./ports.ts";
import type { UpInput } from "./up.ts";

/** 락만 실제 디스크를 쓴다 — `O_EXCL`이 그 모듈의 전부라 가짜로는 검증할 것이 없다. */
let stateDir: string;
beforeEach(() => {
  stateDir = mkdtempSync(path.join(tmpdir(), "ade-up-"));
});
afterEach(() => {
  rmSync(stateDir, { recursive: true, force: true });
});

const TUNNEL = JSON.stringify([{ id: "a35b3f82", name: "ade", connections: [] }]);

const input = (over: Partial<UpInput> = {}): UpInput => ({
  spec: DeploySpec.parse({
    name: "ade", hostname: "arka.sangjun.dev", image: "ade:latest", port: 3000,
    healthPath: "/api/health", accessEmails: ["a@b.co"],
  }),
  sourceFile: "/repo/ops/deploy/ade.deploy.ts",
  stateDir,
  credentialsDir: "/secure",
  zone: "sangjun.dev",
  token: "tok",
  uid: 1000,
  gid: 1000,
  ...over,
});

/** 터널이 이미 있고 컨테이너가 healthy인 평범한 상황. */
const happy = (calls: string[][], over: Partial<Ports> = {}): Ports =>
  makeFakePorts({
    fs: makeFakeFs({ "/secure/a35b3f82.json": "{}" }),
    exec: routeExec(calls, {
      "cloudflared tunnel list": () => execResult({ stdout: TUNNEL }),
      "docker inspect -f": () => execResult({ stdout: "healthy\n" }),
      "docker inspect": () => execResult({ code: 1 }),
    }),
    fetch: vi.fn<Ports["fetch"]>()
      .mockResolvedValueOnce({ status: 200, json: async () => Promise.resolve({ success: true, errors: [], result: [{ id: "zone-1" }] }) } as unknown as Response)
      .mockResolvedValueOnce({ status: 200, json: async () => Promise.resolve({ success: true, errors: [], result: [] }) } as unknown as Response)
      .mockResolvedValue({ status: 200, json: async () => Promise.resolve({ success: true, errors: [], result: { id: "app-1" } }) } as unknown as Response),
    ...over,
  });

describe("순서 — DNS를 연 바로 다음에 Access를 붙인다", () => {
  it("문을 만들고 곧바로 잠근다. 그 사이가 무인증으로 열려 있는 유일한 창이다", async () => {
    const calls: string[][] = [];
    const ports = happy(calls);
    await up(input(), ports);
    const dns = calls.findIndex((c) => c.join(" ").includes("route dns"));
    const compose = calls.findIndex((c) => c.includes("compose"));
    expect(dns).toBeGreaterThanOrEqual(0);
    // Access는 fetch로 가므로 exec 순서에는 없다 — DNS가 compose보다 먼저인 것을 본다.
    expect(dns).toBeLessThan(compose);
  });

  it("DNS를 덮어쓰지 않는다 — 다른 터널이 그 이름을 쓰고 있으면 서야 한다", async () => {
    const calls: string[][] = [];
    await up(input(), happy(calls));
    expect(calls.find((c) => c.join(" ").includes("route dns"))).not.toContain("--overwrite-dns");
  });

  it("compose up에 서비스 이름 app을 붙인다 — 터널이 불필요하게 재연결하지 않게", async () => {
    const calls: string[][] = [];
    await up(input(), happy(calls));
    const composeCall = calls.find((c) => c.includes("compose"));
    expect(composeCall?.at(-1)).toBe("app");
    expect(composeCall).toContain("--force-recreate");
  });
});

describe("되돌리기 어려운 단계 전에 선다", () => {
  it("자격증명이 없으면 뜨기 전에 던진다", async () => {
    const calls: string[][] = [];
    const ports = happy(calls, { fs: makeFakeFs() });
    await expect(up(input(), ports)).rejects.toThrow("자격증명이 없습니다");
    expect(calls.some((c) => c.includes("compose"))).toBe(false);
  });

  it("마운트 소스가 없으면 던진다 — docker가 root 소유로 만들기 전에", async () => {
    const spec = DeploySpec.parse({
      name: "ade", hostname: "arka.sangjun.dev", image: "i", port: 3000,
      accessEmails: ["a@b.co"], mounts: [{ source: "/없는곳", target: "/workspace" }],
    });
    await expect(up(input({ spec }), happy([]))).rejects.toThrow("/없는곳");
  });

  it("유령 마운트가 있으면 compose up을 부르지 않는다", async () => {
    const calls: string[][] = [];
    const ghost = JSON.stringify([{ Name: "/ade-app", Mounts: [{ Source: "/사라진곳" }] }]);
    const ports = happy(calls, {
      fs: makeFakeFs({ "/secure/a35b3f82.json": "{}" }),
      exec: routeExec(calls, {
        "cloudflared tunnel list": () => execResult({ stdout: TUNNEL }),
        "docker inspect -f": () => execResult({ stdout: "healthy\n" }),
        "docker inspect": () => execResult({ stdout: ghost }),
      }),
    });
    await expect(up(input(), ports)).rejects.toThrow("어긋나 있습니다");
    expect(calls.some((c) => c.includes("compose"))).toBe(false);
  });

  it("healthy가 안 되면 던진다 — 뜨지 않은 배포를 성공으로 적지 않는다", async () => {
    const calls: string[][] = [];
    const ports = happy(calls, {
      exec: routeExec(calls, {
        "cloudflared tunnel list": () => execResult({ stdout: TUNNEL }),
        "docker inspect -f": () => execResult({ stdout: "starting\n" }),
        "docker inspect": () => execResult({ code: 1 }),
      }),
    });
    await expect(up(input(), ports)).rejects.toThrow("healthy");
  });
});

describe("멱등 — 두 번째 실행이 첫 번째와 같아야 한다", () => {
  it("터널이 있으면 만들지 않는다 — 같은 이름으로 두 번 만들면 CLI가 거부한다", async () => {
    const calls: string[][] = [];
    await up(input(), happy(calls));
    expect(calls.some((c) => c.join(" ").includes("tunnel create"))).toBe(false);
  });

  it("락을 잡았다가 반드시 푼다 — 실패해도 다음 실행이 막히면 안 된다", async () => {
    await expect(up(input(), happy([], { fs: makeFakeFs() }))).rejects.toThrow();
    await expect(up(input(), happy([]))).resolves.toMatchObject({ name: "ade" });
  });
});

describe("Access가 비면 경고한다", () => {
  it("accessEmails가 비어 있으면 로그로 알린다 — 무인증으로 열린다는 뜻이다", async () => {
    const log = vi.fn();
    const spec = DeploySpec.parse({ name: "ade", hostname: "arka.sangjun.dev", image: "i", port: 3000 });
    await up(input({ spec }), happy([], { log }));
    expect(log.mock.calls.flat().join(" ")).toContain("무인증");
  });
});

describe("dry-run은 바깥을 바꾸지 않는다", () => {
  it("compose도 DNS도 부르지 않는다", async () => {
    const calls: string[][] = [];
    await up(input(), happy(calls, { dryRun: true }));
    expect(calls.some((c) => c.join(" ").includes("route dns"))).toBe(false);
    expect(calls.some((c) => c.includes("compose"))).toBe(false);
  });
});

describe("envFile 읽기", () => {
  it("KEY=VALUE를 읽고 주석과 빈 줄을 건너뛴다", () => {
    expect(parseEnvFile("# 주석\n\nA=1\nB=x=y\n")).toEqual({ A: "1", B: "x=y" });
  });

  it("등호가 없는 줄은 무시한다", () => {
    expect(parseEnvFile("쓰레기\nA=1")).toEqual({ A: "1" });
  });
});
