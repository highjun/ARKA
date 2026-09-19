/**
 * 바깥 제품의 UI를 **컴포넌트 단위로** 찍고, 찍으면서 **본 것을 같이 적는다.**
 *
 *     node tools/references/capture.mjs                 아직 없는 것만 찍는다
 *     node tools/references/capture.mjs --force         전부 다시 찍는다
 *     node tools/references/capture.mjs --only vscode   id에 그 글자가 든 것만
 *     node tools/references/capture.mjs --list          찍지 않고 계획만 보여준다
 *     node tools/references/capture.mjs --index         찍지 않고 색인만 다시 쓴다
 *
 * **설명은 그림보다 먼저 쓰지 않는다.** `targets.mjs`의 `description`은 선택 항목이고, 비어 있으면
 * 색인에 안 들어간다. 대신 캡처할 때마다 그 원소에서 **실제로 본 것**(글자·자식 구조·크기·이름의
 * 출처)을 `.output/references/probe.json`에 남긴다. 설명은 그것을 보고 뒤에 쓴다.
 *
 * **실패를 삼키지 않는다.** 타깃마다 결과를 한 줄로 찍고, 하나라도 실패하면 0이 아닌 코드로 끝난다 —
 * 조용히 빠진 이미지가 "그 컴포넌트는 참고할 게 없더라"로 읽히는 것이 이 작업의 가장 나쁜 실패다.
 */
import { chromium } from "@playwright/test";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { ASSETS, INDEX, PROBE, asset, ensureOutput } from "./paths.mjs";
import { CATEGORIES, RECIPES, TARGETS } from "./targets.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const at = args.indexOf(name);
  return at < 0 ? null : (args[at + 1] ?? null);
};

const FORCE = flag("--force");
const LIST = flag("--list");
const INDEX_ONLY = flag("--index");
const ONLY = option("--only");

/** 데스크톱이 본작업, 모바일이 보조작업이다 — `concept.md`의 전제와 같은 두 폭으로 본다. */
const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
  /** 스토리 하나만 그리는 액자. 넓으면 버튼 한 개가 가로로 길게 늘어난 띠가 된다. */
  story: { width: 720, height: 900 },
};

/** 남의 사이트를 때리는 것이라 사이 간격을 둔다. 우리 컨테이너는 그럴 이유가 없다. */
const politeMs = (page) => (RECIPES[page].local === true ? 0 : 300);
const sleep = (ms) => (ms > 0 ? new Promise((done) => setTimeout(done, ms)) : Promise.resolve());

