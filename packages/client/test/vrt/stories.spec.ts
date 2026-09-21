import { existsSync, readFileSync, readdirSync } from "node:fs";
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

const SNAPSHOTS = path.join(import.meta.dirname, "snapshots");
const baselineOf = (id: string) => path.join(SNAPSHOTS, `${id}.png`);

const baselines = (): readonly string[] =>
  existsSync(SNAPSHOTS)
    ? readdirSync(SNAPSHOTS)
        .filter((name) => name.endsWith(".png"))
        .map((name) => name.slice(0, -".png".length))
        .sort()
    : [];

test("스토리가 하나는 있다", () => {
  expect(storyIds.length).toBeGreaterThan(0);
});

test("스토리가 없는 기준 이미지가 없다", () => {
  const stories = new Set(storyIds);
  const orphans = baselines().filter((id) => !stories.has(id));
  expect(orphans, "스토리가 사라졌는데 기준 이미지가 남았다 — 지운다").toStrictEqual([]);
});

for (const id of storyIds) {
  test(id, async ({ page }, testInfo) => {
    test.skip(
      !existsSync(baselineOf(id)) && testInfo.config.updateSnapshots === "none",
      "기준 이미지 없음 — 아직 사람이 승인한 그림이 아니다",
    );
    await page.goto(`/iframe.html?id=${id}&viewMode=story`);
    await page.locator("#storybook-root").waitFor({ state: "visible" });
    await expect(page.locator("#storybook-root")).toHaveScreenshot(`${id}.png`);
  });
}
