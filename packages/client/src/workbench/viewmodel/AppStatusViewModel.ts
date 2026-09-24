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
  private builtAtState = "";
  private gitShaState = "";
  private isOutdatedState = false;
  private isUpdateAvailableState = false;

  constructor({ appLifetime, workspace }: { appLifetime: IAppLifetime; workspace: IWorkspace }) {
    this.#appLifetime = appLifetime;
    this.#workspace = workspace;
    makeAutoObservable<
      this,
      "workspaceNameState" | "builtAtState" | "gitShaState" | "isOutdatedState" | "isUpdateAvailableState"
    >(
      this,
      {
        workspaceNameState: observable,
        builtAtState: observable,
        gitShaState: observable,
        isOutdatedState: observable,
        isUpdateAvailableState: observable,
      },
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

  get builtAt(): string {
    return this.builtAtState;
  }

  get gitSha(): string {
    return this.gitShaState;
  }

  get isOutdated(): boolean {
    return this.isOutdatedState;
  }

  get isUpdateAvailable(): boolean {
    return this.isUpdateAvailableState;
  }

  reload(): void {
    this.#appLifetime.requestReload("userRequested");
  }

  dispose(): void {
    for (const subscription of this.#subscriptions) subscription.dispose();
  }

  private syncLifetime(): void {
    this.builtAtState = this.#appLifetime.builtAt;
    this.gitShaState = this.#appLifetime.gitSha;
    this.isOutdatedState = this.#appLifetime.isOutdated;
    this.isUpdateAvailableState = this.#appLifetime.isUpdateAvailable;
  }

  private syncWorkspace(): void {
    this.workspaceNameState = this.#workspace.name;
  }
}