/** **매니페스트가 틀리면 캡처 전에 멈춘다.** 긴 실행이 끝난 뒤에 오타를 알게 되는 것을 막는다. */
const validate = () => {
  const problems = [];
  const seen = new Set();
  for (const target of TARGETS) {
    if (seen.has(target.id)) problems.push(`id 중복: ${target.id}`);
    seen.add(target.id);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/u.test(target.id)) problems.push(`id가 kebab-case가 아니다: ${target.id}`);
    if (!CATEGORIES.includes(target.category)) problems.push(`${target.id}: 모르는 category "${target.category}"`);
    if (!target.product?.trim()) problems.push(`${target.id}: product가 비었다`);
    if (!RECIPES[target.page]) problems.push(`${target.id}: 모르는 page "${target.page}"`);
    if (target.viewport !== undefined && VIEWPORTS[target.viewport] === undefined) {
      problems.push(`${target.id}: 모르는 viewport "${target.viewport}"`);
    }
    if (!target.selector) problems.push(`${target.id}: selector가 없다`);
  }
  if (problems.length > 0) {
    console.error(`매니페스트가 어긋났습니다:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    process.exit(2);
  }
};

/**
 * 타깃 하나를 (상태 × 테마) 수만큼의 "찍을 것"으로 편다.
 *
 * `--only`는 **찍을 것만 고른다.** 색인은 언제나 전부를 보고 다시 쓴다 — 거르고 쓰면 부분 실행이
 * 색인을 그만큼으로 깎는다.
 */
const shots = (filtered = true) => {
  const out = [];
  for (const target of TARGETS) {
    if (filtered && ONLY !== null && !target.id.includes(ONLY)) continue;
    for (const state of target.states ?? ["default"]) {
      for (const theme of target.themes ?? ["dark", "light"]) {
        const parts = [target.id, state === "default" ? null : state, theme].filter((part) => part !== null);
        out.push({ ...target, state, theme, assetId: parts.join("-") });
      }
    }
  }
  // 같은 (페이지·테마·폭)끼리 붙여 브라우저 컨텍스트를 한 번만 세운다.
  const key = (shot) => `${shot.page}|${shot.theme ?? "-"}|${shot.viewport ?? "desktop"}`;
  return out.sort((a, b) => key(a).localeCompare(key(b)) || a.assetId.localeCompare(b.assetId));
};

const onDisk = () =>
  new Set(
    existsSync(ASSETS)
      ? readdirSync(ASSETS)
          .filter((name) => name.endsWith(".png"))
          .map((name) => name.slice(0, -".png".length))
      : [],
  );

/** 원소에서 **실제로 보이는 것**. 설명을 이것만 보고 쓴다. */
const observe = async (page, shot, node) => {
  const seen = await node.evaluate((element) => {
    const children = [...element.children].map((child) => {
      const cls = typeof child.className === "string" ? child.className.split(/\s+/u).slice(0, 3).join(".") : "";
      return cls === "" ? child.tagName.toLowerCase() : `${child.tagName.toLowerCase()}.${cls}`;
    });
    const tally = {};
    for (const name of children) tally[name] = (tally[name] ?? 0) + 1;
    const box = element.getBoundingClientRect();
    return {
      text: (element.innerText ?? "").replace(/\s+/gu, " ").trim().slice(0, 400),
      children: Object.entries(tally).map(([name, count]) => (count > 1 ? `${name}×${count}` : name)),
      size: `${Math.round(box.width)}×${Math.round(box.height)}`,
    };
  });
  return { selector: shot.selector, source: shot.source ?? null, state: shot.state, ...seen };
};

/**
 * DOM 원소 하나를 잘라 찍는다. 화면 전체가 아니라 **그 컴포넌트**가 결과물이다.
 *
 * `maxHeight`가 있으면 위에서 그만큼만 자른다 — 목록·표·긴 문서는 원소 높이가 수천 픽셀이라
 * 그대로 찍으면 참고할 수 없는 띠가 된다. 자르려면 페이지 좌표가 필요해서 맨 위로 굴린 뒤 잰다.
 */
const shoot = async (page, shot) => {
  let node = page.locator(shot.selector).first();
  await node.waitFor({ state: "visible", timeout: 30_000 });

  // 포털로 빠져나가는 컴포넌트(다이얼로그·메뉴)는 지정한 뿌리가 납작하다. 그때는 화면을 찍는다.
  if (shot.fallbackViewport === true && ((await node.boundingBox())?.height ?? 0) < 8) {
    const path = asset(`${shot.assetId}.png`);
    await page.screenshot({ path, animations: "disabled", scale: "device" });
    return {
      probe: {
        selector: "(viewport)",
        source: shot.source ?? null,
        state: shot.state,
        text: "",
        children: [],
        size: "viewport",
      },
    };
  }

  if (shot.state === "hover") await node.hover();
  if (shot.state === "focus") await node.focus().catch(() => node.click());
  if (shot.state !== "default") await page.waitForTimeout(500);

  const probe = await observe(page, shot, node);
  const path = asset(`${shot.assetId}.png`);
  if (shot.maxHeight === undefined) {
    await node.screenshot({ path, animations: "disabled", scale: "device" });
    return { probe };
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const box = await node.boundingBox();
  if (box === null) throw new Error("원소의 크기를 재지 못했습니다");
  const width = page.viewportSize().width;
  await page.screenshot({
    path,
    animations: "disabled",
    scale: "device",
    fullPage: true,
    clip: {
      x: Math.max(0, box.x),
      y: Math.max(0, box.y),
      width: Math.min(box.width, width - Math.max(0, box.x)),
      height: Math.min(box.height, shot.maxHeight),
    },
  });
  return { probe };
};

/** 상태 변형은 같은 설명에 한 구절을 덧댄다 — 같은 컴포넌트의 다른 순간이라서다. */
const STATE_NOTE = { hover: "마우스를 얹은 상태다", focus: "포커스를 받은 상태다" };

/**
 * 파일이 실제로 생겼고 **설명이 있는 것만** 색인에 남긴다. 설명이 빈 것은 몇 개인지 알린다 —
 * 그것이 "아직 안 본 그림"의 개수다.
 */
const writeIndex = () => {
  const files = onDisk();
  const merged = {};
  const missing = [];
  for (const shot of shots(false).sort((a, b) => a.assetId.localeCompare(b.assetId))) {
    if (!files.has(shot.assetId)) continue;
    if (!shot.description?.trim()) {
      missing.push(shot.assetId);
      continue;
    }
    const note = STATE_NOTE[shot.state];
    merged[shot.assetId] = {
      description: note === undefined ? shot.description : `${shot.description}. ${note}`,
      category: shot.category,
      product: shot.product,
    };
  }
  writeFileSync(INDEX, `${JSON.stringify(merged, null, 2)}\n`);
  return { indexed: Object.keys(merged).length, missing };
};

const mergeProbe = (fresh) => {
  ensureOutput();
  const previous = existsSync(PROBE) ? JSON.parse(readFileSync(PROBE, "utf8")) : {};
  const merged = { ...previous, ...fresh };
  const sorted = Object.fromEntries(
    Object.keys(merged)
      .sort()
      .map((key) => [key, merged[key]]),
  );
  writeFileSync(PROBE, `${JSON.stringify(sorted, null, 2)}\n`);
};

const report = (failures, missing) => {
  if (failures.length > 0) {
    console.log("\n실패한 것:");
    for (const [id, why] of failures) console.log(`  ${id.padEnd(50)} ${why}`);
  }
  if (missing.length > 0) {
    console.log(`\n설명 없는 것 ${missing.length}개 — 색인에 안 들어갔다. probe.json을 보고 채운다:`);
    for (const id of missing.slice(0, 20)) console.log(`  ${id}`);
    if (missing.length > 20) console.log(`  … 그리고 ${missing.length - 20}개 더`);
  }
};

const main = async () => {
  validate();
  const plan = shots();

  if (LIST) {
    const files = onDisk();
    for (const shot of plan) console.log(`${files.has(shot.assetId) ? "있음" : "없음"}  ${shot.assetId}`);
    console.log(`\n전부 ${plan.length}개 · 찍을 것 ${plan.filter((s) => !files.has(s.assetId)).length}개`);
    return 0;
  }
  if (INDEX_ONLY) {
    const { indexed, missing } = writeIndex();
    console.log(`색인 ${indexed}개`);
    report([], missing);
    return missing.length > 0 ? 1 : 0;
  }

  const files = onDisk();
  const todo = FORCE ? plan : plan.filter((shot) => !files.has(shot.assetId));
  console.log(`전부 ${plan.length}개 중 ${todo.length}개를 찍습니다.\n`);

  const browser = await chromium.launch();
  const failures = [];
  const probes = {};
  let done = 0;
  let context = null;
  let contextKey = null;
  let page = null;

  for (const shot of todo) {
    const viewport = shot.viewport ?? "desktop";
    const recipe = RECIPES[shot.page];
    const key = `${shot.page}|${shot.theme ?? "-"}|${viewport}`;
    try {
      const isNew = key !== contextKey || recipe.fresh === true;
      if (isNew) {
        await context?.close();
        context = await browser.newContext({
          viewport: VIEWPORTS[viewport],
          deviceScaleFactor: 2,
          reducedMotion: "reduce",
          colorScheme: shot.theme === "light" ? "light" : "dark",
          locale: "en-US",
        });
        contextKey = recipe.fresh === true ? null : key;
        page = await context.newPage();
      }
      await page.goto(recipe.url(shot), { waitUntil: "domcontentloaded", timeout: 60_000 });
      // `ready`가 먼저다 — 테마를 바꾸려면 워크벤치가 떠 있어야 한다.
      await recipe.ready?.(page, shot);
      if (isNew) await recipe.theme?.(page, shot.theme);
      await shot.setup?.(page);
      const { probe } = await shoot(page, shot);
      probes[shot.assetId] = probe;
      done += 1;
      console.log(`  ok    ${shot.assetId}`);
    } catch (error) {
      failures.push([shot.assetId, String(error).split("\n")[0]]);
      console.log(`  실패  ${shot.assetId} — ${String(error).split("\n")[0]}`);
      contextKey = null;
      await context?.close().catch(() => {});
      context = null;
    }
    await sleep(politeMs(shot.page));
  }
  await context?.close();
  await browser.close();

  mergeProbe(probes);
  const { indexed, missing } = writeIndex();
  console.log(`\n찍음 ${done} · 실패 ${failures.length} · 색인 ${indexed} · 설명 없음 ${missing.length}`);
  report(failures, missing);
  return failures.length > 0 ? 1 : 0;
};

process.exitCode = await main();
