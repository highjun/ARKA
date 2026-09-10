import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { FORBIDDEN_KEY, FORBIDDEN_MESSAGE } from "./tsconfigRules.ts";

/**
 * **린트가 닿지 못하는 저장소 루트의 설정**을 본다.
 *
 * 루트의 tsconfig는 세 패키지가 전부 `extends` 하므로 파급이 가장 큰데, 어느 패키지의
 * `eslint .`에도 안 잡힌다. 금지하는 것이 무엇인지는 `tsconfigRules.ts`가 든다.
 *
 * **각 패키지의 tsconfig는 그 패키지의 ESLint가 본다**(`ops/lint`의 `json/jsonc` 블록).
 * 여기가 루트만 맡는 것은 ESLint가 닿을 수 없어서다 — ESLint 10의 base path가 설정 파일이
 * 있는 디렉터리라 그 위로 넓힐 수 없다("File ignored because outside of base path").
 * 그래서 같은 규칙을 둘이 겹쳐 맡지 않는다.
 */
const REPO_ROOT = path.resolve(import.meta.dirname, "../..");

/** 루트 바로 아래만 본다 — 하위는 각 패키지의 린트 소관이다. */
const rootTsconfigs = (): string[] =>
  readdirSync(REPO_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^tsconfig(\..+)?\.json$/u.test(entry.name))
    .map((entry) => entry.name);

/** tsconfig는 주석이 있는 JSONC다 — `JSON.parse`가 죽는다. TypeScript 자신의 파서를 쓴다. */
const compilerOptionsOf = (name: string): Record<string, unknown> => {
  const file = path.join(REPO_ROOT, name);
  const { config, error } = ts.parseConfigFileTextToJson(file, readFileSync(file, "utf8"));
  if (error) throw new Error(`${name}를 읽지 못했다: ${ts.flattenDiagnosticMessageText(error.messageText, " ")}`);
  return ((config as Record<string, unknown> | undefined)?.["compilerOptions"] ?? {}) as Record<string, unknown>;
};

describe("루트 설정", () => {
  const names = rootTsconfigs();

  it("루트에서 tsconfig를 찾는다 — 못 찾으면 이 검사는 죽은 채로 초록이다", () => {
    expect(names).not.toHaveLength(0);
  });

  it.each(names)(`%s에 ${FORBIDDEN_KEY} 별칭이 없다`, (name) => {
    expect(compilerOptionsOf(name)[FORBIDDEN_KEY], FORBIDDEN_MESSAGE).toBeUndefined();
  });
});
