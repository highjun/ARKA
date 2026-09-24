import { describe, expect, it } from "vitest";
import { changesIn, declarations } from "./contracts.ts";

const one = (source: string, key: string): string | undefined => declarations(source).get(key);

describe("declarations", () => {
  it("내보낸 선언만 딴다", () => {
    const found = declarations(`
      const hidden = 1;
      type Hidden = string;
      export const Shown = 1;
      export type Shown2 = string;
    `);
    expect([...found.keys()].sort()).toStrictEqual(["const Shown", "type Shown2"]);
  });

  it("같은 이름의 const와 type을 따로 센다", () => {
    const found = declarations(`
      export const FileEntry = z.object({ name: z.string() });
      export type FileEntry = z.infer<typeof FileEntry>;
    `);
    expect([...found.keys()].sort()).toStrictEqual(["const FileEntry", "type FileEntry"]);
  });

  it("주석과 줄바꿈과 끝 쉼표는 무시한다", () => {
    const loose = `
      // 이 주석은 세지 않는다
      export const FileEntry = z.object({
        name: z.string(), // 이름
        type: FileEntryType,
      });
    `;
    const tight = `export const FileEntry = z.object({ name: z.string(), type: FileEntryType });`;
    expect(one(loose, "const FileEntry")).toBe(one(tight, "const FileEntry"));
  });

  it("prettier가 메서드 사슬을 줄로 쪼개도 같게 본다", () => {
    const flat = `export const R = z.object({ staged: z.preprocess((v) => v, z.boolean()).default(false) });`;
    const wrapped = `
      export const R = z.object({
        staged: z
          .preprocess((v) => v, z.boolean())
          .default(false),
      });
    `;
    expect(one(flat, "const R")).toBe(one(wrapped, "const R"));
  });

  it("prettier가 유니온을 줄로 쪼개도 같게 본다", () => {
    const flat = `export type Mode = "a" | "b" | "c";`;
    const wrapped = `
      export type Mode =
        | "a"
        | "b"
        | "c";
    `;
    expect(one(flat, "type Mode")).toBe(one(wrapped, "type Mode"));
  });

  it("zod 스키마의 필드가 바뀌면 다르게 본다", () => {
    const before = `export const FileEntry = z.object({ name: z.string() });`;
    const after = `export const FileEntry = z.object({ name: z.string(), size: z.number() });`;
    expect(one(before, "const FileEntry")).not.toBe(one(after, "const FileEntry"));
  });

  it("z.enum에 값이 늘면 다르게 본다", () => {
    const before = `export const FileErrorCode = z.enum(["NotFound"]);`;
    const after = `export const FileErrorCode = z.enum(["NotFound", "NoPermission"]);`;
    expect(one(before, "const FileErrorCode")).not.toBe(one(after, "const FileErrorCode"));
  });

  it("z.infer로 파생된 type은 몸이 안 바뀌어 const로만 잡힌다", () => {
    const before = `export type FileEntry = z.infer<typeof FileEntry>;`;
    const after = `export type FileEntry = z.infer<typeof FileEntry>;`;
    expect(one(before, "type FileEntry")).toBe(one(after, "type FileEntry"));
  });

  it("인터페이스와 클래스와 함수 선언도 딴다", () => {
    const found = declarations(`
      export interface Shape { a: string }
      export class URI { toString(): string { return ""; } }
      export function make(): void {}
    `);
    expect([...found.keys()].sort()).toStrictEqual(["class URI", "function make", "interface Shape"]);
  });

  it("클래스 메서드의 시그니처가 바뀌면 다르게 본다", () => {
    const before = `export class URI { join(part: string): URI { return this; } }`;
    const after = `export class URI { join(part: string, deep: boolean): URI { return this; } }`;
    expect(one(before, "class URI")).not.toBe(one(after, "class URI"));
  });
});

describe("changesIn", () => {
  it("같은 내용이면 아무것도 세지 않는다", () => {
    const source = `export const A = z.string();`;
    expect(changesIn("a.ts", source, source)).toStrictEqual([]);
  });

  it("생긴 것과 없어진 것과 바뀐 것을 가른다", () => {
    const before = `
      export const Kept = z.string();
      export const Gone = z.number();
      export const Moved = z.object({ a: z.string() });
    `;
    const after = `
      export const Kept = z.string();
      export const Moved = z.object({ a: z.number() });
      export const Fresh = z.boolean();
    `;
    expect(changesIn("a.ts", before, after)).toStrictEqual([
      { file: "a.ts", name: "Gone", kind: "const", change: "removed" },
      { file: "a.ts", name: "Moved", kind: "const", change: "changed" },
      { file: "a.ts", name: "Fresh", kind: "const", change: "added" },
    ]);
  });

  it("파일이 통째로 생기면 전부 생긴 것이다", () => {
    expect(changesIn("a.ts", "", `export type A = string;`)).toStrictEqual([
      { file: "a.ts", name: "A", kind: "type", change: "added" },
    ]);
  });
});
