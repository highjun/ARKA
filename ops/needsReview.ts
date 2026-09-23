import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const CONTRACTS = "packages/contracts/src/";
const SNAPSHOT = /^packages\/client\/src\/.+\/snapshots\/(?<story>[^/]+)\.png$/u;

export type DeclarationKind = "type" | "interface" | "function" | "class" | "const";

export type ContractChange = {
  readonly file: string;
  readonly name: string;
  readonly kind: DeclarationKind;
  readonly change: "added" | "removed" | "changed";
};

export type OutsideChange = {
  readonly path: string;
  readonly status: "added" | "modified" | "removed" | "renamed";
};

export type UiChange = {
  readonly story: string;
  readonly change: "added" | "removed" | "changed";
};

export type Review = {
  readonly contracts: readonly ContractChange[];
  readonly outside: readonly OutsideChange[];
  readonly ui: readonly UiChange[];
};

const STATUS: Readonly<Record<string, OutsideChange["status"]>> = {
  A: "added",
  M: "modified",
  D: "removed",
  R: "renamed",
};

const git = (...args: readonly string[]): { status: number; stdout: string } => {
  const { status, stdout } = spawnSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { status: status ?? 1, stdout };
};

export const changedFiles = (base: string, head: string): readonly OutsideChange[] => {
  const { stdout } = git("diff", "--name-status", "--find-renames", `${base}...${head}`);
  return stdout
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => {
      const fields = line.split("\t");
      const code = fields[0]?.[0] ?? "M";
      return { path: fields.at(-1) ?? "", status: STATUS[code] ?? "modified" };
    });
};

const printer = ts.createPrinter({ removeComments: true });

const normalize = (text: string): string =>
  text
    .replace(/\s+/gu, " ")
    .replace(/\s*([(){}[\],;:<>.|&=?])\s*/gu, "$1")
    .replace(/,([)\]}])/gu, "$1")
    .replace(/=[|&]/gu, "=")
    .trim();

const isExported = (node: ts.Node): boolean =>
  ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

const declared = (node: ts.Statement): { kind: DeclarationKind; name: string } | null => {
  if (ts.isTypeAliasDeclaration(node)) return { kind: "type", name: node.name.text };
  if (ts.isInterfaceDeclaration(node)) return { kind: "interface", name: node.name.text };
  if (ts.isFunctionDeclaration(node) && node.name !== undefined) return { kind: "function", name: node.name.text };
  if (ts.isClassDeclaration(node) && node.name !== undefined) return { kind: "class", name: node.name.text };
  return null;
};

export const declarations = (source: string): ReadonlyMap<string, string> => {
  const file = ts.createSourceFile("contract.ts", source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const found = new Map<string, string>();

  for (const statement of file.statements) {
    if (!isExported(statement)) continue;

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) continue;
        found.set(
          `const ${declaration.name.text}`,
          normalize(printer.printNode(ts.EmitHint.Unspecified, declaration, file)),
        );
      }
      continue;
    }

    const named = declared(statement);
    if (named === null) continue;
    found.set(`${named.kind} ${named.name}`, normalize(printer.printNode(ts.EmitHint.Unspecified, statement, file)));
  }

  return found;
};

const at = (rev: string, file: string): string => {
  const { status, stdout } = git("show", `${rev}:${file}`);
  return status === 0 ? stdout : "";
};

const isContractSource = (file: string): boolean =>
  file.startsWith(CONTRACTS) && file.endsWith(".ts") && !file.endsWith(".test.ts");

export const review = (base: string, head: string): Review => {
  const changed = changedFiles(base, head);
  const contracts: ContractChange[] = [];

  for (const { path: file } of changed) {
    if (!isContractSource(file)) continue;

    const before = declarations(at(base, file));
    const after = declarations(at(head, file));

    for (const [key, text] of before) {
      const [kind, ...rest] = key.split(" ");
      const entry = { file: file.slice(CONTRACTS.length), name: rest.join(" "), kind: kind as DeclarationKind };
      if (!after.has(key)) contracts.push({ ...entry, change: "removed" });
      else if (after.get(key) !== text) contracts.push({ ...entry, change: "changed" });
    }
    for (const key of after.keys()) {
      if (before.has(key)) continue;
      const [kind, ...rest] = key.split(" ");
      contracts.push({
        file: file.slice(CONTRACTS.length),
        name: rest.join(" "),
        kind: kind as DeclarationKind,
        change: "added",
      });
    }
  }

  const ui = changed
    .map(({ path: file, status }) => ({ story: SNAPSHOT.exec(file)?.groups?.["story"], status }))
    .filter((c): c is { story: string; status: OutsideChange["status"] } => c.story !== undefined)
    .map(({ story, status }) => ({
      story,
      change:
        status === "added" ? ("added" as const) : status === "removed" ? ("removed" as const) : ("changed" as const),
    }));

  return { contracts, outside: changed.filter((c) => !c.path.startsWith("packages/")), ui };
};

export const isClean = (found: Review): boolean =>
  found.contracts.length === 0 && found.outside.length === 0 && found.ui.length === 0;

const CHANGE_WORD: Readonly<Record<ContractChange["change"], string>> = {
  added: "생김",
  removed: "없어짐",
  changed: "바뀜",
};

const STATUS_WORD: Readonly<Record<OutsideChange["status"], string>> = {
  added: "생김",
  modified: "고침",
  removed: "지움",
  renamed: "옮김",
};

export const render = (found: Review, extra = ""): string => {
  if (isClean(found) && extra.trim() === "") return "";

  const lines = ["## 사용자 검토가 필요합니다", ""];

  if (found.contracts.length > 0) {
    lines.push(`### 계약 ${String(found.contracts.length)}건`, "");
    for (const c of found.contracts) {
      lines.push(`- \`${c.file}\` · \`${c.name}\` (${c.kind}) — ${CHANGE_WORD[c.change]}`);
    }
    lines.push("");
  }

  if (found.outside.length > 0) {
    lines.push(`### \`packages/\` 밖 ${String(found.outside.length)}건`, "");
    for (const o of found.outside) {
      lines.push(`- \`${o.path}\` — ${STATUS_WORD[o.status]}`);
    }
    lines.push("");
  }

  if (found.ui.length > 0) {
    lines.push(`### UI ${String(found.ui.length)}건`, "");
    for (const u of found.ui) {
      lines.push(`- \`${u.story}\` — ${CHANGE_WORD[u.change]}`);
    }
    lines.push("");
  }

  if (extra.trim() !== "") lines.push(extra.trim(), "");

  lines.push("`/review-pr`로 내용을 보고, `/approve-pr`이나 `/reject-pr`로 정합니다.");
  return lines.join("\n");
};

if (process.argv[1] === import.meta.filename) {
  const [base, head, extraPath] = process.argv.slice(2);
  if (base === undefined || head === undefined) {
    console.error("쓰임: node ops/needsReview.ts <base> <head> [곁들일 마크다운 파일]");
    process.exit(2);
  }
  const extra = extraPath !== undefined && existsSync(extraPath) ? readFileSync(extraPath, "utf8") : "";
  process.stdout.write(render(review(base, head), extra));
}
