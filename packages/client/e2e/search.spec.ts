import { expect, test } from "@playwright/test";

const DESKTOP = { width: 1280, height: 800 };

test.describe("검색", () => {
  test.use({ viewport: DESKTOP });

  test("찾은 결과를 누르면 파일이 열린다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "검색" }).click();
    await page.getByLabel("검색어").fill("ADE");
    await expect(page.getByText(/개 파일에서/u)).toBeVisible();
    await page.getByText("README.md", { exact: true }).first().click();
    await page.getByText("# ADE", { exact: true }).first().click();
    await expect(page.getByRole("tab", { name: /README\.md/u })).toBeVisible();
  });
});
