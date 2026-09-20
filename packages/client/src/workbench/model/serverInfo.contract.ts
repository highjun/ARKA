import { PROTOCOL_HEADER } from "#contracts";
import { describe, expect, it } from "vitest";
import type { IServerInfo, ServerInfo } from "./IServerInfo";

export type ServerInfoSetup = {
  readonly answering: (sample: ServerInfo) => IServerInfo | Promise<IServerInfo>;
  readonly silent: () => IServerInfo | Promise<IServerInfo>;
};

const SAMPLE: ServerInfo = {
  builtAt: "2026-09-09T00:00:00.000Z",
  protocolVersion: 1,
  protocolHeader: PROTOCOL_HEADER,
  workspaceName: "ARKA",
};

export const testServerInfoContract = (name: string, setup: ServerInfoSetup): void => {
  describe(`IServerInfo: ${name}`, () => {
    it("답이 오면 그대로 준다", async () => {
      expect(await (await setup.answering(SAMPLE)).load()).toEqual(SAMPLE);
    });

    it("못 읽으면 null이다 — 던지지 않는다", async () => {
      expect(await (await setup.silent()).load()).toBeNull();
    });

    it("두 번 불러도 같은 답이다 — 부작용이 없다", async () => {
      const port = await setup.answering(SAMPLE);
      expect(await port.load()).toEqual(await port.load());
    });
  });
};
