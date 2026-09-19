import { URI } from "#contracts";
import type { Disposable } from "#core/di";
import { Emitter } from "#core/events";
import type { IServerInfo } from "./IServerInfo";
import type { IWorkspace } from "./IWorkspace";

/** 루트 밖으로 나가려 했다. `..`가 루트를 넘거나 절대 경로를 준 경우. */
export class OutsideWorkspaceError extends Error {
  /** 무엇을 풀려 했는지 그대로 남긴다. */
  constructor(relativePath: string) {
    super(`워크스페이스 밖을 가리킵니다: ${relativePath}`);
    this.name = "OutsideWorkspaceError";
  }
}

/** `a/./b/../c` 를 `a/c` 로. 루트를 넘으면 `null`. */
const normalize = (relativePath: string): string | null => {
  const segments: string[] = [];
  for (const segment of relativePath.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (segments.pop() === undefined) return null;
      continue;
    }
    segments.push(segment);
  }
  return segments.join("/");
};

/** `IWorkspace`의 유일한 구현체. 루트는 `file:///`이고 이름은 서버에서 온다. */
export class Workspace implements IWorkspace {
  readonly root = URI.file("");
  readonly #serverInfo: IServerInfo;
  readonly #changed = new Emitter();
  #name = "";

  /** 이름은 `load()`가 부를 때 읽는다 — 생성자는 I/O를 하지 않는다. */
  constructor({ serverInfo }: { serverInfo: IServerInfo }) {
    this.#serverInfo = serverInfo;
  }

  /** 읽기 전엔 빈 문자열. */
  get name(): string {
    return this.#name;
  }

  /** 부팅 때 한 번. 못 읽으면 이름이 비어 있는 채로 둔다. */
  async load(): Promise<void> {
    const info = await this.#serverInfo.load();
    if (info === null) return;
    this.#name = info.workspaceName;
    this.#changed.fire();
  }

  /**
   * 루트 기준 상대 경로를 `file:` Uri로.
   * @throws OutsideWorkspaceError 절대 경로거나 `..`가 루트를 넘는다.
   */
  resolve(relativePath: string): URI {
    if (relativePath.startsWith("/")) throw new OutsideWorkspaceError(relativePath);
    const normalized = normalize(relativePath);
    if (normalized === null) throw new OutsideWorkspaceError(relativePath);
    return URI.file(normalized);
  }

  /** `file:` 스킴이 아니면 루트 밖이다. */
  relativize(uri: URI): string | null {
    return uri.scheme === "file" && uri.authority === "" ? uri.path : null;
  }

  /** `load`가 끝나면 한 번 부른다. */
  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }
}
