import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { URI } from "contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FileError } from "../domain/errors";
import { readFile } from "./localDiskFileSystem";

let root: string;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "ade-fs-"));
});

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

/** 던져진 FileError의 code를 꺼낸다. */
async function codeOf(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
  } catch (error) {
    return (error as FileError).code;
  }
  throw new Error("던지지 않았다");
}

describe("readFile()", () => {
  it("쓴 내용을 그대로 읽는다", async () => {
    await fs.writeFile(path.join(root, "a.txt"), "안녕");

    const result = await readFile(URI.file("a.txt"), root);

    expect(new TextDecoder().decode(result.content)).toBe("안녕");
  });

  it("같은 파일을 두 번 읽으면 etag가 같다", async () => {
    await fs.writeFile(path.join(root, "a.txt"), "hello");

    const first = await readFile(URI.file("a.txt"), root);
    const second = await readFile(URI.file("a.txt"), root);

    expect(second.etag).toBe(first.etag);
  });

  it("내용이 바뀌면 etag가 달라진다", async () => {
    const file = path.join(root, "a.txt");
    await fs.writeFile(file, "hello");
    const before = await readFile(URI.file("a.txt"), root);

    await fs.writeFile(file, "hello world");
    const after = await readFile(URI.file("a.txt"), root);

    expect(after.etag).not.toBe(before.etag);
  });

  it("없는 파일은 NotFound를 던진다", async () => {
    expect(await codeOf(() => readFile(URI.file("없다.txt"), root))).toBe(
      "NotFound",
    );
  });

  it("디렉터리를 읽으면 IsADirectory를 던진다", async () => {
    await fs.mkdir(path.join(root, "sub"));

    expect(await codeOf(() => readFile(URI.file("sub"), root))).toBe(
      "IsADirectory",
    );
  });

  it("루트 밖 경로는 NoPermission을 던진다", async () => {
    expect(
      await codeOf(() => readFile(URI.parse("file:///../etc/passwd"), root)),
    ).toBe("NoPermission");
  });
});
