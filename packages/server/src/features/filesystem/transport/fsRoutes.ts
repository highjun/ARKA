import { stat } from "node:fs/promises";
import { CreateEntryRequest, MoveEntryRequest, WriteFileRequest } from "#contracts";
import { Hono } from "hono";
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
import { fileErrorResponse } from "./fileErrorHandler";

export function createFsRoutes(workspaceRoot: string): Hono {
  const app = new Hono();

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
    if ((await resolveWithin(workspaceRoot, body.data.to)) !== null) {
      throw new FileError("Exists", `already exists: ${body.data.to}`);
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

  app.onError((error, c) => {
    const response = fileErrorResponse(error, c);
    if (response === undefined) throw error;
    return response;
  });

  return app;
}
