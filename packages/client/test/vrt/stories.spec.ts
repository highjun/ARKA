import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { STORYBOOK_STATIC } from "./vrt.config.ts";

type StorybookIndex = { readonly entries: Record<string, { readonly type: string }> };

const indexPath = path.resolve(import.meta.dirname, "../..", STORYBOOK_STATIC, "index.json");
const index = JSON.parse(readFileSync(indexPath, "utf8")) as StorybookIndex;
const storyIds = Object.entries(index.entries)
  .filter(([, entry]) => entry.type === "story")
  .map(([id]) => id)
  .sort();

const baselineOf = (id: string) => path.join(import.meta.dirname, "snapshots", `${id}.png`);

test("스토리가 하나는 있다", () => {
  expect(storyIds.length).toBeGreaterThan(0);
});

for (const id of storyIds) {
  test(id, async ({ page }, testInfo) => {
    test.skip(
      !existsSync(baselineOf(id)) && testInfo.config.updateSnapshots === "none",
      "기준 이미지 없음 — 검토에서 승인되지 않은 스토리다",
    );
    await page.goto(`/iframe.html?id=${id}&viewMode=story`);
    await page.locator("#storybook-root").waitFor({ state: "visible" });
    await expect(page.locator("#storybook-root")).toHaveScreenshot(`${id}.png`);
  });
}
