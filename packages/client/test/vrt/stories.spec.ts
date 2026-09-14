import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { STORYBOOK_STATIC } from "./vrt.config.ts";

/**
 * 스토리 목록을 빌드된 `index.json`에서 읽는다 — **스토리를 추가하면 VRT가 저절로 따라온다.**
 * 컴포넌트마다 스펙을 새로 쓰지 않는 것이 이 방식의 값이다.
 *
 * 스토리마다 테스트 하나다. 한 테스트가 전부를 돌면 스토리가 늘수록 타임아웃에 가까워지고,
 * 어느 스토리가 깨졌는지도 한눈에 안 보인다.
 */
type StorybookIndex = { readonly entries: Record<string, { readonly type: string }> };

const indexPath = path.resolve(import.meta.dirname, "../..", STORYBOOK_STATIC, "index.json");
const index = JSON.parse(readFileSync(indexPath, "utf8")) as StorybookIndex;
const storyIds = Object.entries(index.entries)
  .filter(([, entry]) => entry.type === "story")
  .map(([id]) => id)
  .sort();

/** `vrt.config.ts`의 `snapshotPathTemplate`과 같은 자리를 가리켜야 한다. */
const baselineOf = (id: string) => path.join(import.meta.dirname, "snapshots", `${id}.png`);

test("스토리가 하나는 있다", () => {
  expect(storyIds.length).toBeGreaterThan(0);
});

for (const id of storyIds) {
  test(id, async ({ page }, testInfo) => {
    // 기준 이미지는 **검토에서 Accept할 때** 만든다(`test:vrt -g "<스토리 id>" --update-snapshots`).
    // 그때까지 기준이 없는 것은 정상이라 건너뛴다 — 아무도 안 본 그림을 기준으로 삼으면 "검토 안 함"이
    // "승인됨"으로 기록된다. 다만 기준을 만들러 온 실행에서는 건너뛰면 안 되므로,
    // 기본값(`updateSnapshots: "none"`)일 때만 건너뛴다.
    test.skip(
      !existsSync(baselineOf(id)) && testInfo.config.updateSnapshots === "none",
      "기준 이미지 없음 — 검토에서 승인되지 않은 스토리다",
    );
    await page.goto(`/iframe.html?id=${id}&viewMode=story`);
    await page.locator("#storybook-root").waitFor({ state: "visible" });
    await expect(page.locator("#storybook-root")).toHaveScreenshot(`${id}.png`);
  });
}
