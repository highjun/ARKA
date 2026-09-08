import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

/**
 * 스토리 목록을 빌드된 `index.json`에서 읽는다 — **스토리를 추가하면 VRT가 저절로 따라온다.**
 * 컴포넌트마다 스펙을 새로 쓰지 않는 것이 이 방식의 값이다.
 *
 * 스토리마다 테스트 하나다. 한 테스트가 전부를 돌면 스토리가 늘수록 타임아웃에 가까워지고,
 * 어느 스토리가 깨졌는지도 한눈에 안 보인다.
 */
type StorybookIndex = { readonly entries: Record<string, { readonly type: string }> };

const indexPath = path.resolve(import.meta.dirname, "../../packages/client/.output/storybook-static/index.json");
const index = JSON.parse(readFileSync(indexPath, "utf8")) as StorybookIndex;
const storyIds = Object.entries(index.entries)
  .filter(([, entry]) => entry.type === "story")
  .map(([id]) => id)
  .sort();

test("스토리가 하나는 있다", () => {
  expect(storyIds.length).toBeGreaterThan(0);
});

for (const id of storyIds) {
  test(id, async ({ page }) => {
    // `iframe.html`은 스토리북 껍데기(사이드바·툴바) 없이 컴포넌트만 그린다.
    await page.goto(`/iframe.html?id=${id}&viewMode=story`);
    await page.locator("#storybook-root").waitFor({ state: "visible" });
    await expect(page.locator("#storybook-root")).toHaveScreenshot(`${id}.png`);
  });
}
