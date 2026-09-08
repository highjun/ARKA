import { stat } from "node:fs/promises";
import {
  CreateEntryRequest,
  MoveEntryRequest,
  WriteFileRequest,
  type FileErrorCode,
} from "contracts";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { FileError } from "../domain/errors";
import {
  createEntry,
  listDirectory,
  moveEntry,
  readFileContent,
  removeEntry,
  resolveNewEntry,
  resolveWithin,
  writeFileContent,
} from "../infra/fileOperations";

/**
 * `/api/files*` 라우트. 핸들러는 검증하고 조작을 부르고 응답만 만든다.
 *
 * `workspaceRoot`를 인자로 받아, 어느 워크스페이스를 여는지는 조립하는 쪽이 정하게 한다.
 */
export function createFsRoutes(workspaceRoot: string): Hono {
  const app = new Hono();

  /** 루트 밖이거나 없는 경로면 던진다 — 둘을 구분하지 않는 건 의도다(있는지 여부가 새지 않게). */
  const resolve = async (requested: string): Promise<string> => {
    const absolute = await resolveWithin(workspaceRoot, requested);
    if (absolute === null) {
      throw new FileError("NotFound", `no such path: ${requested}`);
    }
    return absolute;
  };

  app.get("/api/files", async (c) => {
    const requested = c.req.query("path") ?? "";
    const absolute = await resolve(requested);
    return c.json(await listDirectory(workspaceRoot, absolute));
  });

  app.get("/api/files/content", async (c) => {
    const requested = c.req.query("path") ?? "";
    const absolute = await resolve(requested);
    const stats = await stat(absolute);
    if (stats.isDirectory()) {
      throw new FileError("IsADirectory", `is a directory: ${requested}`);
    }
    return c.json(await readFileContent(workspaceRoot, absolute));
  });

  app.put("/api/files/content", async (c) => {
    const body = WriteFileRequest.safeParse(await c.req.json().catch(() => null));
    if (!body.success) {
      return c.json({ code: "BadRequest", message: body.error.message }, 400);
    }
    const absolute = await resolve(body.data.path);
    await writeFileContent(absolute, body.data.content);
    return c.json({ path: body.data.path });
  });

  app.post("/api/files", async (c) => {
    const body = CreateEntryRequest.safeParse(await c.req.json().catch(() => null));
    if (!body.success) {
      return c.json({ code: "BadRequest", message: body.error.message }, 400);
    }
    // 만들 대상은 아직 없으므로 부모를 기준으로 푼다.
    const absolute = await resolveNewEntry(workspaceRoot, body.data.path);
    if (absolute === null) {
      throw new FileError("NotFound", `no such parent: ${body.data.path}`);
    }
    await createEntry(absolute, body.data.type);
    return c.json({ path: body.data.path });
  });

  app.post("/api/files/move", async (c) => {
    const body = MoveEntryRequest.safeParse(await c.req.json().catch(() => null));
    if (!body.success) {
      return c.json({ code: "BadRequest", message: body.error.message }, 400);
    }
    const from = await resolve(body.data.from);
    const to = await resolveNewEntry(workspaceRoot, body.data.to);
    if (to === null) {
      throw new FileError("NotFound", `no such parent: ${body.data.to}`);
    }
    await moveEntry(from, to);
    return c.json({ path: body.data.to });
  });

  app.delete("/api/files", async (c) => {
    const requested = c.req.query("path") ?? "";
    const absolute = await resolve(requested);
    await removeEntry(absolute);
    return c.json({ path: requested });
  });

  // 조작이 던진 것을 HTTP로 옮기는 자리. 라우트마다 try/catch를 두지 않는다.
  app.onError((error, c) => {
    if (error instanceof FileError) {
      return c.json({ code: error.code, message: error.message }, statusOf(error.code));
    }
    const code = (error as NodeJS.ErrnoException).code;
    const mapped = fromErrno(code);
    return c.json({ code: mapped, message: error.message }, statusOf(mapped));
  });

  return app;
}

function fromErrno(code: string | undefined): FileErrorCode {
  switch (code) {
    case "ENOENT":
      return "NotFound";
    case "EACCES":
    case "EPERM":
      return "NoPermission";
    case "EEXIST":
      return "Exists";
    case "EISDIR":
      return "IsADirectory";
    case "ENOTDIR":
      return "NotADirectory";
    default:
      return "Unavailable";
  }
}

function statusOf(code: FileErrorCode): ContentfulStatusCode {
  switch (code) {
    case "NotFound":
      return 404;
    case "NoPermission":
      return 403;
    case "Exists":
    case "Conflict":
      return 409;
    case "IsADirectory":
    case "NotADirectory":
      // 대상은 있는데 요청이 그 종류를 잘못 짚은 것이다.
      return 400;
    case "Unavailable":
      return 503;
  }
}
