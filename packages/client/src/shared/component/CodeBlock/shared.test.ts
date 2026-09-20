import { createTextClipboardPort } from "./shared";

describe("createTextClipboardPort", () => {
  it("클립보드 수단이 없어도 던지지 않고 `false` 를 돌려준다", async () => {
    const clipboard = createTextClipboardPort();

    await expect(clipboard.copy("hello")).resolves.toBe(false);
  });

  it("빈 문자열도 같은 계약을 따른다", async () => {
    const clipboard = createTextClipboardPort();

    await expect(clipboard.copy("")).resolves.toBe(false);
  });
});
