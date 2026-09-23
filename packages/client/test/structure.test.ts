import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(import.meta.dirname, "../src");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const FILES = walk(SRC).map((file) => path.relative(SRC, file));

const MARKER = "component/";

const folderOf = (file: string): string | null => {
  const at = file.indexOf(MARKER);
  if (at < 0) return null;
  const name = file.slice(at + MARKER.length).split("/")[0] ?? "";
  return name === "" || name.includes(".") ? null : `${file.slice(0, at + MARKER.length)}${name}`;
};

const nameOf = (folder: string): string => folder.split("/").at(-1) ?? "";

describe("컴포넌트 폴더 구조", () => {
  const folders = [...new Set(FILES.map(folderOf).filter((folder) => folder !== null))];

  it("컴포넌트 폴더를 하나라도 찾는다 — 경로 규칙이 낡으면 이 테스트가 조용히 비어 버린다", () => {
    expect(folders.length).toBeGreaterThan(0);
  });

  it("폴더 이름은 PascalCase다", () => {
    expect(folders.filter((folder) => !/^[A-Z][A-Za-z0-9]*$/u.test(nameOf(folder)))).toEqual([]);
  });

  it("뿌리가 있다 — `<이름>.tsx`거나, 조립을 배럴이 맡는 폴더는 `Root.tsx`", () => {
    const missing = folders.filter(
      (folder) => !FILES.includes(`${folder}/${nameOf(folder)}.tsx`) && !FILES.includes(`${folder}/Root.tsx`),
    );

    expect(missing).toEqual([]);
  });

  it("컴포넌트마다 스토리가 있다", () => {
    const missing = folders.filter((folder) => !FILES.includes(`${folder}/${nameOf(folder)}.stories.tsx`));

    expect(missing).toEqual([]);
  });

  it("컴포넌트마다 테스트가 있다", () => {
    const missing = folders.filter((folder) => !FILES.includes(`${folder}/${nameOf(folder)}.test.tsx`));

    expect(missing).toEqual([]);
  });

  it("컴포넌트마다 배럴이 있다 — 밖에서 부르는 자리는 `index.ts` 하나다", () => {
    const missing = folders.filter((folder) => !FILES.includes(`${folder}/index.ts`));

    expect(missing).toEqual([]);
  });

  it("컴포넌트 폴더 밖에는 `component/` 배럴이 없다 — 경로로 가져온다", () => {
    const groupBarrels = FILES.filter((file) => /(?:^|\/)components?\/index\.ts$/u.test(file));

    expect(groupBarrels).toEqual([]);
  });
});
