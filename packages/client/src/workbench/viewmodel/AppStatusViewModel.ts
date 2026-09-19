import type { Disposable } from "#core/di";
import { makeAutoObservable, observable } from "mobx";
import type { IAppLifetime } from "../model/IAppLifetime";
import type { IWorkspace } from "../model/IWorkspace";
import type { IAppStatusViewModel } from "./IAppStatusViewModel";

/** `IAppStatusViewModel`의 유일한 구현체. 앱 수명과 워크스페이스 둘을 구독한다. */
export class AppStatusViewModel implements IAppStatusViewModel {
  readonly #appLifetime: IAppLifetime;
  readonly #workspace: IWorkspace;
  readonly #subscriptions: readonly Disposable[];
  private workspaceNameState = "";
  private buildIdState = "";
  private isOutdatedState = false;

  /** 만들어지면 서버 정보를 읽는다 — 앱에 하나인 VM이라 그 시점이 곧 부팅이다. */
  constructor({ appLifetime, workspace }: { appLifetime: IAppLifetime; workspace: IWorkspace }) {
    this.#appLifetime = appLifetime;
    this.#workspace = workspace;
    makeAutoObservable<this, "workspaceNameState" | "buildIdState" | "isOutdatedState">(
      this,
      { workspaceNameState: observable, buildIdState: observable, isOutdatedState: observable },
      { autoBind: true },
    );
    this.#subscriptions = [
      appLifetime.onDidChange(() => this.syncLifetime()),
      workspace.onDidChange(() => this.syncWorkspace()),
    ];
    void appLifetime.load();
    void workspace.load();
  }

  /** 아직 서버 정보를 못 읽었으면 빈 문자열이다. */
  get workspaceName(): string {
    return this.workspaceNameState;
  }

  /** 아직 못 읽었거나 실패했으면 빈 문자열이다. */
  get buildId(): string {
    return this.buildIdState;
  }

  /** 서버 정보를 못 읽었으면 `false`다 — 모르면 낡았다고 말하지 않는다. */
  get isOutdated(): boolean {
    return this.isOutdatedState;
  }

  /** 앱 수명에 맡긴다 — 실제 새로고침은 그쪽이 주입받았다. */
  reload(): void {
    this.#appLifetime.requestReload("userRequested");
  }

  /** 구독을 끊는다. */
  dispose(): void {
    for (const subscription of this.#subscriptions) subscription.dispose();
  }

  private syncLifetime(): void {
    this.buildIdState = this.#appLifetime.buildId;
    this.isOutdatedState = this.#appLifetime.isOutdated;
  }

  private syncWorkspace(): void {
    this.workspaceNameState = this.#workspace.name;
  }
}
