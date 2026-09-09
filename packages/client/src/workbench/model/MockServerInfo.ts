import type { IServerInfo, ServerInfo } from './IServerInfo';

/** 메모리 안의 `IServerInfo` — 줄 답을 생성자에서 받는다. `null`이면 못 읽는 서버다. */
export class MockServerInfo implements IServerInfo {
  readonly #info: ServerInfo | null;

  constructor(info: ServerInfo | null = null) {
    this.#info = info;
  }

  load(): Promise<ServerInfo | null> {
    return Promise.resolve(this.#info);
  }
}
