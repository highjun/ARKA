import { expect, test } from "@playwright/test";

const DESKTOP = { width: 1280, height: 800 };

test.describe("마크다운 미리보기", () => {
  test.use({ viewport: DESKTOP });

  test("README를 열고 미리보기 커맨드를 부르면 렌더된 제목이 보인다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("treeitem", { name: "README.md", exact: true }).click();
    await expect(page.getByRole("tab", { name: /README\.md/u })).toBeVisible();
    await page.keyboard.press("Control+k");
    await page.getByPlaceholder(/커맨드|명령/u).fill("미리보기");
    await page.getByText("마크다운 미리보기 열기").click();
    await expect(page.getByRole("tab", { name: /미리보기 README\.md/u })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "ADE" })).toBeVisible();
  });
});
