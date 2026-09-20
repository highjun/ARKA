import { testStorageContract } from "../model/storage.contract";
import { createStoragePort } from "./LocalStorage";

describe("get·set", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("쓴 것을 그대로 읽는다", () => {
    const storage = createStoragePort();

    storage.set("k", "v");

    expect(storage.get("k")).toBe("v");
  });

  it("저장된 적 없는 키는 null이다", () => {
    expect(createStoragePort().get("없는키")).toBeNull();
  });

  it("덮어쓰면 나중 값이 남는다", () => {
    const storage = createStoragePort();

    storage.set("k", "a");
    storage.set("k", "b");

    expect(storage.get("k")).toBe("b");
  });
});

testStorageContract("LocalStorage", () => {
  localStorage.clear();
  return createStoragePort();
});
