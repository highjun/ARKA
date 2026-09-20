import { watch as fsWatch, type FSWatcher } from "node:fs";
import path from "node:path";
import { resolveWithin } from "./fileOperations";

const COALESCE_MS = 200;

export const MAX_WATCH_PATHS = 128;

export type WorkspaceWatchHandle = { readonly close: () => void };

export const watchPaths = (
  rootDir: string,
  absolutePaths: readonly string[],
  onChange: (relativePaths: readonly string[]) => void,
): WorkspaceWatchHandle => {
  const watchers: FSWatcher[] = [];
  const dirty = new Set<string>();
  let flushTimer: ReturnType<typeof setTimeout> | undefined;

  const relativeOf = (absPath: string): string => path.relative(rootDir, absPath);

  const scheduleFlush = (): void => {
    if (flushTimer !== undefined) return;
    flushTimer = setTimeout(() => {
      flushTimer = undefined;
      if (dirty.size === 0) return;
      const paths = [...dirty];
      dirty.clear();
      onChange(paths);
    }, COALESCE_MS);
  };

  for (const absPath of absolutePaths) {
    try {
      const watcher = fsWatch(absPath, () => {
        dirty.add(relativeOf(absPath));
        scheduleFlush();
      });
      watcher.on("error", () => {
        dirty.add(relativeOf(absPath));
        scheduleFlush();
        watcher.close();
      });
      watchers.push(watcher);
    } catch {
      continue;
    }
  }

  return {
    close: () => {
      if (flushTimer !== undefined) clearTimeout(flushTimer);
      for (const watcher of watchers) watcher.close();
    },
  };
};

export const resolveWatchPaths = async (
  rootDir: string,
  requested: readonly string[],
): Promise<readonly string[] | null> => {
  const resolved: string[] = [];
  for (const each of requested) {
    const abs = await resolveWithin(rootDir, each);
    if (abs === null) return null;
    resolved.push(abs);
  }
  return resolved;
};
