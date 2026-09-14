import { GitCommitRequest, GitDiffRequest, GitPathsRequest, type GitErrorCode } from "#contracts";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { GitError } from "../domain/errors";
import { createGitRunner } from "../infra/gitCommand";
import { commit, diff, stage, status, unstage } from "../infra/gitOperations";

const statusOf = (code: GitErrorCode): ContentfulStatusCode => {
  switch (code) {
    case "NotARepository":
      return 404;
    case "NothingToCommit":
      return 409;
    case "CommandFailed":
      return 422;
    case "Unavailable":
      return 503;
  }
};

/** 경로가 루트 밖을 가리키지 못하게 — git이 알아서 거부하지만 오류 문구가 저장소 경로를 싣는다. */
const withinRoot = (paths: readonly string[]): boolean =>
  paths.every((p) => !p.includes("\0") && !p.split("/").includes("..") && !p.startsWith("/"));

/** `/api/git/*`. 핸들러는 검증하고 조작을 부르고 응답만 만든다. */
export const createGitRoutes = (workspaceRoot: string): Hono => {
  const app = new Hono();
  const git = createGitRunner(workspaceRoot);

  app.get("/api/git/status", async (c) => c.json(await status(git, workspaceRoot)));

  app.get("/api/git/diff", async (c) => {
    const request = GitDiffRequest.safeParse(c.req.query());
    if (!request.success) return c.json({ code: "BadRequest", message: request.error.message }, 400);
    if (!withinRoot([request.data.path]))
      return c.json({ code: "BadRequest", message: "path must stay inside the workspace" }, 400);
    return c.json({ diff: await diff(git, request.data.path, request.data.staged) });
  });

  const pathsRoute = (route: string, run: (paths: readonly string[]) => Promise<string>) =>
    app.post(route, async (c) => {
      const body = GitPathsRequest.safeParse(await c.req.json().catch(() => null));
      if (!body.success) return c.json({ code: "BadRequest", message: body.error.message }, 400);
      if (!withinRoot(body.data.paths))
        return c.json({ code: "BadRequest", message: "paths must stay inside the workspace" }, 400);
      await run(body.data.paths);
      return c.body(null, 204);
    });
  pathsRoute("/api/git/stage", (paths) => stage(git, paths));
  pathsRoute("/api/git/unstage", (paths) => unstage(git, paths));

  app.post("/api/git/commit", async (c) => {
    const body = GitCommitRequest.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ code: "BadRequest", message: body.error.message }, 400);
    return c.json({ hash: await commit(git, body.data.message) }, 201);
  });

  app.onError((error, c) => {
    if (!(error instanceof GitError)) throw error;
    return c.json({ code: error.code, message: error.message }, statusOf(error.code));
  });

  return app;
};
