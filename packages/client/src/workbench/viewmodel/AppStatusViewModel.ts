import type { Disposable } from "#core/di";
import { makeAutoObservable, observable } from "mobx";
import type { IAppLifetime } from "../model/IAppLifetime";
import type { IWorkspace } from "../model/IWorkspace";
import type { IAppStatusViewModel } from "./IAppStatusViewModel";

export class AppStatusViewModel implements IAppStatusViewModel {
  readonly #appLifetime: IAppLifetime;
  readonly #workspace: IWorkspace;
  readonly #subscriptions: readonly Disposable[];
  private workspaceNameState = "";
  private buildIdState = "";
  private isOutdatedState = false;

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

  get workspaceName(): string {
    return this.workspaceNameState;
  }

  get buildId(): string {
    return this.buildIdState;
  }

  get isOutdated(): boolean {
    return this.isOutdatedState;
  }

  reload(): void {
    this.#appLifetime.requestReload("userRequested");
  }

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
