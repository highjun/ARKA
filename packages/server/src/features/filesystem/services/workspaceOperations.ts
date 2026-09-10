import { stat } from "node:fs/promises";
import type { DirectoryListing, FileContent, FileEntryType } from "#contracts";
import { FileError } from "../domain/errors";
import { createEntry, listDirectory, readFileContent, resolveNewEntry, resolveWithin, writeFileContent } from "../infra/fileOperations";

/**
 * 워크스페이스를 **경로 방어를 거쳐** 다루는 유스케이스 — HTTP 밖(에이전트 툴 등)에서 쓰는 통로다.
 * 라우트(`fsRoutes`)가 하던 "검증 → 조작" 순서를 그대로 옮겼다. 다른 feature는 이것만 본다.
 */
export type WorkspaceOperations = {
  list(path: string): Promise<DirectoryListing>;
  read(path: string): Promise<FileContent>;
  write(path: string, content: string): Promise<void>;
  create(path: string, type: FileEntryType): Promise<void>;
};

/** 모든 경로가 `workspaceRoot` 안으로 풀리는지 먼저 본다 — 밖이면 `NotFound`다. */
export const createWorkspaceOperations = (workspaceRoot: string): WorkspaceOperations => {
  const resolve = async (requested: string): Promise<string> => {
    const absolute = await resolveWithin(workspaceRoot, requested);
    if (absolute === null) throw new FileError("NotFound", `no such path: ${requested}`);
    return absolute;
  };
  return {
    list: async (path) => listDirectory(workspaceRoot, await resolve(path)),
    read: async (path) => {
      const absolute = await resolve(path);
      if ((await stat(absolute)).isDirectory()) throw new FileError("IsADirectory", `is a directory: ${path}`);
      return readFileContent(workspaceRoot, absolute);
    },
    write: async (path, content) => writeFileContent(await resolve(path), content),
    create: async (path, type) => {
      const absolute = await resolveNewEntry(workspaceRoot, path);
      if (absolute === null) throw new FileError("NotFound", `no such parent: ${path}`);
      await createEntry(absolute, type);
    },
  };
};
