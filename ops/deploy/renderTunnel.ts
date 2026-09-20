import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const TEMPLATE = path.resolve(import.meta.dirname, "tunnel.template.yml");

const PLACEHOLDER = /\$\{(?<name>[A-Z_]+)\}/gu;

export const missingNames = (
  template: string,
  values: Readonly<Record<string, string | undefined>>,
): readonly string[] =>
  [...new Set([...template.matchAll(PLACEHOLDER)].map((match) => match.groups?.["name"] ?? ""))].filter(
    (name) => (values[name] ?? "") === "",
  );

export const render = (template: string, values: Readonly<Record<string, string | undefined>>): string => {
  const missing = missingNames(template, values);
  if (missing.length > 0) throw new Error(`값이 없습니다: ${missing.join(", ")}`);
  return template.replaceAll(PLACEHOLDER, (_, name: string) => values[name] ?? "");
};

if (process.argv[1] === import.meta.filename) {
  const out = process.argv[2];
  if (out === undefined || out === "") throw new Error("쓸 자리가 필요합니다 — renderTunnel.ts <경로>");
  writeFileSync(out, render(readFileSync(TEMPLATE, "utf8"), process.env), { mode: 0o600 });
  console.error(`[터널] ${out}에 썼습니다.`);
}
