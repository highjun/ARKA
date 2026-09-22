import ts from "typescript";

type DeclarationKind = "type" | "interface" | "function" | "class" | "const";

export type ContractChange = {
  readonly file: string;
  readonly name: string;
  readonly kind: DeclarationKind;
  readonly change: "added" | "removed" | "changed";
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

const split = (key: string): { kind: DeclarationKind; name: string } => {
  const [kind, ...rest] = key.split(" ");
  return { kind: kind as DeclarationKind, name: rest.join(" ") };
};

export const changesIn = (file: string, before: string, after: string): readonly ContractChange[] => {
  const was = declarations(before);
  const is = declarations(after);
  const changes: ContractChange[] = [];

  for (const [key, text] of was) {
    if (!is.has(key)) changes.push({ file, ...split(key), change: "removed" });
    else if (is.get(key) !== text) changes.push({ file, ...split(key), change: "changed" });
  }
  for (const key of is.keys()) {
    if (!was.has(key)) changes.push({ file, ...split(key), change: "added" });
  }

  return changes;
};
