import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(import.meta.dirname, "../src");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const FILES = walk(SRC).map((file) => path.relative(SRC, file));

const MARKERS = ["component/", "shared/ui/"];

const folderOf = (file: string): string | null => {
  const marker = MARKERS.find((m) => file.includes(m));
  if (marker === undefined) return null;
  const at = file.indexOf(marker);
  const name = file.slice(at + marker.length).split("/")[0] ?? "";
  return name === "" || name.includes(".") ? null : `${file.slice(0, at + marker.length)}${name}`;
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

  it("컴포넌트 폴더 밖에는 `component/`·`shared/ui/` 배럴이 없다 — 경로로 가져온다", () => {
    const groupBarrels = FILES.filter((file) => /(?:^|\/)(?:components?|shared\/ui)\/index\.ts$/u.test(file));

    expect(groupBarrels).toEqual([]);
  });
});

const EXTENSIONS = path.join(SRC, "extensions");
const WORKBENCH = path.join(SRC, "workbench");

const foldersIn = (dir: string): string[] =>
  readdirSync(dir).filter((entry) => statSync(path.join(dir, entry)).isDirectory());
const filesIn = (dir: string): string[] => readdirSync(dir).filter((entry) => statSync(path.join(dir, entry)).isFile());

const SLICE_LAYERS = new Set(["model", "infra", "viewmodel", "view", "component", "contrib", "data"]);
const WORKBENCH_LAYERS = new Set([...SLICE_LAYERS, "api", "row"]);
const CONTRIBUTION = /^[a-z][a-zA-Z0-9]*\.contribution(?:\.test)?\.tsx$/u;

const valueExports = (file: string): string[] => {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const exported = (node: ts.Node): boolean =>
    ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

  return source.statements.flatMap((statement) => {
    if (ts.isVariableStatement(statement) && exported(statement))
      return statement.declarationList.declarations.map((d) => d.name.getText(source));
    if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && exported(statement))
      return [statement.name?.text ?? "default"];
    if (ts.isExportAssignment(statement)) return ["default"];
    if (ts.isExportDeclaration(statement) && !statement.isTypeOnly) {
      const bindings = statement.exportClause;
      if (bindings === undefined) return ["*"];
      if (ts.isNamedExports(bindings)) return bindings.elements.filter((e) => !e.isTypeOnly).map((e) => e.name.text);
      return [bindings.name.text];
    }
    return [];
  });
};

/** 확장 배럴의 `export const <slice> = { id, dependsOn, … }`에서 id와 dependsOn을 읽는다. */
const moduleOf = (slice: string): { readonly id?: string; readonly dependsOn: readonly string[] } => {
  const file = path.join(EXTENSIONS, slice, "index.ts");
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const literal = source.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => statement.declarationList.declarations)
    .find((d) => ts.isIdentifier(d.name) && d.name.text === slice)?.initializer;
  if (literal === undefined || !ts.isObjectLiteralExpression(literal)) return { dependsOn: [] };

  const prop = (name: string): ts.Expression | undefined =>
    literal.properties.filter(ts.isPropertyAssignment).find((p) => ts.isIdentifier(p.name) && p.name.text === name)
      ?.initializer;
  const id = prop("id");
  const dependsOn = prop("dependsOn");
  return {
    id: id !== undefined && ts.isStringLiteral(id) ? id.text : undefined,
    dependsOn:
      dependsOn !== undefined && ts.isArrayLiteralExpression(dependsOn)
        ? dependsOn.elements.filter(ts.isStringLiteral).map((e) => e.text)
        : [],
  };
};

const importedExtensions = (slice: string): string[] => [
  ...new Set(
    FILES.filter((file) => file.startsWith(`extensions/${slice}/`)).flatMap((file) =>
      [...readFileSync(path.join(SRC, file), "utf8").matchAll(/"#extensions\/([^"/]+)"/gu)].map((m) => m[1] ?? ""),
    ),
  ),
];

