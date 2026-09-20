import { PROTOCOL_HEADER, PROTOCOL_VERSION } from "#contracts";
import type { Disposable } from "#core/di";
import { Emitter } from "#core/events";
import type { IAppLifetime } from "./IAppLifetime";
import type { IServerInfo } from "./IServerInfo";

const formatBuildLabel = (iso: string, gitSha?: string): string => {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  const two = (value: number): string => String(value).padStart(2, "0");
  const time = `v${String(at.getFullYear())}.${two(at.getMonth() + 1)}.${two(at.getDate())} ${two(at.getHours())}:${two(at.getMinutes())}`;
  return gitSha === undefined ? time : `${time} · ${gitSha.replace(/^([0-9a-f]{7})[0-9a-f]*/u, "$1")}`;
};

export class AppLifetime implements IAppLifetime {
  readonly #serverInfo: IServerInfo;
  readonly #reload: () => void;
  readonly #changed = new Emitter();
  #isOutdated = false;
  #buildId = "";

  constructor({ serverInfo, reload }: { serverInfo: IServerInfo; reload: () => void }) {
    this.#serverInfo = serverInfo;
    this.#reload = reload;
  }

  get isOutdated(): boolean {
    return this.#isOutdated;
  }

  get buildId(): string {
    return this.#buildId;
  }

  async load(): Promise<void> {
    const info = await this.#serverInfo.load();
    if (info === null) return;
    this.#buildId = formatBuildLabel(info.builtAt, info.gitSha);
    this.#isOutdated = info.protocolVersion !== PROTOCOL_VERSION || info.protocolHeader !== PROTOCOL_HEADER;
    this.#changed.fire();
  }

  requestReload(reason: "versionMismatch" | "userRequested"): void {
    void reason;
    this.#reload();
  }

  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }
}
