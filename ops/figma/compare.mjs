#!/usr/bin/env node
/**
 * **스토리와 그림을 나란히 놓고 얼마나 다른지 센다.**
 *
 *     pnpm --filter client dev:storybook          # 먼저 띄운다(6006)
 *     node ops/figma/compare.mjs                  # 전부
 *     node ops/figma/compare.mjs Sidebar Shell    # 이름으로 걸러서
 *
 * 스토리북 개발 서버가 애드온(`storybook-addon-figma-sync`)의 엔드포인트를 낸다 —
 * 스토리로 옮겨 가 화면을 찍고, 그림을 받아, `pixelmatch` 로 비교해 닮음 정도를 돌려준다.
 * 받은 그림·찍은 그림·차이 그림은 `.storybook/.storybook-addon-figma-sync/` 에 쌓인다.
 *
 * **Code Connect 가 하던 일을 이 표가 대신한다** — 그것은 Organization 전용이라 우리 플랜에서
 * 막혀 있다. 스토리 제목의 마지막 조각으로 세트를 찾고(`01-workbench/Sidebar` → `Sidebar/Root`),
 * 못 찾으면 건너뛴 까닭을 적는다. 조용히 빠지면 무엇을 안 봤는지 알 수 없다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STORYBOOK = process.env["STORYBOOK_URL"] ?? "http://localhost:6006";
const LINKS = JSON.parse(readFileSync(path.join(HERE, "links.json"), "utf8"));

/** `60:18900` → `60-18900`. Figma 웹 주소는 하이픈을 쓴다. */
const toUrlId = (id) => id.replace(":", "-");

/** 세트 하나를 가리키는 주소. 기본 변형을 겹친다 — 세트를 겹치면 변형이 격자로 늘어선 그림이 온다. */
const figmaUrl = (entry) => `https://www.figma.com/design/${LINKS.fileKey}/ARKASHIC?node-id=${toUrlId(entry.default)}`;

/**
 * 스토리 제목 → 세트 이름. `01-workbench/Sidebar` 는 컴파운드면 `Sidebar/Root`, 아니면 `Sidebar`.
 * 둘 다 없으면 `null` — 그림이 없는 스토리다(`ShellView` 처럼 조합만 보는 것).
 */
const setNameOf = (title) => {
  const last = title.split("/").at(-1);
  if (last === undefined) return null;
  if (LINKS.nodes[`${last}/Root`] !== undefined) return `${last}/Root`;
  if (LINKS.nodes[last] !== undefined) return last;
  return null;
};

const main = async () => {
  const 걸러낼말 = process.argv.slice(2);

  const indexRes = await fetch(`${STORYBOOK}/index.json`);
  if (!indexRes.ok) {
    console.error(`스토리북을 못 읽는다(${String(indexRes.status)}). 먼저 띄운다 — pnpm --filter client dev:storybook`);
    process.exit(2);
  }
  const index = await indexRes.json();
  const entries = Object.values(index.entries ?? {}).filter((e) => e.type === "story");

  const 잰것 = [];
  const 건너뛴것 = [];
  for (const story of entries) {
    const setName = setNameOf(story.title);
    if (setName === null) {
      건너뛴것.push({ story: story.id, 까닭: `그림 없음 — ${story.title}` });
      continue;
    }
    if (걸러낼말.length > 0 && !걸러낼말.some((word) => setName.includes(word) || story.title.includes(word))) continue;

    const url = figmaUrl(LINKS.nodes[setName]);
    const query = new URLSearchParams({ storyId: story.id, figmaUrl: url });
    const res = await fetch(`${STORYBOOK}/api/figma-sync/screenshot?${query.toString()}`);
    if (!res.ok) {
      건너뛴것.push({ story: story.id, 까닭: `찍기 실패 ${String(res.status)}` });
      continue;
    }
    const body = await res.json();
    잰것.push({ story: story.id, 세트: setName, 닮음: body.similarity ?? null, diff: body.diffSrc ?? null });
  }

  잰것.sort((a, b) => (a.닮음 ?? 0) - (b.닮음 ?? 0));
  for (const row of 잰것) {
    const score = row.닮음 === null ? "  ?  " : `${row.닮음.toFixed(1).padStart(5)}%`;
    console.log(`${score}  ${row.세트.padEnd(28)} ${row.story}`);
  }
  if (건너뛴것.length > 0) {
    console.log(`\n건너뛴 것 ${String(건너뛴것.length)}`);
    for (const row of 건너뛴것) console.log(`  ${row.story} — ${row.까닭}`);
  }
};

await main();
