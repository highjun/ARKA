import type { MiddlewareHandler } from "hono";
import type { Logger } from "./log";
import type { AppVariables } from "./requestContext";

export const createRequestLog = (
  log: Logger,
  { skip = ["/api/health"] }: { skip?: readonly string[] } = {},
): MiddlewareHandler<{ Variables: Partial<AppVariables> }> => {
  return async (c, next) => {
    const started = performance.now();
    await next();
    if (skip.includes(c.req.path)) return;
    const fields = {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      ms: Math.round(performance.now() - started),
      user: c.get("user")?.userId ?? null,
    };
    if (c.res.status >= 500) log.error("request", fields);
    else if (c.res.status >= 400) log.warn("request", fields);
    else log.info("request", fields);
  };
};
