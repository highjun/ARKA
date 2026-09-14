import { describe, expect, it } from "vitest";
import { fileExtensionOf, getKeymapForExtension } from "./shared";

describe("fileExtensionOf", () => {
  it("경로 끝의 확장자를 소문자로 뽑는다", () => {
    expect(fileExtensionOf("a/b/README.MD")).toBe("md");
    expect(fileExtensionOf("a.ts")).toBe("ts");
  });

  it("확장자가 없으면 undefined", () => {
    expect(fileExtensionOf("LICENSE")).toBeUndefined();
  });

  it("점으로 시작하는 이름은 확장자로 치지 않는다", () => {
    expect(fileExtensionOf(".gitignore")).toBeUndefined();
  });
});

describe("getKeymapForExtension", () => {
  it("확장자 유무와 무관하게 접기/펼치기 단축키(base)는 항상 있다", () => {
    expect(getKeymapForExtension("md").length).toBeGreaterThan(0);
    expect(getKeymapForExtension(undefined).length).toBeGreaterThan(0);
  });

  it("등록되지 않은 확장자는 base만 돌려준다", () => {
    expect(getKeymapForExtension("md")).toEqual(getKeymapForExtension("rs"));
  });
});
