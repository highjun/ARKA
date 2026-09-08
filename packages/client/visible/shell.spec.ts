import { expect, test, type Page } from "@playwright/test";

/**
 * 폰이 정본 폼팩터다. 데스크톱은 대조군으로만 둔다.
 *
 * 여기서 검사하는 것은 배선이 아니라 **눈에 보이는가**다 — 그건 jsdom이 영영 알 수 없다.
 * jsdom은 CSS 레이아웃을 적용하지 않아 요소가 화면 밖으로 밀려 있어도 `getByText`가 찾는다.
 * 조립이 맞물리는지는 `src/app/smoke.test.tsx`가 이미 본다.
 */

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

/**
 * 트리 항목은 **행**을 노린다. 터치 영역을 넓히는 `::after`가 글자 위를 덮어서, 글자를 직접
 * 겨냥하면 Playwright가 "가려졌다"고 막는다 — 실제 클릭은 행으로 전달돼 동작하는데도.
 */
const treeRow = (page: Page, name: string) => page.getByRole("treeitem", { name, exact: true });

test.describe("폰", () => {
  test.use({ viewport: PHONE });

  test("사이드바를 열면 워크스페이스 트리가 읽힌다", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("탐색기", { exact: true }).click();

    await expect(page.getByText("src", { exact: true })).toBeVisible();
    await expect(page.getByText("README.md", { exact: true })).toBeVisible();
  });

  /**
   * 드로어 배경이 비치면 트리를 읽을 수 없다. 실제로 그 상태로 배포된 적이 있고, 그때 jsdom
   * 테스트는 전부 초록이었다 — 이 테스트가 존재하는 이유다.
   */
  test("드로어에 불투명한 배경이 있다", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("탐색기", { exact: true }).click();

    const row = treeRow(page, "README.md");
    await expect(row).toBeVisible();

    const opaque = await row.evaluate((element) => {
      for (let node: HTMLElement | null = element as HTMLElement; node; node = node.parentElement) {
        const background = getComputedStyle(node).backgroundColor;
        const alpha = /rgba?\([^)]*,\s*([\d.]+)\s*\)$/u.exec(background)?.[1];
        // alpha가 없으면 rgb(...)라 불투명하다.
        if (background !== "transparent" && alpha !== "0") return true;
      }
      return false;
    });

    expect(opaque).toBe(true);
  });

  test("파일을 누르면 탭이 열리고 내용이 보인다", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("탐색기", { exact: true }).click();
    await treeRow(page, "README.md").click();

    await expect(page.getByRole("tab", { name: /README\.md/u })).toBeVisible();
    await expect(page.getByText("# ADE")).toBeVisible();
  });
});

test.describe("데스크톱", () => {
  test.use({ viewport: DESKTOP });

  test("사이드바가 드로어 없이 항상 보인다", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("src", { exact: true })).toBeVisible();
  });

  test("폴더를 펼치면 자식이 보인다", async ({ page }) => {
    await page.goto("/");
    await treeRow(page, "src").click();

    await expect(page.getByText("main.ts", { exact: true })).toBeVisible();
  });
});
