import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { MARKDOWN, REPO_ROOT, read } from "./repo.ts";

/** `[글]( 대상 )`의 대상. 바깥 URL과 앵커만 있는 것은 뺀다 — 네트워크를 때리지 않는다. */
const linksOf = (markdown: string): string[] =>
  [...markdown.matchAll(/\[[^\]]*\]\((?<target>[^)]+)\)/gu)]
    .map((match) => match.groups?.["target"] ?? "")
    // 바깥 URL·앵커는 네트워크를 때리므로 뺀다. 규약이 형식을 보이는 자리(`(경로)`)도 링크가
    // 아니라 본보기라 뺀다 — 실제 경로는 ASCII다.
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
