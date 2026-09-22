import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(import.meta.dirname, "../src");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const FILES = walk(SRC).map((file) => path.relative(SRC, file));

const COMPONENT = /(?:^|\/)(?:shared\/component|[^/]+\/component)\/(?<name>[A-Z][A-Za-z0-9]*)\/\k<name>\.tsx$/u;

describe("컴포넌트 폴더 구조", () => {
  const components = FILES.filter((file) => COMPONENT.test(file));

  it("컴포넌트를 하나라도 찾는다 — 정규식이 낡으면 이 테스트가 조용히 비어 버린다", () => {
    expect(components.length).toBeGreaterThan(0);
  });

  it("컴포넌트마다 스토리가 있다", () => {
    const missing = components.filter((file) => !FILES.includes(file.replace(/\.tsx$/u, ".stories.tsx")));

    expect(missing).toEqual([]);
  });

  it("컴포넌트마다 테스트가 있다", () => {
    const missing = components.filter((file) => !FILES.includes(file.replace(/\.tsx$/u, ".test.tsx")));

    expect(missing).toEqual([]);
  });

  it("컴포넌트마다 배럴이 있다 — 밖에서 부르는 자리는 `index.ts` 하나다", () => {
    const missing = components.filter((file) => !FILES.includes(path.join(path.dirname(file), "index.ts")));

    expect(missing).toEqual([]);
  });

  it("`component/` 바로 아래 폴더는 PascalCase이고 같은 이름의 `.tsx`를 갖는다", () => {
    const folders = new Set(
      FILES.filter((file) => /(?:^|\/)component\//u.test(file)).map((file) => {
        const after = file.split("component/")[1] ?? "";
        return `${file.slice(0, file.length - after.length)}${after.split("/")[0] ?? ""}`;
      }),
    );
    const wrong = [...folders].filter((folder) => {
      const name = folder.split("/").at(-1) ?? "";
      return !/^[A-Z][A-Za-z0-9]*$/u.test(name) || !FILES.includes(`${folder}/${name}.tsx`);
    });

    expect(wrong).toEqual([]);
  });

  it("컴포넌트 폴더 밖에는 `component/` 배럴이 없다 — 경로로 가져온다", () => {
    const groupBarrels = FILES.filter((file) => /(?:^|\/)components?\/index\.ts$/u.test(file));

    expect(groupBarrels).toEqual([]);
  });
});

const ROW_TYPES = [
  "TabRow",
  "PaneRowLeaf",
  "PaneRowSplit",
  "PaneRowNode",
  "SplitEdge",
  "TabContextTarget",
  "TabContentProps",
  "PaneId",
  "SplitOrientation",
  "SidebarRow",
  "SidebarActionRow",
  "BottomRow",
  "CommandRow",
] as const;

const declares = (file: string, name: string): boolean =>
  new RegExp(String.raw`^export (?:interface|type) ${name}\b`, "mu").test(readFileSync(path.join(SRC, file), "utf8"));

describe("행 타입은 한 곳에서만 선언한다", () => {
  const sources = FILES.filter((file) => /\.tsx?$/u.test(file) && !/\.(?:test|stories)\.tsx?$/u.test(file));

  it("소스를 하나라도 찾는다 — 목록이 비면 아래 검사가 조용히 통과한다", () => {
    expect(sources.length).toBeGreaterThan(0);
  });

  it.each(ROW_TYPES)("`%s`는 `row/` 밖에서 선언되지 않는다", (name) => {
    const outside = sources.filter((file) => !file.includes(`${path.sep}row${path.sep}`) && declares(file, name));

    expect(outside).toEqual([]);
  });
});
