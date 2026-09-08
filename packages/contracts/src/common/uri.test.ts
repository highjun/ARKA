import { describe, expect, it } from "vitest";
import { URI } from "./uri";

describe("URI", () => {
  describe("file()", () => {
    it("절대 경로로 file URI를 만든다", () => {
      const uri = URI.file("/workspace/a.txt");
      expect(uri.scheme).toBe("file");
      expect(uri.path).toBe("/workspace/a.txt");
    });

    it("선행 슬래시가 없으면 붙인다", () => {
      expect(URI.file("workspace/a.txt").path).toBe("/workspace/a.txt");
    });
  });

  describe("parse()", () => {
    it("scheme과 path로 나눈다", () => {
      const uri = URI.parse("file:///workspace/a.txt");
      expect(uri.scheme).toBe("file");
      expect(uri.path).toBe("/workspace/a.txt");
    });

    it("쿼리가 있으면 던진다", () => {
      expect(() => URI.parse("file:///workspace/a.txt?x=1")).toThrow();
    });

    it("프래그먼트가 있으면 던진다", () => {
      expect(() => URI.parse("file:///workspace/a.txt#top")).toThrow();
    });

    it("scheme 구분자가 없으면 던진다", () => {
      expect(() => URI.parse("/workspace/a.txt")).toThrow();
    });

    it("authority가 비어 있지 않으면 던진다", () => {
      expect(() => URI.parse("file://host/workspace/a.txt")).toThrow();
    });
  });

  describe("toString()", () => {
    it("parse한 값을 원본으로 되돌린다", () => {
      const raw = "file:///workspace/a.txt";
      expect(URI.parse(raw).toString()).toBe(raw);
    });
  });
});
