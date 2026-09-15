import { describe, expect, it } from "vitest";
import { chosen } from "./check.ts";

/**
 * **고르는 판정만 본다.** 단계가 실제로 무엇을 부르는지는 돌려 봐야 알고, 그건 `check` 자신이
 * 매 라운드 증명한다. 여기서 막을 것은 **오타가 검사를 조용히 0개로 만드는 것**이다.
 */
const NAMES = ["typecheck", "lint", "test:unit"] as const;

describe("chosen", () => {
  it("인자가 없으면 선언 순서대로 전부다", () => {
    expect(chosen([], NAMES)).toEqual(NAMES);
  });

  it("고른 것만, 준 순서대로 돌린다", () => {
    expect(chosen(["lint", "typecheck"], NAMES)).toEqual(["lint", "typecheck"]);
  });

  it("모르는 이름은 던진다 — 조용히 넘기면 검사가 0개인데 초록이 된다", () => {
    expect(() => chosen(["typechek"], NAMES)).toThrow(/모르는 단계: typechek/u);
  });
});
