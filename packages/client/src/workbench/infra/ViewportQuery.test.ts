import { describe, expect, it } from "vitest";
import { createViewportQuery } from "./ViewportQuery";

describe("createViewportQuery", () => {
  it("jsdom의 matchMedia 스텁은 항상 불일치 — 좁지 않다", () => {
    expect(createViewportQuery().isNarrow).toBe(false);
  });
});
