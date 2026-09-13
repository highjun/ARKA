import { expect, test, type Page } from "@playwright/test";

/**
 * 폰이 정본 폼팩터다. 데스크톱은 대조군으로만 둔다.
 *
 * 여기서 검사하는 것은 배선이 아니라 **눈에 보이는가**다 — 그건 jsdom이 영영 알 수 없다.
 * jsdom은 CSS 레이아웃을 적용하지 않아 요소가 화면 밖으로 밀려 있어도 `getByText`가 찾는다.
 * 조립이 맞물리는지는 `src/workbench/registerServices.test.tsx`가 이미 본다.
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
    await page.getByLabel("사이드바 열기").click();

    await expect(page.getByText("src", { exact: true })).toBeVisible();
    await expect(page.getByText("README.md", { exact: true })).toBeVisible();
  });

  /**
   * 드로어 배경이 비치면 트리를 읽을 수 없다. 실제로 그 상태로 배포된 적이 있고, 그때 jsdom
   * 테스트는 전부 초록이었다 — 이 테스트가 존재하는 이유다.
   */
  test("드로어에 불투명한 배경이 있다", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("사이드바 열기").click();

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
    await page.getByLabel("사이드바 열기").click();
    await treeRow(page, "README.md").click();

    await expect(page.getByRole("tab", { name: /README\.md/u })).toBeVisible();
    await expect(page.getByText("# ARKA")).toBeVisible();
  });
});

test.describe("데스크톱", () => {
  test.use({ viewport: DESKTOP });

  test("사이드바가 드로어 없이 항상 보인다", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("src", { exact: true })).toBeVisible();
  });

  test("빌드 표시가 화면에 보인다", async ({ page }) => {
    await page.goto("/");

    // 서버가 주는 ISO를 보는 사람의 시간대로 서식한 결과라, 형식만 확인한다.
    // 커밋 SHA는 이미지가 구워 넣으므로 여기(소스로 띄운 서버)에는 없다.
    await expect(page.getByText(/^v\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}( · [0-9a-f]{7}(-dirty)?)?$/u)).toBeVisible();
  });

  /**
   * 전역 키 리스너는 `infra/GlobalKeybindings`가 건다(2026-09-08, Workbench.tsx 해체).
   * 조립부가 기여 등록을 빠뜨리면 타입 검사도 단위 테스트도 통과하는데 단축키만 조용히 죽는다.
   */
  test("ctrl+k로 커맨드 팔레트가 열린다", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+k");

    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("ctrl+shift+f로 검색 패널이 열린다", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+Shift+F");
    await expect(page.getByLabel("검색어")).toBeVisible();
  });

  test("폴더를 펼치면 자식이 보인다", async ({ page }) => {
    await page.goto("/");
    await treeRow(page, "src").click();

    await expect(page.getByText("main.ts", { exact: true })).toBeVisible();
  });
});

/**
 * dirty 표시와 닫기 확인은 **셸이 파일을 직접 모르게 된 뒤에도** 도는지 봐야 하는 흐름이다
 * (2026-09-08 — `ITabDirtyState`로 결합을 끊음). 조립부가 계약을 잘못 이으면 타입 검사도
 * 단위 테스트도 통과하는데 화면에서만 조용히 죽는다.
 */
test.describe("저장하지 않은 변경", () => {
  test.use({ viewport: DESKTOP });

  test("편집하면 탭이 dirty로 표시되고, 닫으려 하면 확인을 구한다", async ({ page }) => {
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
