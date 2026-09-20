import { expect, test, type Page } from "@playwright/test";

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

const treeRow = (page: Page, name: string) => page.getByRole("treeitem", { name, exact: true });

test.describe("폰", () => {
  test.use({ viewport: PHONE });

  test("사이드바를 열면 워크스페이스 트리가 읽힌다", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("사이드바 열기").click();

    await expect(page.getByText("src", { exact: true })).toBeVisible();
    await expect(page.getByText("README.md", { exact: true })).toBeVisible();
  });

  test("드로어에 불투명한 배경이 있다", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("사이드바 열기").click();

    const row = treeRow(page, "README.md");
    await expect(row).toBeVisible();

    const opaque = await row.evaluate((element) => {
      for (let node: HTMLElement | null = element as HTMLElement; node; node = node.parentElement) {
        const background = getComputedStyle(node).backgroundColor;
        const alpha = /rgba?\([^)]*,\s*([\d.]+)\s*\)$/u.exec(background)?.[1];
        if (background !== "transparent" && alpha !== "0") return true;
      }
      return false;
    });

    expect(opaque).toBe(true);
  });

  test("파일을 누르면 탭이 열리고 내용이 보인다", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("사이드바 열기").click();
    await treeRow(page, "README.md").click();

    await expect(page.getByRole("tab", { name: /README\.md/u })).toBeVisible();
    await expect(page.getByText("# ARKA")).toBeVisible();
  });
});

test.describe("데스크톱", () => {
  test.use({ viewport: DESKTOP });

  test("사이드바가 드로어 없이 항상 보인다", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("src", { exact: true })).toBeVisible();
  });

  test("빌드 표시가 화면에 보인다", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText(/^v\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}( · [0-9a-f]{7}(-dirty)?)?$/u)).toBeVisible();
  });

  test("ctrl+k로 커맨드 팔레트가 열린다", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+k");

    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("폴더를 펼치면 자식이 보인다", async ({ page }) => {
    await page.goto("/");
    await treeRow(page, "src").click();

    await expect(page.getByText("main.ts", { exact: true })).toBeVisible();
  });
});

test.describe("저장하지 않은 변경", () => {
  test.use({ viewport: DESKTOP });

  test("편집하면 탭이 dirty로 표시되고, 닫으려 하면 확인을 구한다", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/");
    await treeRow(page, "edit-me.md").click();

    const tab = page.getByRole("tab", { name: /edit-me\.md/u });
    await expect(tab).toBeVisible();
    await expect(tab).not.toHaveAttribute("data-dirty", "");

    await page.getByRole("textbox").first().click();
    await page.keyboard.type("바뀐 내용");
    await expect(tab).toHaveAttribute("data-dirty", "");

    await page.getByLabel("edit-me.md 닫기").click();
    await expect(page.getByText("저장하지 않은 변경사항이 있다")).toBeVisible();
  });
});
