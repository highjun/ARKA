import { SearchRequest } from "#contracts";
import { Hono } from "hono";
import { searchFiles } from "../infra/searchFiles";

/** `GET /api/search?query=&path=&regex=&caseSensitive=&maxResults=`. */
export const createSearchRoutes = (workspaceRoot: string): Hono => {
  const app = new Hono();
  app.get("/api/search", async (c) => {
    const request = SearchRequest.safeParse(c.req.query());
    if (!request.success) return c.json({ code: "BadRequest", message: request.error.message }, 400);
    return c.json(await searchFiles(workspaceRoot, request.data));
  });
  return app;
};
