import { realpathSync } from "node:fs";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { compilePattern, searchFiles } from "./searchFiles";

let outside: string;
let root: string;
const req = (query: string, extra: Partial<Parameters<typeof searchFiles>[1]> = {}) => ({
  query,
  path: "",
  regex: false,
  caseSensitive: false,
  maxResults: 200,
  ...extra,
});

describe("searchFiles", () => {
  beforeAll(async () => {
    outside = realpathSync(await mkdtemp(path.join(os.tmpdir(), "arka-search-")));
    root = path.join(outside, "root");
    await mkdir(path.join(root, "src", "node_modules"), { recursive: true });
    await writeFile(path.join(root, "README.md"), "# ARKA\nAgent Development Environment\nagent again\n");
    await writeFile(path.join(root, "src", "main.ts"), "export const agent = 1;\nconst x = 'Agent';\n");
    await writeFile(path.join(root, "src", "node_modules", "dep.js"), "agent agent agent\n");
    await writeFile(path.join(root, "bin.dat"), Buffer.from([0, 1, 2, 97, 103, 101, 110, 116]));
    await writeFile(path.join(outside, "secret.txt"), "agent secret\n");
    await symlink(path.join(outside, "secret.txt"), path.join(root, "link.txt"));
  });

  afterAll(async () => {
    await rm(outside, { recursive: true, force: true });
  });

  it("대소문자 무시로 줄·열·미리보기를 준다", async () => {
    const result = await searchFiles(root, req("agent"));
    expect(result.matches).toEqual([
      { path: "README.md", line: 2, column: 1, preview: "Agent Development Environment" },
      { path: "README.md", line: 3, column: 1, preview: "agent again" },
      { path: "src/main.ts", line: 1, column: 14, preview: "export const agent = 1;" },
      { path: "src/main.ts", line: 2, column: 12, preview: "const x = 'Agent';" },
    ]);
    expect(result.truncated).toBe(false);
  });

  it("node_modules·바이너리·심링크는 읽지 않는다", async () => {
    const result = await searchFiles(root, req("agent"));
    expect(
      result.matches.some((m) => m.path.includes("node_modules") || m.path === "bin.dat" || m.path === "link.txt"),
    ).toBe(false);
    expect(result.filesScanned).toBe(2);
  });

  it("대소문자 구분과 정규식", async () => {
    expect((await searchFiles(root, req("Agent", { caseSensitive: true }))).matches.map((m) => m.line)).toEqual([2, 2]);
    expect((await searchFiles(root, req("ag.nt ag", { regex: true }))).matches.map((m) => m.path)).toEqual([
      "README.md",
    ]);
  });

  it("maxResults에 걸리면 truncated", async () => {
    const result = await searchFiles(root, req("agent", { maxResults: 2 }));
    expect(result.matches).toHaveLength(2);
    expect(result.truncated).toBe(true);
  });

  it("경로를 좁힐 수 있고 루트 밖은 빈 결과다", async () => {
    expect((await searchFiles(root, req("agent", { path: "src" }))).matches.map((m) => m.path)).toEqual([
      "src/main.ts",
      "src/main.ts",
    ]);
    expect((await searchFiles(root, req("agent", { path: "../" }))).matches).toEqual([]);
  });

  it("리터럴 검색은 정규식 문자를 이스케이프한다", async () => {
    expect(compilePattern({ query: "a.b", regex: false, caseSensitive: true }).test("axb")).toBe(false);
    expect(compilePattern({ query: "a.b", regex: true, caseSensitive: true }).test("axb")).toBe(true);
  });
});
