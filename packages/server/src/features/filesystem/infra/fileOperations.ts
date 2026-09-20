import { mkdir, open, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DirectoryListing, FileContent, FileEntry, FileEntryType } from "#contracts";

const MAX_BYTES = 512 * 1024;

export const resolveWithin = async (rootDir: string, requested: string): Promise<string | null> => {
  if (requested.includes("\0")) return null;

  const relative = requested.replace(/^\/+/u, "");
  const full = path.resolve(rootDir, relative);

  if (full !== rootDir && !full.startsWith(`${rootDir}${path.sep}`)) return null;

  try {
    const real = await realpath(full);
    if (real !== rootDir && !real.startsWith(`${rootDir}${path.sep}`)) return null;
    return real;
  } catch {
    return null;
  }
};

export const resolveNewEntry = async (rootDir: string, requested: string): Promise<string | null> => {
  if (requested.includes("\0")) return null;
  const relative = requested.replace(/^\/+/u, "");
  const full = path.resolve(rootDir, relative);
  if (full === rootDir) return null;
  if (!full.startsWith(`${rootDir}${path.sep}`)) return null;

  const name = path.basename(full);
  const parentRelative = path.relative(rootDir, path.dirname(full));
  const parentResolved = await resolveWithin(rootDir, parentRelative);
  if (parentResolved === null) return null;
  return path.join(parentResolved, name);
};

const byName = new Intl.Collator("ko").compare;

export const listDirectory = async (rootDir: string, absDir: string): Promise<DirectoryListing> => {
  const dirents = await readdir(absDir, { withFileTypes: true });
  const entries: FileEntry[] = dirents
    .filter((entry) => entry.isDirectory() || entry.isFile() || entry.isSymbolicLink())
    .map((entry): FileEntry => ({ name: entry.name, type: entry.isDirectory() ? "dir" : "file" }));

  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return byName(a.name, b.name);
  });

  const relative = path.relative(rootDir, absDir);
  const parent = relative === "" ? null : path.dirname(relative) === "." ? "" : path.dirname(relative);
  return { path: relative, parent, entries };
};

const looksBinary = (buffer: Buffer): boolean => buffer.includes(0);

export const readFileContent = async (rootDir: string, absPath: string): Promise<FileContent> => {
  const relative = path.relative(rootDir, absPath);
  const handle = await open(absPath, "r");

  try {
    const { size } = await handle.stat();
    const buffer = Buffer.alloc(Math.min(size, MAX_BYTES));
    if (buffer.byteLength > 0) await handle.read(buffer, 0, buffer.byteLength, 0);

    if (looksBinary(buffer)) {
      return { path: relative, content: "", truncated: false, encoding: "binary" };
    }
    return { path: relative, content: buffer.toString("utf8"), truncated: size > MAX_BYTES, encoding: "utf8" };
  } finally {
    await handle.close();
  }
};

export const writeFileContent = async (absPath: string, content: string): Promise<void> => {
  await writeFile(absPath, content, "utf8");
};

export const createEntry = async (absPath: string, type: FileEntryType): Promise<void> => {
  if (type === "dir") await mkdir(absPath);
  else await writeFile(absPath, "", { flag: "wx" });
};

export const moveEntry = async (fromAbs: string, toAbs: string): Promise<void> => {
  await rename(fromAbs, toAbs);
};

export const removeEntry = async (absPath: string): Promise<void> => {
  await rm(absPath, { recursive: true });
};
