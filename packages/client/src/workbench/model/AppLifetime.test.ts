import { describe, expect, it, vi } from "vitest";
import { PROTOCOL_HEADER, PROTOCOL_VERSION } from "#contracts";
import { AppLifetime } from "./AppLifetime";
import type { IAppLifetime } from "./IAppLifetime";
import type { IServerInfo, ServerInfo } from "./IServerInfo";

const info = (patch: Partial<ServerInfo> = {}): ServerInfo => ({
  builtAt: "2026-09-18T01:02:00Z",
  protocolVersion: PROTOCOL_VERSION,
  protocolHeader: PROTOCOL_HEADER,
  workspaceName: "arka",
  ...patch,
});
const serving = (value: ServerInfo | null): IServerInfo => ({ load: () => Promise.resolve(value) });

const make = (value: ServerInfo | null) => {
  const reload = vi.fn();
  const lifetime = new AppLifetime({ serverInfo: serving(value), reload });
  const contract: IAppLifetime = lifetime;
  return { lifetime, contract, reload };
};

describe("AppLifetime", () => {
  it("읽기 전엔 낡지 않았고 빌드 표시는 비어 있다", () => {
    const { contract } = make(info());

    expect(contract.isOutdated).toBe(false);
    expect(contract.builtAt).toBe("");
    expect(contract.gitSha).toBe("");
  });

  it("버전과 헤더가 같으면 낡지 않았다", async () => {
    const { lifetime, contract } = make(info());
    const listener = vi.fn();
    contract.onDidChange(listener);

    await lifetime.load();

    expect(contract.isOutdated).toBe(false);
    expect(contract.builtAt).toMatch(/^2026-09-\d\d \d\d:\d\d$/u);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("버전이 다르거나 헤더 이름이 다르면 낡았다", async () => {
    const byVersion = make(info({ protocolVersion: PROTOCOL_VERSION + 1 }));
    const byHeader = make(info({ protocolHeader: "x-other" }));

    await byVersion.lifetime.load();
    await byHeader.lifetime.load();

    expect(byVersion.contract.isOutdated).toBe(true);
    expect(byHeader.contract.isOutdated).toBe(true);
  });

  it("서버 정보를 못 읽으면 그대로다", async () => {
    const { lifetime, contract } = make(null);

    await lifetime.load();

    expect(contract.isOutdated).toBe(false);
    expect(contract.builtAt).toBe("");
    expect(contract.gitSha).toBe("");
  });

  it("커밋이 있으면 앞 7자를 붙인다", async () => {
    const { lifetime, contract } = make(info({ gitSha: "0123456789abcdef-dirty" }));

    await lifetime.load();

    expect(contract.gitSha).toBe("0123456-dirty");
  });

  it("requestReload는 주입받은 새로고침을 부른다", () => {
    const { contract, reload } = make(info());

    contract.requestReload("userRequested");

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
