import { expect, test } from "@playwright/test";

const DESKTOP = { width: 1280, height: 800 };

/** e2e 워크스페이스(fixture)는 이 저장소 안에 있다 — 소스 제어 패널이 브랜치를 읽어 오는지만 본다. */
test.describe("소스 제어", () => {
  test.use({ viewport: DESKTOP });

  test("패널이 브랜치와 변경 목록을 보여 준다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "소스 제어" }).click();
    await expect(page.getByLabel("커밋 메시지")).toBeVisible();
    await expect(page.getByRole("button", { name: "새로 고침" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /변경 사항/u })).toBeVisible();
  });
});
