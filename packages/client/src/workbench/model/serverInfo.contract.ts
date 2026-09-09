import { describe, expect, it } from 'vitest';
import type { IServerInfo, ServerInfo } from './IServerInfo';

/** 스위트가 구현을 두 상태로 세울 수 있어야 한다 — 답을 주는 서버와, 답을 못 주는 서버. */
export type ServerInfoSetup = {
  /** `sample`을 그대로 돌려주는 구현. */
  readonly answering: (sample: ServerInfo) => IServerInfo | Promise<IServerInfo>;
  /** 서버가 없거나 답이 계약에 어긋나는 상황의 구현. */
  readonly silent: () => IServerInfo | Promise<IServerInfo>;
};

const SAMPLE: ServerInfo = { builtAt: '2026-09-09T00:00:00.000Z', protocolVersion: 1, workspaceName: 'ARKASHIC' };

/**
 * `IServerInfo`를 구현한 모든 것이 통과해야 하는 스위트.
 *
 * 이 계약의 핵심은 **던지지 않는다**이다 — 진단용 표시지 기능이 아니라서, 서버가 뭘 하든
 * 화면은 그대로 돌아야 한다. 구현마다 "못 읽는 상황"을 만드는 방법이 달라 `setup`이 그 둘을 준다.
 */
export const testServerInfoContract = (name: string, setup: ServerInfoSetup): void => {
  describe(`IServerInfo: ${name}`, () => {
    it('답이 오면 그대로 준다', async () => {
      expect(await (await setup.answering(SAMPLE)).load()).toEqual(SAMPLE);
    });

    it('못 읽으면 null이다 — 던지지 않는다', async () => {
      expect(await (await setup.silent()).load()).toBeNull();
    });

    it('두 번 불러도 같은 답이다 — 부작용이 없다', async () => {
      const port = await setup.answering(SAMPLE);
      expect(await port.load()).toEqual(await port.load());
    });
  });
};
