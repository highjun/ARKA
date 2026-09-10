import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * `docs/tasks/`의 할 일을 세는 최소 도구. **목록을 유지하지 않고 생성한다** — 이 저장소가
 * 되풀이해 겪은 병(유지하는 목록이 낡는다)의 해독제라서 도구를 두는 것이지, 도구 자체가
 * 목적이 아니다. 파일은 그냥 YAML 머리말이 붙은 마크다운이라 `grep`으로도 다 된다.
 */
const DIR = path.resolve(import.meta.dirname, "../../docs/tasks");
const STATUSES = ["To Do", "In Progress", "Done"] as const;

type Task = { readonly num: number; readonly title: string; readonly status: string; readonly priority: string; readonly labels: readonly string[] };

const field = (fm: string, key: string): string => new RegExp(`^${key}: *(.*)$`, "m").exec(fm)?.[1]?.trim() ?? "";

const readAll = (): Task[] =>
  readdirSync(DIR)
    .filter((f) => /^\d{4}\.md$/u.test(f))
    .map((f) => {
      const fm = /^---\n([\s\S]*?)\n---/u.exec(readFileSync(path.join(DIR, f), "utf8"))?.[1] ?? "";
      return {
        num: Number(f.slice(0, 4)),
        title: field(fm, "title"),
        status: field(fm, "status"),
        priority: field(fm, "priority"),
        labels: (/^labels: *\[(.*)\]$/mu.exec(fm)?.[1] ?? "").split(",").map((l) => l.trim()).filter(Boolean),
      };
    })
    .sort((a, b) => a.num - b.num);

const list = (only?: string): void => {
  const all = readAll();
  for (const status of STATUSES) {
    if (only !== undefined && status.toLowerCase() !== only.toLowerCase()) continue;
    const rows = all.filter((t) => t.status === status);
    if (rows.length === 0) continue;
    process.stdout.write(`\n${status} (${String(rows.length)})\n`);
    for (const t of rows) {
      const tag = t.priority === "" ? "" : `[${t.priority.toUpperCase()}] `;
      const labels = t.labels.length === 0 ? "" : `  (${t.labels.join(" ")})`;
      process.stdout.write(`  ${String(t.num).padStart(4, "0")}  ${tag}${t.title}${labels}\n`);
    }
  }
};

const create = (title: string, options: Readonly<Record<string, string>>): void => {
  if (title === "") throw new Error("task create <title> — 제목이 필요합니다");
  const num = Math.max(0, ...readAll().map((t) => t.num)) + 1;
  const today = new Date().toISOString().slice(0, 10);
  const head = [`id: TASK-${String(num)}`, `title: ${title}`, "status: To Do"];
  if (options["priority"] !== undefined) head.push(`priority: ${options["priority"]}`);
  if (options["labels"] !== undefined) head.push(`labels: [${options["labels"].split(",").map((l) => l.trim()).join(", ")}]`);
  head.push(`created: ${today}`);
  const body = `## 설명\n\n${options["description"] ?? "<무엇을·왜>"}\n\n## 인수 조건\n\n- [ ] <검증 가능한 것>\n`;
  const file = path.join(DIR, `${String(num).padStart(4, "0")}.md`);
  writeFileSync(file, `---\n${head.join("\n")}\n---\n\n${body}`);
  process.stdout.write(`${path.relative(process.cwd(), file)}\n`);
};

const [command = "list", ...rest] = process.argv.slice(2);
const positional = rest.filter((a) => !a.startsWith("--"));
const options = Object.fromEntries(
  rest.filter((a) => a.startsWith("--")).map((a) => { const [k, ...v] = a.slice(2).split("="); return [k ?? "", v.join("=")]; }),
);

if (command === "list") list(options["status"]);
else if (command === "create") create(positional.join(" "), options);
else throw new Error(`모르는 명령: ${command} — list | create`);
