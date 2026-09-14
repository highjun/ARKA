import type { IServerInfo, ServerInfo } from "./IServerInfo";

/** 메모리 안의 `IServerInfo` — 줄 답을 생성자에서 받는다. `null`이면 못 읽는 서버다. */
export class MockServerInfo implements IServerInfo {
  readonly #info: ServerInfo | null;

  /** 기본이 `null`이다 — 서버 정보를 못 읽은 상태가 기본 시나리오다. */
  constructor(info: ServerInfo | null = null) {
    this.#info = info;
  }

  /** 즉시 resolve된다 — 네트워크 지연을 흉내내지 않는다. */
  load(): Promise<ServerInfo | null> {
    return Promise.resolve(this.#info);
  }
}
