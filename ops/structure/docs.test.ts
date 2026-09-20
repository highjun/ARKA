import { describe, expect, it } from "vitest";
import { TRACKED } from "./repo.ts";

const DOCS_ROOT = new Set(["concept.md"]);

describe("문서의 자리", () => {
  it("`docs/` 최상위가 허용 집합 그대로다", () => {
    const top = TRACKED.filter((file) => /^docs\/[^/]+$/u.test(file)).map((file) => file.slice("docs/".length));

    expect(top.filter((name) => !DOCS_ROOT.has(name))).toEqual([]);
  });

  it("단위 테스트를 떼어내는 `tests/`·던더 폴더가 없다", () => {
    const strays = TRACKED.filter((file) => /(?:^|\/)(?:tests|__[a-z]+__)\//u.test(file));

    expect(strays).toEqual([]);
  });
});
