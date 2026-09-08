import { expect, test } from "@playwright/test";

/**
 * 에이전트 대화의 최소 흐름 — 활동을 고르고, 새 대화를 열고, 보내면 답이 스트리밍된다.
 * 서버는 스크립트 실행기라 API 키 없이 돈다. 여기서 보는 것은 **눈에 보이는가**다.
 */
const DESKTOP = { width: 1280, height: 800 };

test.describe("에이전트", () => {
  test.use({ viewport: DESKTOP });

  test("새 대화를 열고 보내면 답이 온다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "에이전트" }).click();
    await page.getByRole("button", { name: /새 대화/u }).click();

    await expect(page.getByRole("tab", { name: /새 대화/u })).toBeVisible();
    const textarea = page.getByRole("textbox");
    await textarea.fill("안녕 세상");
    await textarea.press("Enter");

    await expect(page.getByText("받은 입력: 안녕 세상")).toBeVisible({ timeout: 15_000 });
    // 탭 제목이 첫 입력으로 바뀐다(서버가 session.renamed를 낸다).
    await expect(page.getByRole("tab", { name: /안녕 세상|새 대화/u })).toBeVisible();
  });
});
