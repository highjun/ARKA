import type { IServerInfo, ServerInfo } from "./IServerInfo";

export class MockServerInfo implements IServerInfo {
  readonly #info: ServerInfo | null;

  constructor(info: ServerInfo | null = null) {
    this.#info = info;
  }

  load(): Promise<ServerInfo | null> {
    return Promise.resolve(this.#info);
  }
}
