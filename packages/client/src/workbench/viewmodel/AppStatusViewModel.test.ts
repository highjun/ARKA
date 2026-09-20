import { PROTOCOL_HEADER, PROTOCOL_VERSION } from "#contracts";
import { describe, expect, it, vi } from "vitest";
import { AppLifetime } from "../model/AppLifetime";
import type { IServerInfo, ServerInfo } from "../model/IServerInfo";
import { Workspace } from "../model/Workspace";
import { AppStatusViewModel } from "./AppStatusViewModel";

const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

const make = (serverInfo: IServerInfo = { load: () => Promise.resolve(null) }) => {
  const reload = vi.fn();
  const viewModel = new AppStatusViewModel({
    appLifetime: new AppLifetime({ serverInfo, reload }),
    workspace: new Workspace({ serverInfo }),
  });
  return { viewModel, reload };
};

const info = (extra: Partial<ServerInfo>): IServerInfo => ({
  load: () =>
    Promise.resolve({
      builtAt: "2026-09-09T00:00:00.000Z",
      protocolVersion: PROTOCOL_VERSION,
      protocolHeader: PROTOCOL_HEADER,
      workspaceName: "ws",
      ...extra,
    }),
});

describe("IAppStatusViewModel — 낡은 클라이언트", () => {
  it("서버 프로토콜 버전이 다르면 낡았다고 표시한다", async () => {
    const { viewModel } = make(info({ protocolVersion: 999 }));
    await settled();
    expect(viewModel.isOutdated).toBe(true);
    expect(viewModel.buildId).not.toBe("");
    expect(viewModel.workspaceName).toBe("ws");
  });

  it("헤더 이름이 다르면 버전이 같아도 낡았다 — 개명하면 서버는 우리 요청을 헤더 없음으로 읽는다", async () => {
    const { viewModel } = make(info({ protocolHeader: "x-somethingelse-protocol" }));
    await settled();
    expect(viewModel.isOutdated).toBe(true);
  });

  it("같으면 낡지 않았다", async () => {
    const { viewModel } = make(info({}));
    await settled();
    expect(viewModel.isOutdated).toBe(false);
  });

  it("커밋 SHA가 있으면 빌드 표시에 앞 7자를 잇는다 — 무엇이 떠 있는지 눈으로 본다", async () => {
    const { viewModel } = make(info({ gitSha: "0123456789ab" }));
    await settled();
    expect(viewModel.buildId).toMatch(/ · 0123456$/u);
  });

  it("더러운 트리 표시는 지우지 않는다 — 그게 신호다", async () => {
    const { viewModel } = make(info({ gitSha: "0123456789ab-dirty" }));
    await settled();
    expect(viewModel.buildId).toMatch(/ · 0123456-dirty$/u);
  });

  it("커밋 SHA가 없으면 시각만 남는다 — 소스에서 바로 띄운 서버다", async () => {
    const { viewModel } = make(info({}));
    await settled();
    expect(viewModel.buildId).toMatch(/^v\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}$/u);
  });

  it("서버 정보를 못 읽으면 낡지 않은 것으로 둔다 — 진단이 기능을 막지 않는다", async () => {
    const { viewModel } = make();
    await settled();
    expect(viewModel.isOutdated).toBe(false);
    expect(viewModel.buildId).toBe("");
    expect(viewModel.workspaceName).toBe("");
  });

  it("reload는 앱 수명에 사용자 요청으로 넘긴다", () => {
    const { viewModel, reload } = make();

    viewModel.reload();

    expect(reload).toHaveBeenCalledOnce();
  });
});
