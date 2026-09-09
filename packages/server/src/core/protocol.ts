import { PROTOCOL_HEADER, type ProtocolErrorBody } from "#contracts";
import type { MiddlewareHandler } from "hono";

/**
 * `/api/*` 요청의 프로토콜 헤더를 검사한다(→ ADR 0017). 지원하지 않는 버전이거나 헤더가 없으면
 * 426과 `VersionMismatch`로 답한다 — 낡은 PWA 클라이언트가 새 서버를 치는 상황을 잡는 장치다.
 *
 * `/api/health`·`/api/version`은 이 미들웨어보다 **앞에** 등록해야 한다. Hono는 등록 순서대로
 * 매칭하므로 앞에 있는 라우트에는 미들웨어가 걸리지 않는다.
 */
export const createProtocolGuard = (supported: readonly number[]): MiddlewareHandler => {
  const body = (message: string): ProtocolErrorBody => ({ code: "VersionMismatch", message, supported: [...supported] });
  return async (c, next) => {
    const raw = c.req.header(PROTOCOL_HEADER);
    if (raw === undefined) {
      return c.json(body(`missing ${PROTOCOL_HEADER} header`), 426);
    }
    const version = Number(raw);
    if (!Number.isInteger(version) || version <= 0 || !supported.includes(version)) {
      return c.json(body(`unsupported protocol version: ${raw}`), 426);
    }
    await next();
    return undefined;
  };
};
