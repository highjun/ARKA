import type { MiddlewareHandler } from "hono";

/**
 * 요청마다 흐르는 인증 컨텍스트. 지금은 인증이 없으므로 `userId`는 거의 항상 `"local"`이다(→ ADR 0014).
 *
 * 그래도 자리를 만들어 두는 이유: 나중에 권한을 나눌 때 라우트마다 "누가"를 새로 꿰는 것이 전면 수정이다.
 * Cloudflare Access를 지나온 요청은 `Cf-Access-Authenticated-User-Email` 헤더를 싣는다 — 그것이 있으면
 * 식별자로 쓴다. **검증은 하지 않는다**(JWT 검증은 별도 결정) — 로그와 이벤트에 "누구"를 남기는 용도다.
 */
export type RequestContext = { readonly userId: string };

export type AppVariables = { user: RequestContext };

export const LOCAL_USER: RequestContext = { userId: "local" };

export const createRequestContext = (): MiddlewareHandler<{ Variables: AppVariables }> => async (c, next) => {
  const email = c.req.header("cf-access-authenticated-user-email");
  c.set("user", email === undefined || email === "" ? LOCAL_USER : { userId: email });
  await next();
};
