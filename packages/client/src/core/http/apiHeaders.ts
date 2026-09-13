import { PROTOCOL_HEADER, PROTOCOL_VERSION } from "#contracts";

/**
 * 모든 `/api/*` 요청이 싣는 헤더. 서버가 이 값으로 클라이언트가 낡았는지 판단한다.
 *
 * 인증 헤더는 없다 — 앱은 인증을 모른다.
 */
export const apiHeaders = (): Record<string, string> => ({ [PROTOCOL_HEADER]: String(PROTOCOL_VERSION) });
