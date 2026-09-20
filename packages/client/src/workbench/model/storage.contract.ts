import { beforeEach, describe, expect, it } from "vitest";
import type { IStorage } from "./IStorage";

export const testStorageContract = (name: string, setup: () => IStorage | Promise<IStorage>): void => {
  describe(`IStorage: ${name}`, () => {
    let storage: IStorage;
    beforeEach(async () => {
      storage = await setup();
    });

    it("없는 키는 null이다", () => {
      expect(storage.get("nope")).toBeNull();
    });

    it("쓴 값을 그대로 읽는다", () => {
      storage.set("k", "v");
      expect(storage.get("k")).toBe("v");
    });

    it('빈 문자열은 "저장된 적 없다"와 다르다', () => {
      storage.set("k", "");
      expect(storage.get("k")).toBe("");
    });

    it("덮어쓰면 마지막 값이다", () => {
      storage.set("k", "1");
      storage.set("k", "2");
      expect(storage.get("k")).toBe("2");
    });
  });
};
