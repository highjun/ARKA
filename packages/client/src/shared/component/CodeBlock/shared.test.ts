import { createTextClipboardPort } from "./shared";

/**
 * mock 없이 실제 환경에 대고 계약을 본다. **jsdom 은 `navigator.clipboard` 도
 * `document.execCommand` 도 제공하지 않는다.** 그래서 여기서 검증할 수 있는 계약은 "수단이
 * 하나도 없을 때 어떻게 행동하는가" 하나다 — 약해 보이지만 이게 이 계약의 핵심이다. 던져버리면
 * 호출부에 처리되지 않은 rejection 이 남고, `true` 를 돌려주면 UI 가 복사되지 않은 것을
 * 복사됐다고 표시한다.
 *
 * 실제로 복사가 일어나는지는 브라우저 러너 없이 볼 수 없다. 그건 mock 으로 메울 문제가 아니라
 * 러너를 들일지 말지의 문제라, 여기서는 검증 범위를 정직하게 좁힌다.
 */
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
