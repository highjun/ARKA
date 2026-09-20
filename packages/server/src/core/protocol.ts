import { PROTOCOL_HEADER, type ProtocolErrorBody } from "#contracts";
import type { MiddlewareHandler } from "hono";

export const createProtocolGuard = (supported: readonly number[]): MiddlewareHandler => {
  const body = (message: string): ProtocolErrorBody => ({
    code: "VersionMismatch",
    message,
    supported: [...supported],
  });
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
