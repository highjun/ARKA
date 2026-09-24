import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { STORYBOOK_STATIC } from "./config.ts";
import type { VisualRegressionDeclaration, VisualRegressionPseudo, VisualRegressionShot } from "#lib/visualRegression";

type StorybookIndex = {
  readonly entries: Record<string, { readonly type: string; readonly importPath: string }>;
};

const CLIENT_ROOT = path.resolve(import.meta.dirname, "../..");
const SRC = path.join(CLIENT_ROOT, "src");
const THEMES = ["light", "dark"] as const;
const BASE: VisualRegressionShot = { name: "" };

const index = JSON.parse(
  readFileSync(path.join(CLIENT_ROOT, STORYBOOK_STATIC, "index.json"), "utf8"),
) as StorybookIndex;

const stories = Object.entries(index.entries)
  .filter(([, entry]) => entry.type === "story")
  .map(([id, entry]) => ({ id, dir: path.dirname(entry.importPath).replace(/^\.\/src\//u, "") }))
  .sort((a, b) => a.id.localeCompare(b.id));

const declarationOf = async (dir: string, id: string): Promise<VisualRegressionDeclaration | null> => {
  const folder = path.join(SRC, dir);
  const file = readdirSync(folder)
    .filter((name) => name.endsWith(".visualRegression.ts"))
    .map((name) => path.join(folder, name))[0];
  if (file === undefined) return null;
  const loaded = (await import(pathToFileURL(file).href)) as { readonly default: VisualRegressionDeclaration };
  expect(loaded.default.shots.length, `${id} 의 선언이 비어 있다`).toBeGreaterThan(0);
  return loaded.default;
};

const shotsOf = await Promise.all(
  stories.map(async ({ id, dir }) => {
    const declaration = await declarationOf(dir, id);
    return { id, dir, shots: [BASE, ...(declaration?.shots ?? [])] };
  }),
);

const nameOf = (id: string, theme: string, shot: VisualRegressionShot): string =>
  shot.name === "" ? `${id}--${theme}` : `${id}--${theme}--${shot.name}`;

const expected = new Set(
  shotsOf.flatMap(({ id, dir, shots }) =>
    THEMES.flatMap((theme) => shots.map((shot) => path.join(SRC, dir, "snapshots", `${nameOf(id, theme, shot)}.png`))),
  ),
);

const walk = (dir: string): readonly string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const baselines = (): readonly string[] =>
  walk(SRC)
    .filter((file) => file.endsWith(".png") && path.basename(path.dirname(file)) === "snapshots")
    .sort();

const force = async (page: Page, selector: string, pseudo: readonly VisualRegressionPseudo[]): Promise<void> => {
  const session = await page.context().newCDPSession(page);
  await session.send("DOM.enable");
  await session.send("CSS.enable");
  const { root } = await session.send("DOM.getDocument", { depth: -1 });
  const { nodeIds } = await session.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector });
  expect(nodeIds.length, `${selector} 에 맞는 요소가 없다 — 선언이 낡았다`).toBeGreaterThan(0);
  for (const nodeId of nodeIds) {
    await session.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: [...pseudo] });
  }
};

test("스토리가 하나는 있다", () => {
  expect(stories.length).toBeGreaterThan(0);
});

test("스토리가 없는 기준 이미지가 없다", () => {
  const orphans = baselines()
    .filter((file) => !expected.has(file))
    .map((file) => path.relative(SRC, file));

  expect(orphans, "스토리나 상태가 사라졌는데 기준 이미지가 남았다 — 지운다").toStrictEqual([]);
});

for (const { id, dir, shots } of shotsOf) {
  for (const theme of THEMES) {
    for (const shot of shots) {
      const name = nameOf(id, theme, shot);
      test(name, async ({ page }, testInfo) => {
        test.skip(
          !existsSync(path.join(SRC, dir, "snapshots", `${name}.png`)) && testInfo.config.updateSnapshots === "none",
          "기준 이미지 없음 — 아직 사람이 승인한 그림이 아니다",
        );
        if (shot.viewport !== undefined) await page.setViewportSize({ ...shot.viewport });
        await page.goto(`/iframe.html?id=${id}&viewMode=story&globals=colorMode:${theme}`);
        await page.locator("#storybook-root").waitFor({ state: "visible" });
        if (shot.pseudo !== undefined && shot.target !== undefined) await force(page, shot.target, shot.pseudo);
        await expect(page.locator("#storybook-root")).toHaveScreenshot([dir, "snapshots", `${name}.png`]);
      });
    }
  }
}