describe("확장 슬라이스 구조", () => {
  const slices = foldersIn(EXTENSIONS);

  it("확장을 하나라도 찾는다 — 배치가 바뀌면 이 스위트가 조용히 비어 버린다", () => {
    expect(slices.length).toBeGreaterThan(0);
  });

  it("확장마다 배럴이 있다 — app/과 다른 확장이 보는 자리는 `index.ts` 하나다", () => {
    expect(slices.filter((slice) => !FILES.includes(`extensions/${slice}/index.ts`))).toEqual([]);
  });

  it("확장 안의 폴더는 정해진 계층뿐이다", () => {
    const unknown = slices.flatMap((slice) =>
      foldersIn(path.join(EXTENSIONS, slice))
        .filter((layer) => !SLICE_LAYERS.has(layer))
        .map((layer) => `${slice}/${layer}`),
    );

    expect(unknown).toEqual([]);
  });

  it("확장 뿌리에는 배럴과 `*.contribution.tsx`만 있다", () => {
    const stray = slices.flatMap((slice) =>
      filesIn(path.join(EXTENSIONS, slice))
        .filter((file) => file !== "index.ts" && !CONTRIBUTION.test(file))
        .map((file) => `${slice}/${file}`),
    );

    expect(stray).toEqual([]);
  });

  it("빈 계층 폴더를 미리 만들지 않는다", () => {
    const empty = slices.flatMap((slice) =>
      foldersIn(path.join(EXTENSIONS, slice))
        .filter((layer) => readdirSync(path.join(EXTENSIONS, slice, layer)).length === 0)
        .map((layer) => `${slice}/${layer}`),
    );

    expect(empty).toEqual([]);
  });

  it("배럴의 값 export는 폴더 이름과 같은 ExtensionModule 하나다 — 나머지는 타입이다", () => {
    const wrong = slices
      .map((slice) => ({ slice, values: valueExports(path.join(EXTENSIONS, slice, "index.ts")) }))
      .filter(({ slice, values }) => values.length !== 1 || values[0] !== slice);

    expect(wrong).toEqual([]);
  });

  it("확장 id는 `arka.<폴더>`다 — 토큰·명령 이름의 접두가 폴더에서 바로 읽힌다", () => {
    const wrong = slices.filter((slice) => moduleOf(slice).id !== `arka.${slice}`);

    expect(wrong).toEqual([]);
  });

  it("다른 확장의 타입을 가져오면 `dependsOn`에 그 확장이 있다 — 켜는 순서가 거기서 나온다", () => {
    const undeclared = slices.flatMap((slice) => {
      const declared = new Set(moduleOf(slice).dependsOn);
      return importedExtensions(slice)
        .filter((other) => !declared.has(`arka.${other}`))
        .map((other) => `${slice} → ${other}`);
    });

    expect(undeclared).toEqual([]);
  });

  it("확장 폴더는 전부 `app/extensions.ts`에 올라 있다 — 목록은 손으로 쓰되 빠뜨리면 여기서 걸린다", () => {
    const listed = [...readFileSync(path.join(SRC, "app/extensions.ts"), "utf8").matchAll(/"#extensions\/([^"]+)"/gu)]
      .map((m) => m[1])
      .sort();

    expect(listed).toEqual([...slices].sort());
  });
});

describe("workbench 구조", () => {
  it("workbench 안의 폴더는 정해진 계층뿐이다 — api/는 확장이 보는 계약 자리다", () => {
    expect(foldersIn(WORKBENCH).filter((layer) => !WORKBENCH_LAYERS.has(layer))).toEqual([]);
  });

  it("workbench 뿌리에는 배럴·모듈·`*.contribution.tsx`만 있다", () => {
    expect(
      filesIn(WORKBENCH).filter(
        (file) => file !== "index.ts" && file !== "workbenchModule.tsx" && !CONTRIBUTION.test(file),
      ),
    ).toEqual([]);
  });

  it("배럴은 api/만 재수출한다", () => {
    const source = readFileSync(path.join(WORKBENCH, "index.ts"), "utf8");
    const from = [...source.matchAll(/from "([^"]+)"/gu)].map((m) => m[1]);

    expect(from.length).toBeGreaterThan(0);
    expect(from.filter((p) => !p?.startsWith("./api/"))).toEqual([]);
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
