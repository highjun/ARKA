import { expect, test } from "@playwright/test";

/**
 * 스토리 목록을 `index.json`에서 읽는다 — **스토리를 추가하면 VRT가 저절로 따라온다.**
 * 컴포넌트마다 스펙을 새로 쓰지 않는 것이 이 방식의 값이다.
 */
type StorybookIndex = { readonly entries: Record<string, { readonly type: string }> };

const storyIds = async (baseURL: string): Promise<string[]> => {
  const response = await fetch(`${baseURL}/index.json`);
  const index = (await response.json()) as StorybookIndex;
  return Object.entries(index.entries)
    .filter(([, entry]) => entry.type === "story")
    .map(([id]) => id)
    .sort();
};

test("스토리마다 이전과 같은 그림인지 본다", async ({ page, baseURL }) => {
  const ids = await storyIds(baseURL ?? "");
  expect(ids.length).toBeGreaterThan(0);

  for (const id of ids) {
    // `iframe.html`은 스토리북 껍데기(사이드바·툴바) 없이 컴포넌트만 그린다.
    await page.goto(`/iframe.html?id=${id}&viewMode=story`);
    await page.locator("#storybook-root").waitFor({ state: "visible" });
    await expect(page.locator("#storybook-root")).toHaveScreenshot(`${id}.png`);
  }
});
