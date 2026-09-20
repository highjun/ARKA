import { URI } from "#contracts";
import type { Disposable } from "#core/di";
import { Emitter } from "#core/events";
import type { IServerInfo } from "./IServerInfo";
import type { IWorkspace } from "./IWorkspace";

export class OutsideWorkspaceError extends Error {
  constructor(relativePath: string) {
    super(`워크스페이스 밖을 가리킵니다: ${relativePath}`);
    this.name = "OutsideWorkspaceError";
  }
}

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

export class Workspace implements IWorkspace {
  readonly root = URI.file("");
  readonly #serverInfo: IServerInfo;
  readonly #changed = new Emitter();
  #name = "";

  constructor({ serverInfo }: { serverInfo: IServerInfo }) {
    this.#serverInfo = serverInfo;
  }

  get name(): string {
    return this.#name;
  }

  async load(): Promise<void> {
    const info = await this.#serverInfo.load();
    if (info === null) return;
    this.#name = info.workspaceName;
    this.#changed.fire();
  }

  resolve(relativePath: string): URI {
    if (relativePath.startsWith("/")) throw new OutsideWorkspaceError(relativePath);
    const normalized = normalize(relativePath);
    if (normalized === null) throw new OutsideWorkspaceError(relativePath);
    return URI.file(normalized);
  }

  relativize(uri: URI): string | null {
    return uri.scheme === "file" && uri.authority === "" ? uri.path : null;
  }

  onDidChange(listener: () => void): Disposable {
    return this.#changed.event(listener);
  }
}
