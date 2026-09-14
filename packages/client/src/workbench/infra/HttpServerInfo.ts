import { apiHeaders } from "#core/http";
import { VersionResponse } from "#contracts";
import type { IServerInfo, ServerInfo } from "../model/IServerInfo";

class HttpServerInfoAdapter implements IServerInfo {
  async load(): Promise<ServerInfo | null> {
    // 실패해도 화면은 그대로 돌아야 하므로 조용히 `null`을 준다 — 진단용 표시지 기능이 아니다.
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

/** `IServerInfo`의 실제 구현(`HttpServerInfoAdapter`)을 만든다. */
export const createServerInfoPort = (): IServerInfo => new HttpServerInfoAdapter();
