import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT, PURGE, down } from "./down.ts";
import { execResult, makeFakeFs, makeFakePorts, routeExec } from "./testFakes.ts";
import type { DownInput } from "./down.ts";
import type { Ports } from "./ports.ts";

let stateDir: string;
beforeEach(() => {
  stateDir = mkdtempSync(path.join(tmpdir(), "ade-down-"));
});
afterEach(() => {
  rmSync(stateDir, { recursive: true, force: true });
});

const MANIFEST = JSON.stringify({
  sourceFile: "/repo/x.ts", name: "ade", hostname: "arka.sangjun.dev",
  tunnelId: "a35b3f82-9881-48a1-b00e-9636c6a4801c", image: "ade:2026-09-11",
  generatedAt: "2026-09-11T00:00:00.000Z",
});
const TUNNEL = JSON.stringify([{ id: "a35b3f82-9881-48a1-b00e-9636c6a4801c", name: "ade" }]);

const input = (over: Partial<DownInput> = {}): DownInput => ({
  name: "ade", stateDir, credentialsDir: "/secure", zone: "sangjun.dev", token: "tok", ...over,
});

const files = (dir: string): Record<string, string> => ({
  [path.join(dir, "ade", "manifest.json")]: MANIFEST,
  [path.join(dir, "ade", "compose.yml")]: "name: ade",
});

const ok = (result: unknown): Response =>
  ({ status: 200, json: async () => Promise.resolve({ success: true, errors: [], result }) }) as unknown as Response;

const ports = (calls: string[][], over: Partial<Ports> = {}): Ports =>
  makeFakePorts({
    fs: makeFakeFs(files(stateDir)),
    exec: routeExec(calls, { "cloudflared tunnel list": () => execResult({ stdout: TUNNEL }) }),
    ...over,
  });

describe("무엇이 있는지는 manifest가 안다", () => {
  it("이미지 이름을 추측하지 않는다 — manifest의 것을 지운다", async () => {
    const calls: string[][] = [];
    await down(input(), { ...DEFAULT, image: true }, ports(calls));
    expect(calls.find((c) => c.includes("image"))).toContain("ade:2026-09-11");
  });

  it("manifest가 없으면 이미지를 건너뛴다 — `<이름>:latest`로 추측하다 엉뚱한 것을 지운 전례가 있다", async () => {
    const calls: string[][] = [];
    const result = await down(input(), { ...DEFAULT, image: true }, ports(calls, { fs: makeFakeFs() }));
    expect(result.imageRemoved).toBe(false);
    expect(calls.some((c) => c.includes("image"))).toBe(false);
  });
});

describe("컨테이너 내리기", () => {
  it("compose 파일이 있으면 그것으로 내린다", async () => {
    const calls: string[][] = [];
    await down(input(), DEFAULT, ports(calls));
    expect(calls[0]?.join(" ")).toContain("compose -p ade");
  });

  it("compose 파일이 없으면 이름으로 지운다 — 그때가 바로 내려야 하는 순간인데 정상 경로가 막혀 있다", async () => {
    const calls: string[][] = [];
    await down(input(), DEFAULT, ports(calls, { fs: makeFakeFs() }));
    expect(calls[0]?.join(" ")).toBe("docker rm -f ade-app ade-tunnel");
  });
});

describe("Access는 기본으로 지우지 않는다 — DNS와 반대 판단이다", () => {
  it("PURGE에도 access가 없다. 지우는 순간 그 호스트는 다시 배포될 때까지 무방비다", () => {
    expect(PURGE.access).toBe(false);
    expect(PURGE.dns).toBe(true);
  });

  it("켜면 지운다", async () => {
    const fetchImpl = vi.fn<Ports["fetch"]>()
      .mockResolvedValueOnce(ok([{ id: "zone-1" }]))
      .mockResolvedValueOnce(ok([{ id: "app-1", domain: "arka.sangjun.dev" }]))
      .mockResolvedValue(ok({}));
    const result = await down(input(), { ...DEFAULT, access: true }, ports([], { fetch: fetchImpl }));
    expect(result.accessRemoved).toBe(true);
  });
});

describe("존 조회는 한 번만 한다", () => {
  it("DNS와 Access를 같이 켜도 요청이 하나다", async () => {
    const fetchImpl = vi.fn<Ports["fetch"]>()
      .mockResolvedValueOnce(ok([{ id: "zone-1" }]))
      .mockResolvedValue(ok([]));
    await down(input(), { ...DEFAULT, dns: true, access: true }, ports([], { fetch: fetchImpl }));
    const zoneCalls = fetchImpl.mock.calls.filter(([url]) => String(url).includes("/zones?name="));
    expect(zoneCalls).toHaveLength(1);
  });
});

describe("호스트 이름을 모르면 아무것도 하기 전에 던진다", () => {
  it("manifest도 인자도 없는데 DNS를 켜면 던진다", async () => {
    const calls: string[][] = [];
    await expect(down(input(), { ...DEFAULT, dns: true }, ports(calls, { fs: makeFakeFs() })))
      .rejects.toThrow("호스트 이름을 모릅니다");
    expect(calls).toHaveLength(0);
  });

  it("인자로 주면 manifest 없이도 된다", async () => {
    const fetchImpl = vi.fn<Ports["fetch"]>().mockResolvedValueOnce(ok([{ id: "z" }])).mockResolvedValue(ok([]));
    await expect(down(input({ hostname: "pr-1-arka.sangjun.dev" }), { ...DEFAULT, dns: true }, ports([], { fs: makeFakeFs(), fetch: fetchImpl })))
      .resolves.toMatchObject({ dnsRecordsRemoved: 0 });
  });
});

describe("터널", () => {
  it("지우고 자격증명 파일도 없앤다", async () => {
    const calls: string[][] = [];
    const fs = makeFakeFs({ ...files(stateDir), "/secure/a35b3f82-9881-48a1-b00e-9636c6a4801c.json": "{}" });
    const result = await down(input(), { ...DEFAULT, tunnel: true }, ports(calls, { fs }));
    expect(result.tunnelRemoved).toBe(true);
    expect(fs.files.has("/secure/a35b3f82-9881-48a1-b00e-9636c6a4801c.json")).toBe(false);
  });

  it("이미 없으면 조용히 지나간다", async () => {
    const calls: string[][] = [];
    const exec = routeExec(calls, { "cloudflared tunnel list": () => execResult({ stdout: "[]" }) });
    const result = await down(input(), { ...DEFAULT, tunnel: true }, ports(calls, { exec }));
    expect(result.tunnelRemoved).toBe(false);
  });
});

describe("dry-run은 바깥을 바꾸지 않는다", () => {
  it("아무 명령도 부르지 않는다", async () => {
    const calls: string[][] = [];
    await down(input(), PURGE, ports(calls, { dryRun: true }));
    expect(calls).toHaveLength(0);
  });
});
