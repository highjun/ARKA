import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { ADRS, MARKDOWN, REPO_ROOT, SOURCE, TRACKED, read } from "./repo.ts";

const TRACKED_SET = new Set(TRACKED);

/** `[글]( 대상 )`의 대상. 바깥 URL과 앵커만 있는 것은 뺀다 — 네트워크를 때리지 않는다. */
const linksOf = (markdown: string): string[] =>
  [...markdown.matchAll(/\[[^\]]*\]\((?<target>[^)]+)\)/gu)]
    .map((match) => match.groups?.["target"] ?? "")
    // 바깥 URL·앵커는 네트워크를 때리므로 뺀다. 규약이 형식을 보이는 자리(`(경로)`)도 링크가
    // 아니라 본보기라 뺀다 — 실제 경로는 ASCII다.
    .filter((target) => !/^(?:https?:|mailto:|#)/u.test(target) && /^[\w./#-]+$/u.test(target));

/** 네 자리 ADR 번호 → 그 번호의 ADR 파일. */
const ADR_BY_NUMBER = new Map(ADRS.map((file) => [/(?<number>\d{4})/u.exec(path.basename(file))?.[1] ?? "", file]));

describe("문서의 상대 링크가 실재한다", () => {
  it("링크를 하나라도 찾는다 — 정규식이 낡으면 이 검사가 조용히 빈다", () => {
    expect(MARKDOWN.flatMap((file) => linksOf(read(file))).length).toBeGreaterThan(20);
  });

  it.each(MARKDOWN)("%s", (file) => {
    const dead = linksOf(read(file)).filter((target) => {
      const resolved = path.resolve(path.dirname(path.join(REPO_ROOT, file)), target.split("#")[0] ?? "");
      return !existsSync(resolved);
    });

    expect(dead).toEqual([]);
  });
});

/**
 * **코드 주석의 `(→ ADR NNNN)`은 마크다운 도구가 못 본다.** 인용이 죽은 자리가 실제로 거기였다
 * (2026-09-14에 `docs/components.md`를 가리키는 주석이 남아 있는 것을 발견했다).
 */
describe("코드가 인용한 ADR이 실재한다", () => {
  const cited = (text: string) => [...text.matchAll(/→\s*ADR\s*(?<number>\d{4})/gu)].map((m) => m.groups?.["number"] ?? "");

  it("인용을 하나라도 찾는다", () => {
    expect(SOURCE.flatMap((file) => cited(read(file))).length).toBeGreaterThan(10);
  });

  it.each(SOURCE.filter((file) => cited(read(file)).length > 0))("%s", (file) => {
    const missing = cited(read(file)).filter((number) => !ADR_BY_NUMBER.has(number));

    expect(missing).toEqual([]);
  });

  it("마크다운의 `→ [ADR NNNN](경로)`도 번호와 경로가 맞는다", () => {
    const wrong: string[] = [];
    for (const file of MARKDOWN) {
      for (const match of read(file).matchAll(/\[ADR (?<number>\d{4})\]\((?<target>[^)]+)\)/gu)) {
        const { number = "", target = "" } = match.groups ?? {};
        const expected = ADR_BY_NUMBER.get(number);
        const resolved = path.relative(REPO_ROOT, path.resolve(path.dirname(path.join(REPO_ROOT, file)), target));
        if (expected !== resolved) wrong.push(`${file}: ADR ${number} → ${target}`);
      }
    }

    expect(wrong).toEqual([]);
  });
});

describe("인용한 태스크가 실재한다", () => {
  it.each([...MARKDOWN, ...SOURCE])("%s", (file) => {
    const missing = [...read(file).matchAll(/TASK-(?<number>\d+)/gu)]
      .map((match) => match.groups?.["number"] ?? "")
      .filter((number) => !TRACKED_SET.has(`docs/tasks/${number.padStart(4, "0")}.md`));

    expect(missing).toEqual([]);
  });
});
