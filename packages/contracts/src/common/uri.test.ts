import { describe, expect, it } from "vitest";
import { URI } from "./uri";

describe("URI", () => {
  describe("file()", () => {
    it("authority가 빈 file URI를 만든다", () => {
      const uri = URI.file("workspace/a.txt");
      expect(uri.scheme).toBe("file");
      expect(uri.authority).toBe("");
      expect(uri.path).toBe("workspace/a.txt");
    });

    it("선행 슬래시가 있으면 뗀다", () => {
      expect(URI.file("/workspace/a.txt").path).toBe("workspace/a.txt");
    });
  });

  describe("parse()", () => {
    it("슬래시 세 개는 authority가 빈 것으로 읽는다", () => {
      const uri = URI.parse("file:///workspace/a.txt");
      expect(uri.scheme).toBe("file");
      expect(uri.authority).toBe("");
      expect(uri.path).toBe("workspace/a.txt");
    });

    it("authority가 있으면 path와 나눈다", () => {
      const uri = URI.parse("git://HEAD/main.py");
      expect(uri.scheme).toBe("git");
      expect(uri.authority).toBe("HEAD");
      expect(uri.path).toBe("main.py");
    });

    it("workspace 루트 자체를 빈 path로 파싱한다", () => {
      expect(URI.parse("file:///").path).toBe("");
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

    it("path 슬래시가 없으면 던진다", () => {
      expect(() => URI.parse("git://HEAD")).toThrow();
    });
  });

  describe("toString()", () => {
    it("authority가 빈 값을 원본으로 되돌린다", () => {
      const raw = "file:///workspace/a.txt";
      expect(URI.parse(raw).toString()).toBe(raw);
    });

    it("authority가 있는 값을 원본으로 되돌린다", () => {
      const raw = "run://abc123/out.log";
      expect(URI.parse(raw).toString()).toBe(raw);
    });

    it("file()로 만든 값은 슬래시 세 개가 된다", () => {
      expect(URI.file("a.txt").toString()).toBe("file:///a.txt");
    });
  });
});
