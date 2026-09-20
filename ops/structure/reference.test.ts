import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { MARKDOWN, REPO_ROOT, read } from "./repo.ts";

const linksOf = (markdown: string): string[] =>
  [...markdown.matchAll(/\[[^\]]*\]\((?<target>[^)]+)\)/gu)]
    .map((match) => match.groups?.["target"] ?? "")
    .filter((target) => !/^(?:https?:|mailto:|#)/u.test(target) && /^[\w./#-]+$/u.test(target));

describe("문서의 상대 링크가 실재한다", () => {
  it("링크를 하나라도 찾는다 — 정규식이 낡으면 이 검사가 조용히 빈다", () => {
    expect(MARKDOWN.flatMap((file) => linksOf(read(file))).length).toBeGreaterThan(2);
  });

  it.each(MARKDOWN)("%s — 상대 링크가 가리키는 파일이 있다", (file) => {
    const dead = linksOf(read(file)).filter((target) => {
      const resolved = path.resolve(path.dirname(path.join(REPO_ROOT, file)), target.split("#")[0] ?? "");
      return !existsSync(resolved);
    });

    expect(dead).toEqual([]);
  });
});
