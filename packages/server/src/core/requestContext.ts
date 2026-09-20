import type { MiddlewareHandler } from "hono";

type RequestContext = { readonly userId: string };

export type AppVariables = { user: RequestContext };

const LOCAL_USER: RequestContext = { userId: "local" };

export const createRequestContext = (): MiddlewareHandler<{ Variables: AppVariables }> => async (c, next) => {
  const email = c.req.header("cf-access-authenticated-user-email");
  c.set("user", email === undefined || email === "" ? LOCAL_USER : { userId: email });
  await next();
};
