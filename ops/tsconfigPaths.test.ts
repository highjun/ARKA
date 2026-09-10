import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * tsconfig의 `paths` 별칭을 금지한다(→ ADR 0001).
 *
 * tsc만 아는 별칭이라 **타입 검사는 통과하는데 vitest·node가 모듈을 못 찾는다.** 도구마다 같은
 * 별칭을 다시 등록하게 되므로 `package.json`의 `imports` 필드를 쓴다.
 *
 * 대상을 **탐색으로 모은다.** 옛 구현은 루트 스크립트가 글롭으로 패키지 아래만 적어 둬서
 * `ops/tsconfig.json`이 대상에서 빠져 있었고, 새 패키지가 생겨도 따라오지 않았다 — 유지하는
 * 목록은 낡는다.
 */
const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const SKIP = new Set(["node_modules", ".output", ".git", "dist", "storybook-static"]);

const findTsconfigs = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP.has(entry.name)) return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return findTsconfigs(full);
    return /^tsconfig(\..+)?\.json$/u.test(entry.name) ? [full] : [];
  });

/** tsconfig는 주석이 있는 JSONC다 — `JSON.parse`가 죽는다. TypeScript 자신의 파서를 쓴다. */
const readConfig = (file: string): Record<string, unknown> => {
  const { config, error } = ts.parseConfigFileTextToJson(file, readFileSync(file, "utf8"));
  if (error) throw new Error(`${file}를 읽지 못했다: ${ts.flattenDiagnosticMessageText(error.messageText, " ")}`);
  return (config ?? {}) as Record<string, unknown>;
};

describe("tsconfig", () => {
  const files = findTsconfigs(REPO_ROOT);

  it("저장소의 tsconfig를 찾는다 — 못 찾으면 이 검사는 죽은 채로 초록이다", () => {
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  it.each(files.map((file) => [path.relative(REPO_ROOT, file), file]))(
    "%s에 paths 별칭이 없다",
    (_name, file) => {
      const options = readConfig(file)["compilerOptions"] as Record<string, unknown> | undefined;
      expect(options?.["paths"], "paths 별칭을 쓰지 않습니다 — package.json의 imports 필드를 쓰세요").toBeUndefined();
    },
  );
});
