import { apiHeaders } from "#core/http";
import { VersionResponse } from "#contracts";
import type { IServerInfo, ServerInfo } from "../model/IServerInfo";

class HttpServerInfoAdapter implements IServerInfo {
  async load(): Promise<ServerInfo | null> {
    try {
      const response = await fetch("/api/version", { headers: apiHeaders() });
      if (!response.ok) return null;
      const body = VersionResponse.safeParse(await response.json());
      return body.success ? body.data : null;
    } catch {
      return null;
    }
  }
}

export const createServerInfoPort = (): IServerInfo => new HttpServerInfoAdapter();
