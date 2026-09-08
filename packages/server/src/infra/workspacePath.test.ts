import { URI } from "contracts";
import { describe, expect, it } from "vitest";
import type { FileError } from "../domain/errors";
import { resolveWorkspacePath } from "./workspacePath";

const ROOT = "/w";

/** 던져진 FileError의 code를 꺼낸다. */
function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    return (error as FileError).code;
  }
  throw new Error("던지지 않았다");
}

describe("resolveWorkspacePath()", () => {
  it("루트 아래 경로로 이어붙인다", () => {
    expect(resolveWorkspacePath(URI.parse("file:///a.txt"), ROOT)).toBe(
      "/w/a.txt",
    );
  });

  it("중첩된 경로를 그대로 이어붙인다", () => {
    expect(resolveWorkspacePath(URI.parse("file:///x/y.txt"), ROOT)).toBe(
      "/w/x/y.txt",
    );
  });

  it("빈 path는 루트 자체가 된다", () => {
    expect(resolveWorkspacePath(URI.parse("file:///"), ROOT)).toBe("/w");
  });

  it("루트를 벗어나면 NoPermission을 던진다", () => {
    expect(codeOf(() => resolveWorkspacePath(URI.parse("file:///../etc/passwd"), ROOT))).toBe(
      "NoPermission",
    );
  });

  it("중간에 되돌아 나가는 경로도 NoPermission을 던진다", () => {
    expect(
      codeOf(() =>
        resolveWorkspacePath(URI.parse("file:///a/../../etc/passwd"), ROOT),
      ),
    ).toBe("NoPermission");
  });

  it("루트와 접두어만 같은 형제 디렉터리도 막는다", () => {
    expect(
      codeOf(() => resolveWorkspacePath(URI.parse("file:///../workspace2/a.txt"), ROOT)),
    ).toBe("NoPermission");
  });

  it("file이 아닌 스킴은 Unavailable을 던진다", () => {
    expect(codeOf(() => resolveWorkspacePath(URI.parse("git://HEAD/a.txt"), ROOT))).toBe(
      "Unavailable",
    );
  });

  it("authority가 있는 file은 Unavailable을 던진다", () => {
    expect(codeOf(() => resolveWorkspacePath(URI.parse("file://host/a.txt"), ROOT))).toBe(
      "Unavailable",
    );
  });
});
