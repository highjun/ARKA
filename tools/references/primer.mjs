/**
 * Primer 스토리북의 `index.json`을 **타깃으로 편다.** 이름을 손으로 안 적는 것이 요점이다 —
 * 스토리 id가 곧 컴포넌트 이름이라(`components-button--default`) 내가 짐작할 자리가 없다.
 *
 * [ADR 0009](../../docs/adr/0009-primer-first.md)가 "`shared/`는 Primer에서 온다"고 정했고,
 * `Blankslate`·`SkeletonText`처럼 `Experimental/`에만 있는 것도 거기 적혀 있어 함께 담는다.
 *
 * `/Features`·`/Examples` 800여 개는 담지 않는다 — 긴 꼬리가 색인을 덮는다.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PROBE, ensureOutput } from "./paths.mjs";
import { PRIMER_NOTES } from "./primer-notes.mjs";

const STORYBOOK = "https://primer.style/react/storybook";
const CACHE = path.join(path.dirname(PROBE), "primer-index.json");
const A_WEEK = 7 * 24 * 60 * 60 * 1000;

/** 스토리 목록. 한 번 받아 캐시한다 — `--list`가 매번 네트워크를 때리지 않게. */
const load = async () => {
  ensureOutput();
  if (existsSync(CACHE)) {
    const cached = JSON.parse(readFileSync(CACHE, "utf8"));
    if (Date.now() - cached.at < A_WEEK) return cached.entries;
  }
  const response = await fetch(`${STORYBOOK}/index.json`);
  if (!response.ok) throw new Error(`Primer 스토리 목록을 못 받았습니다: ${response.status}`);
  const { entries } = await response.json();
  writeFileSync(CACHE, JSON.stringify({ at: Date.now(), entries }, null, 2));
  return entries;
};

const kebab = (name) =>
  name
    .replace(/([a-z0-9])([A-Z])/gu, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/gu, "$1-$2")
    .toLowerCase();

/** `Components/<Name>`과 `Experimental/Components/<Name>`의 **기본 스토리** 하나씩. */
export const primerTargets = async () => {
  const entries = Object.values(await load()).filter((entry) => entry.type !== "docs");
  const picked = new Map();
  for (const stable of [true, false]) {
    for (const entry of entries) {
      const match = /^(?<prefix>Experimental\/)?Components\/(?<name>[A-Za-z][A-Za-z0-9]*)$/u.exec(entry.title);
      if (match === null) continue;
      const experimental = match.groups.prefix !== undefined;
      if (experimental === stable) continue;
      const name = match.groups.name;
      const better = picked.get(name);
      // 기본 스토리를 고른다. 없으면 그 타이틀의 첫 스토리.
      if (better !== undefined && !(better.name !== "Default" && entry.name === "Default")) continue;
      picked.set(name, { ...entry, experimental });
    }
  }
  return [...picked.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, entry]) => ({
      id: `primer-primitive-${kebab(name)}`,
      product: "Primer",
      category: "primitive",
      page: "primer",
      // 스토리북은 스토리 하나만 이 뿌리에 그린다. 포털로 빠지는 것(다이얼로그·메뉴)은 화면을 찍는다.
      selector: "#storybook-root",
      fallbackViewport: true,
      viewport: "story",
      maxHeight: 820,
      description: PRIMER_NOTES[kebab(name)],
      storyId: entry.id,
      source: `${entry.title} › ${entry.name}${entry.experimental ? " (experimental)" : ""}`,
    }));
};

export const primerUrl = (shot) =>
  `${STORYBOOK}/iframe.html?id=${shot.storyId}&viewMode=story${shot.theme === "light" ? "" : "&globals=colorScheme:dark"}`;
