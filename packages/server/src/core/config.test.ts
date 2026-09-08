import { realpathSync } from "node:fs";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "./config";

let base: string;

beforeAll(async () => {
  base = realpathSync(await mkdtemp(path.join(os.tmpdir(), "ade-config-")));
  await mkdir(path.join(base, "ws"));
  await writeFile(path.join(base, "file.txt"), "");
  await symlink(path.join(base, "ws"), path.join(base, "ws-link"));
});

afterAll(async () => {
  await rm(base, { recursive: true, force: true });
});

describe("loadConfig", () => {
  it("기본값은 포트 3000, 루프백, 정적 서빙 없음이다", async () => {
    const config = await loadConfig({ ADE_WORKSPACE: path.join(base, "ws") });
    expect(config).toEqual({ workspaceRoot: path.join(base, "ws"), port: 3000, host: "127.0.0.1", clientRoot: undefined });
  });

  it("워크스페이스가 심링크면 실경로로 편다", async () => {
    const config = await loadConfig({ ADE_WORKSPACE: path.join(base, "ws-link") });
    expect(config.workspaceRoot).toBe(path.join(base, "ws"));
  });

  it("없는 워크스페이스면 ConfigError를 던진다", async () => {
    await expect(loadConfig({ ADE_WORKSPACE: path.join(base, "nope") })).rejects.toThrow(ConfigError);
    await expect(loadConfig({ ADE_WORKSPACE: path.join(base, "nope") })).rejects.toThrow(/ADE_WORKSPACE/u);
  });

  it("워크스페이스가 파일이면 ConfigError를 던진다", async () => {
    await expect(loadConfig({ ADE_WORKSPACE: path.join(base, "file.txt") })).rejects.toThrow(/not a directory/u);
  });

  it("포트가 숫자가 아니면 ConfigError를 던진다", async () => {
    await expect(loadConfig({ ADE_WORKSPACE: path.join(base, "ws"), ADE_PORT: "abc" })).rejects.toThrow(/ADE_PORT/u);
  });

  it("포트 범위를 벗어나면 ConfigError를 던진다", async () => {
    await expect(loadConfig({ ADE_WORKSPACE: path.join(base, "ws"), ADE_PORT: "70000" })).rejects.toThrow(ConfigError);
  });

  it("호스트와 클라이언트 루트를 읽는다", async () => {
    const config = await loadConfig({
      ADE_WORKSPACE: path.join(base, "ws"),
      ADE_HOST: "0.0.0.0",
      ADE_CLIENT_ROOT: path.join(base, "ws-link"),
    });
    expect(config.host).toBe("0.0.0.0");
    expect(config.clientRoot).toBe(path.join(base, "ws"));
  });

  it("클라이언트 루트가 없으면 ConfigError를 던진다", async () => {
    await expect(
      loadConfig({ ADE_WORKSPACE: path.join(base, "ws"), ADE_CLIENT_ROOT: path.join(base, "nope") }),
    ).rejects.toThrow(/ADE_CLIENT_ROOT/u);
  });
});
