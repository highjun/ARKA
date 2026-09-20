import { describe, expect, it } from "vitest";
import { TRACKED, read } from "./repo.ts";

/**
 * **`docs/` 최상위에 둘 것.** 여기 없는 파일을 더하려면 이 목록을 고쳐야 한다 — 중간 문서가
 * 쌓이는 것을 막는 것이 목적이고, 목록을 고치는 것이 리뷰 지점이다.
 */
const DOCS_ROOT = new Set(["CONVENTIONS.md", "concept.md", "operations.md"]);

/** 태스크 frontmatter의 필수 열쇠와 `status`의 어휘. */
const TASK_KEYS = ["id", "title", "status", "created"] as const;
const TASK_STATUS = ["To Do", "In Progress", "Done"] as const;

const TASKS = TRACKED.filter((file) => /^docs\/tasks\/\d{4}\.md$/u.test(file));

/** `---` 사이의 `key: value`. 값은 그대로 둔다. */
const frontmatter = (text: string): Map<string, string> => {
  const body = /^---\n(?<block>[\s\S]*?)\n---/u.exec(text)?.groups?.["block"] ?? "";
  return new Map(
    body.split("\n").flatMap((line) => {
      const match = /^(?<key>[a-z]+):\s*(?<value>.*)$/u.exec(line);
      return match === null ? [] : [[match.groups?.["key"] ?? "", match.groups?.["value"] ?? ""] as [string, string]];
    }),
  );
};

describe("문서의 자리", () => {
  it("`docs/` 최상위가 허용 집합 그대로다", () => {
    const top = TRACKED.filter((file) => /^docs\/[^/]+$/u.test(file)).map((file) => file.slice("docs/".length));

    expect(top.filter((name) => !DOCS_ROOT.has(name))).toEqual([]);
  });

  it("단위 테스트를 떼어내는 `tests/`·던더 폴더가 없다", () => {
    const strays = TRACKED.filter((file) => /(?:^|\/)(?:tests|__[a-z]+__)\//u.test(file));

    expect(strays).toEqual([]);
  });

  it("할 일은 `docs/tasks/NNNN.md` 하나에 하나다", () => {
    const strays = TRACKED.filter((file) => file.startsWith("docs/tasks/") && !/^docs\/tasks\/\d{4}\.md$/u.test(file));

    expect(TASKS.length).toBeGreaterThan(10);
    expect(strays).toEqual([]);
  });
});

describe("태스크 frontmatter", () => {
  it.each(TASKS)("%s — 필수 열쇠가 있고 `id`·`status`가 규약대로다", (file) => {
    const fields = frontmatter(read(file));
    const number = /(?<n>\d{4})\.md$/u.exec(file)?.groups?.["n"] ?? "";

    expect(TASK_KEYS.filter((key) => !fields.has(key))).toEqual([]);
    expect(fields.get("id")).toBe(`TASK-${String(Number(number))}`);
    expect(TASK_STATUS).toContain(fields.get("status"));
    expect(fields.get("title")).not.toBe("");
  });
});
