import { open, readdir } from "node:fs/promises";
import path from "node:path";
import type { SearchMatch, SearchRequest, SearchResponse } from "#contracts";

/** 이 이름의 디렉터리는 들어가지 않는다 — 워크스페이스 안의 산출물·의존성. */
const SKIPPED_DIRS = new Set(["node_modules", ".git", "dist", ".output", "storybook-static", ".pnpm-store"]);
/** 이보다 큰 파일은 읽지 않는다. 검색은 소스가 대상이지 덤프가 아니다. */
const MAX_FILE_BYTES = 1024 * 1024;
const PREVIEW_MAX = 200;

/** 검색어를 정규식으로. 리터럴이면 이스케이프한다. `g`는 한 줄에 여러 번 찾기 위해서다. */
export const compilePattern = ({ query, regex, caseSensitive }: Pick<SearchRequest, "query" | "regex" | "caseSensitive">): RegExp => {
  const source = regex ? query : query.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(source, caseSensitive ? "gu" : "giu");
};

/** 널 바이트가 있으면 바이너리로 친다(`fileOperations`의 판정과 같다). */
const looksBinary = (buffer: Buffer): boolean => buffer.includes(0);

/**
 * 파일 하나를 줄 단위로 찾는다. 바이너리·상한 초과는 `null`(읽지 않은 것으로 센다).
 * `budget`은 남은 결과 수 — 0이 되면 멈춘다.
 */
const searchFile = async (absolute: string, relative: string, pattern: RegExp, budget: number): Promise<readonly SearchMatch[] | null> => {
  const handle = await open(absolute, "r");
  try {
    const { size } = await handle.stat();
    if (size > MAX_FILE_BYTES) return null;
    const buffer = Buffer.alloc(size);
    if (size > 0) await handle.read(buffer, 0, size, 0);
    if (looksBinary(buffer.subarray(0, 8192))) return null;
    const matches: SearchMatch[] = [];
    const lines = buffer.toString("utf8").split(/\r?\n/u);
    for (const [index, text] of lines.entries()) {
      pattern.lastIndex = 0;
      for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
        matches.push({ path: relative, line: index + 1, column: match.index + 1, preview: text.length > PREVIEW_MAX ? `${text.slice(0, PREVIEW_MAX)}…` : text });
        if (matches.length >= budget) return matches;
        // 빈 매치(`a*` 같은 정규식)는 lastIndex가 안 움직여 무한 루프가 된다.
        if (match[0] === "") pattern.lastIndex += 1;
      }
    }
    return matches;
  } finally {
    await handle.close();
  }
};

/**
 * `root` 아래 `request.path`부터 걸어 내려가며 찾는다. 심링크는 따라가지 않는다 — 루트 밖으로 나갈 수 있다.
 * 결과가 `maxResults`에 닿으면 멈추고 `truncated`를 켠다. 파일은 경로순으로 훑어 결과가 안정적이다.
 *
 * `request.path`가 루트 밖이면(`..`) 빈 결과다 — 여기서는 경로를 문자열로만 막고, 존재 여부는 `readdir`이 답한다.
 */
export const searchFiles = async (root: string, request: SearchRequest): Promise<SearchResponse> => {
  const start = path.resolve(root, request.path.replace(/^\/+/u, ""));
  if (start !== root && !start.startsWith(`${root}${path.sep}`)) return { matches: [], truncated: false, filesScanned: 0 };
  const pattern = compilePattern(request);
  const matches: SearchMatch[] = [];
  let filesScanned = 0;
  let truncated = false;

  const walk = async (dir: string): Promise<void> => {
    if (truncated) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      // 없거나 못 읽는 디렉터리는 건너뛴다.
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name, "en"));
    for (const entry of entries) {
      if (truncated) return;
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRS.has(entry.name)) await walk(absolute);
      } else if (entry.isFile()) {
        const found = await searchFile(absolute, path.relative(root, absolute), pattern, request.maxResults - matches.length);
        if (found === null) continue;
        filesScanned += 1;
        matches.push(...found);
        if (matches.length >= request.maxResults) truncated = true;
      }
    }
  };
  await walk(start);
  return { matches, truncated, filesScanned };
};
