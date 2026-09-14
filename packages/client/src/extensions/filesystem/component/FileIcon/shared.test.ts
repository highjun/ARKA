import { describe, expect, it } from "vitest";
import { EXTENSION_MAP, FILENAME_MAP, FILE_ICON_MAP, fileIconIdOf } from "./shared";
import { seti } from "./data";

describe("FILE_ICON_MAP", () => {
  it("가리키는 아이콘이 seti.json 에 실제로 존재한다", () => {
    const icons = seti.icons as Record<string, unknown>;
    const missing = Object.entries(FILE_ICON_MAP).filter(([, name]) => {
      const [prefix, icon] = name.split(":");
      return prefix !== "seti" || icons[icon ?? ""] === undefined;
    });

    expect(missing).toEqual([]);
  });
});

describe("EXTENSION_MAP", () => {
  it("가리키는 FileIconId가 FILE_ICON_MAP에 실제로 존재한다", () => {
    const missing = Object.values(EXTENSION_MAP).filter((id) => FILE_ICON_MAP[id] === undefined);

    expect(missing).toEqual([]);
  });
});

describe("FILENAME_MAP", () => {
  it("가리키는 FileIconId가 FILE_ICON_MAP에 실제로 존재한다", () => {
    const missing = Object.values(FILENAME_MAP).filter((id) => FILE_ICON_MAP[id] === undefined);

    expect(missing).toEqual([]);
  });
});

describe("fileIconIdOf", () => {
  it("확장자로 매핑한다", () => {
    expect(fileIconIdOf("main.ts")).toBe("fileTypeTs");
    expect(fileIconIdOf("report.pdf")).toBe("fileTypePdf");
    expect(fileIconIdOf("photo.PNG")).toBe("fileTypeImage");
  });

  it("락파일은 fileTypeLock", () => {
    expect(fileIconIdOf("pnpm-lock.yaml")).toBe("fileTypeLock");
    expect(fileIconIdOf("Cargo.lock")).toBe("fileTypeLock");
  });

  it(".gitignore 는 다른 git 계열 파일(.gitattributes 등)과 같은 아이콘", () => {
    expect(fileIconIdOf(".gitignore")).toBe("fileTypeGit");
    expect(fileIconIdOf(".gitattributes")).toBe("fileTypeGit");
  });

  it("점 파일(.env)도 매핑한다", () => {
    expect(fileIconIdOf(".env")).toBe("fileTypeConfig");
  });

  it("파일명 전체로 매치되는 것(대소문자 무관)", () => {
    expect(fileIconIdOf("README")).toBe("fileTypeInfo");
    expect(fileIconIdOf("Dockerfile")).toBe("fileTypeDocker");
    expect(fileIconIdOf("Makefile")).toBe("fileTypeMakefile");
  });

  it("다중 세그먼트 확장자는 가장 긴 매치를 우선한다", () => {
    expect(fileIconIdOf("bundle.css.map")).toBe("fileTypeCss");
    expect(fileIconIdOf("foo.test.ts")).toBe("fileTypeTs");
  });

  it("미매칭 확장자는 fileTypeDefault", () => {
    expect(fileIconIdOf("data.xyz")).toBe("fileTypeDefault");
    expect(fileIconIdOf("noext")).toBe("fileTypeDefault");
  });
});
