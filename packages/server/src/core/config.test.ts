import { realpathSync } from "node:fs";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "./config";

let base: string;

describe("loadConfig", () => {
  beforeAll(async () => {
    base = realpathSync(await mkdtemp(path.join(os.tmpdir(), "arka-config-")));
    await mkdir(path.join(base, "ws"));
    await writeFile(path.join(base, "file.txt"), "");
    await symlink(path.join(base, "ws"), path.join(base, "ws-link"));
  });

  afterAll(async () => {
    await rm(base, { recursive: true, force: true });
  });

  describe("loadConfig", () => {
    it("기본값은 포트 3000, 루프백, 정적 서빙 없음이다", async () => {
      const config = await loadConfig({ ARKA_WORKSPACE: path.join(base, "ws") });
      expect(config).toEqual({
        workspaceRoot: path.join(base, "ws"),
        port: 3000,
        host: "127.0.0.1",
        clientRoot: undefined,
        gitSha: undefined,
      });
    });

    it("워크스페이스가 심링크면 실경로로 편다", async () => {
      const config = await loadConfig({ ARKA_WORKSPACE: path.join(base, "ws-link") });
      expect(config.workspaceRoot).toBe(path.join(base, "ws"));
    });

    it("없는 워크스페이스면 ConfigError를 던진다", async () => {
      await expect(loadConfig({ ARKA_WORKSPACE: path.join(base, "nope") })).rejects.toThrow(ConfigError);
      await expect(loadConfig({ ARKA_WORKSPACE: path.join(base, "nope") })).rejects.toThrow(/ARKA_WORKSPACE/u);
    });

    it("워크스페이스가 파일이면 ConfigError를 던진다", async () => {
      await expect(loadConfig({ ARKA_WORKSPACE: path.join(base, "file.txt") })).rejects.toThrow(/not a directory/u);
    });

    it("포트가 숫자가 아니면 ConfigError를 던진다", async () => {
      await expect(loadConfig({ ARKA_WORKSPACE: path.join(base, "ws"), ARKA_PORT: "abc" })).rejects.toThrow(
        /ARKA_PORT/u,
      );
    });

    it("포트 범위를 벗어나면 ConfigError를 던진다", async () => {
      await expect(loadConfig({ ARKA_WORKSPACE: path.join(base, "ws"), ARKA_PORT: "70000" })).rejects.toThrow(
        ConfigError,
      );
    });

    it("호스트와 클라이언트 루트를 읽는다", async () => {
      const config = await loadConfig({
        ARKA_WORKSPACE: path.join(base, "ws"),
        ARKA_HOST: "0.0.0.0",
        ARKA_CLIENT_ROOT: path.join(base, "ws-link"),
      });
      expect(config.host).toBe("0.0.0.0");
      expect(config.clientRoot).toBe(path.join(base, "ws"));
    });

    it("클라이언트 루트가 없으면 ConfigError를 던진다", async () => {
      await expect(
        loadConfig({ ARKA_WORKSPACE: path.join(base, "ws"), ARKA_CLIENT_ROOT: path.join(base, "nope") }),
      ).rejects.toThrow(/ARKA_CLIENT_ROOT/u);
    });
  });

  describe("빈 문자열은 없음이다", () => {
    it("빈 값을 준 옵셔널 변수가 부팅을 막지 않는다 — docker의 `ENV X=$ARG`가 그렇게 준다", async () => {
      const config = await loadConfig({
        ARKA_WORKSPACE: path.join(base, "ws"),
        ARKA_GIT_SHA: "",
      });

      expect(config.gitSha).toBeUndefined();
    });

    it("기본값이 있는 것도 빈 값이면 기본으로 떨어진다", async () => {
      const config = await loadConfig({
        ARKA_WORKSPACE: path.join(base, "ws"),
        ARKA_PORT: "",
        ARKA_HOST: "",
      });

      expect(config.port).toBe(3000);
      expect(config.host).toBe("127.0.0.1");
    });
  });
});
