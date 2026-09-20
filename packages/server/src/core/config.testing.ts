import type { ServerConfig } from "./config";

export const makeConfig = (overrides: Partial<ServerConfig> & Pick<ServerConfig, "workspaceRoot">): ServerConfig => ({
  port: 0,
  host: "127.0.0.1",
  clientRoot: undefined,
  gitSha: undefined,
  ...overrides,
});
