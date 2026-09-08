import type { MiddlewareHandler } from "hono";
import type { Logger } from "./log";
import type { AppVariables } from "./requestContext";

/**
 * 요청 하나에 로그 한 줄 — method·path·status·소요 ms. 응답이 끝난 뒤 남긴다.
 *
 * SSE는 연결이 끊길 때 한 줄이 남는다(그때까지 `next()`가 안 돌아온다). 헬스체크는 30초마다
 * 한 줄씩 쌓이므로 `info`가 아니라 건너뛴다 — 컨테이너 로그를 그것으로 채우지 않는다.
 */
export const createRequestLog = (log: Logger, { skip = ["/api/health"] }: { skip?: readonly string[] } = {}): MiddlewareHandler<{ Variables: Partial<AppVariables> }> => {
  return async (c, next) => {
    const started = performance.now();
    await next();
    if (skip.includes(c.req.path)) return;
    const fields = { method: c.req.method, path: c.req.path, status: c.res.status, ms: Math.round(performance.now() - started), user: c.get("user")?.userId ?? null };
    if (c.res.status >= 500) log.error("request", fields);
    else if (c.res.status >= 400) log.warn("request", fields);
    else log.info("request", fields);
  };
};
