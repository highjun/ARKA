export type ServerInfo = {
  readonly builtAt: string;
  readonly protocolVersion: number;
  readonly protocolHeader: string;
  readonly workspaceName: string;
  readonly gitSha?: string;
};

declare module "#core/di" {
  interface InstanceMap {
    "arka.workbench.serverInfo": IServerInfo;
  }
}
export interface IServerInfo {
  load(): Promise<ServerInfo | null>;
}
