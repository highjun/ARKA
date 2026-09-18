import { PROTOCOL_HEADER, PROTOCOL_VERSION } from "#contracts";
import type { Disposable } from "#core/di";
import { Emitter } from "#core/events";
import type { IAppLifetime } from "./IAppLifetime";
import type { IServerInfo } from "./IServerInfo";

/**
 * 빌드 표시 한 줄 — 시각과, 있으면 커밋. 시각은 **보는 사람의 시간대로** 읽혀야 하므로 여기서 형식을 정한다.
 * 커밋은 없을 수 있다(소스에서 바로 띄운 서버). 앞 7자만 — 사람이 눈으로 옮겨 적는 길이다.
 */
const formatBuildLabel = (iso: string, gitSha?: string): string => {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  const two = (value: number): string => String(value).padStart(2, "0");
  const time = `v${String(at.getFullYear())}.${two(at.getMonth() + 1)}.${two(at.getDate())} ${two(at.getHours())}:${two(at.getMinutes())}`;
  return gitSha === undefined ? time : `${time} · ${gitSha.replace(/^([0-9a-f]{7})[0-9a-f]*/u, "$1")}`;
};

/** `IAppLifetime`의 유일한 구현체. 새로고침은 주입받는다 — Model은 `location`을 모른다. */
export class AppLifetime implements IAppLifetime {
  readonly #serverInfo: IServerInfo;
  readonly #reload: () => void;
  readonly #changed = new Emitter();
  #isOutdated = false;
  #buildId = "";

  /** 서버 정보는 `load()`가 부를 때 읽는다 — 생성자는 I/O를 하지 않는다. */
  constructor({ serverInfo, reload }: { serverInfo: IServerInfo; reload: () => void }) {
    this.#serverInfo = serverInfo;
    this.#reload = reload;
  }

  /** 서버 정보를 못 읽었으면 `false`다 — 모르면 낡았다고 말하지 않는다. */
  get isOutdated(): boolean {
    return this.#isOutdated;
  }

  /** 아직 못 읽었거나 실패했으면 빈 문자열. */
  get buildId(): string {
    return this.#buildId;
  }

  /**
   * 부팅 때 한 번. 버전과 **헤더 이름** 둘 다 본다 — 이름이 바뀌면 서버는 우리 요청을 헤더 없음으로
   * 읽어 426을 주는데, 버전만 보면 낡은 줄 모른 채 빈 화면을 띄운다.
   */
  async load(): Promise<void> {
    const info = await this.#serverInfo.load();
    if (info === null) return;
    this.#buildId = formatBuildLabel(info.builtAt, info.gitSha);
    this.#isOutdated = info.protocolVersion !== PROTOCOL_VERSION || info.protocolHeader !== PROTOCOL_HEADER;
    this.#changed.fire();
  }

  /** 이유는 아직 기록만 한다 — 둘 다 새로고침이다. */
  requestReload(reason: "versionMismatch" | "userRequested"): void {
    void reason;
    this.#reload();
  }

  /** `load`가 끝나면 한 번 부른다. */
  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }
}
