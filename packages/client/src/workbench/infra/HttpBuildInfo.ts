import { VersionResponse } from 'contracts';
import type { IBuildInfo } from '../model/IBuildInfo';

class HttpBuildInfoAdapter implements IBuildInfo {
  async load(): Promise<string | null> {
    // 실패해도 화면은 그대로 돌아야 하므로 조용히 `null`을 준다 — 진단용 표시지 기능이 아니다.
    try {
      const response = await fetch('/api/version');
      if (!response.ok) return null;
      const body = VersionResponse.safeParse(await response.json());
      return body.success ? body.data.builtAt : null;
    } catch {
      return null;
    }
  }
}

/** `IBuildInfo`의 실제 구현(`HttpBuildInfoAdapter`)을 만든다. */
export const createBuildInfoPort = (): IBuildInfo => new HttpBuildInfoAdapter();
