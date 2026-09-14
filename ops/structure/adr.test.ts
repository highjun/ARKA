import { describe, expect, it } from "vitest";
import { ADRS, read } from "./repo.ts";
import { activeEslintRules, declaredPackages } from "./config.ts";

/** 자리가 고정된 절. `대가:`만 선택이다(→ ADR 0004의 이웃, `docs/CONVENTIONS.md`). */
const SECTIONS = ["맥락", "결정", "기각", "대가", "강제", "상태"] as const;
const OPTIONAL = new Set(["대가"]);

/** 본문(제목 줄 제외) 상한. 넘으면 결정이 아니라 설명이 자라고 있다는 신호다. */
const MAX_BODY_LINES = 40;

/** `상태:`의 첫 낱말. `제안됨`은 없다 — ADR 파일은 결정된 뒤에만 생긴다. */
const STATUS_WORDS = ["승인됨", "대체됨", "폐기됨"] as const;

/**
 * `강제:` 줄이 쓸 수 있는 장치 이름. **늘리려면 이 줄을 고쳐야 한다** — 그것이 "무엇이
 * 알려주는가"에 새 종류를 더한다는 선언이고, 리뷰가 볼 자리다.
 */
const ENFORCERS = new Set([
  "린트", "타입", "테스트", "리뷰", "파이프라인", "스모크",
  "stylelint", "commitlint", "gitleaks", "markdownlint", "actionlint",
  "룰셋", "CODEOWNERS", "워크플로", "배포 잡", "compose",
]);

/** 절 이름 → 그 절의 본문 줄들. */
const sectionsOf = (body: string): Map<string, string[]> => {
  const found = new Map<string, string[]>();
  let current: string | null = null;
  for (const line of body.split("\n")) {
    const heading = /^## (?<name>.+):$/u.exec(line)?.groups?.["name"];
    if (heading !== undefined) {
      current = heading;
      found.set(heading, []);
      continue;
    }
    if (current !== null) found.get(current)?.push(line);
  }
  return found;
};

/** 백틱 안의 토큰. 규칙 ID·경로·패키지 이름이 전부 이 모양으로 적힌다. */
const backticked = (line: string): string[] => [...line.matchAll(/`(?<token>[^`]+)`/gu)].map((m) => m[1] ?? "");

const isPath = (token: string) => /^(?:packages|ops|docs|\.github)\//u.test(token) || /\.(?:ts|tsx|css|json|ya?ml)$/u.test(token);

/**
 * 규칙 ID나 패키지 이름의 **모양**. 하이픈이나 `/`가 있어야 한다 — 한 낱말짜리 백틱
 * (`main`·`check`·`contracts`)은 브랜치·잡·패키지 이름이라 실효 설정에서 찾을 것이 없다.
 */
const isCitable = (token: string) =>
  !isPath(token) &&
  !token.includes(" ") &&
  !token.endsWith("/") &&
  !/^(?:aria|data)-/u.test(token) &&
  /^@?[a-z0-9][a-z0-9@/*.-]*$/u.test(token) &&
  /[-/]/u.test(token);

describe("ADR 형식", () => {
  it("ADR을 하나라도 찾는다 — 글롭이 낡으면 이 스위트가 조용히 비어 버린다", () => {
    expect(ADRS.length).toBeGreaterThan(5);
  });

  it.each(ADRS)("%s — 절이 정해진 순서로 있다", (file) => {
    const order = [...sectionsOf(read(file)).keys()];
    const required = SECTIONS.filter((name) => !OPTIONAL.has(name) || order.includes(name));

    expect(order).toEqual(required);
  });

  it.each(ADRS)(`%s — 본문이 ${MAX_BODY_LINES}줄을 넘지 않는다`, (file) => {
    expect(read(file).split("\n").length - 1).toBeLessThanOrEqual(MAX_BODY_LINES);
  });

  it.each(ADRS)("%s — `상태:`가 한 줄이고 어휘가 셋 중 하나다", (file) => {
    const status = (sectionsOf(read(file)).get("상태") ?? []).filter((line) => line.trim() !== "");

    expect(status).toHaveLength(1);
    expect(STATUS_WORDS).toContain(status[0]?.split(" ")[0]);
  });

  it.each(ADRS)("%s — `강제:` 줄이 장치 이름으로 시작하고 `아무도`가 없다", (file) => {
    const lines = (sectionsOf(read(file)).get("강제") ?? []).filter((line) => line.startsWith("- "));
    const labels = lines.map((line) => /^- \*\*(?<label>[^*]+)\*\*/u.exec(line)?.groups?.["label"]);

    expect(lines.length).toBeGreaterThan(0);
    expect(labels.filter((label) => label === undefined || !ENFORCERS.has(label))).toEqual([]);
    expect(lines.filter((line) => line.includes("아무도"))).toEqual([]);
  });
});

/**
 * **거짓 인용이 세 번 났다** — `primer/…`(실제는 `primer-react/…`)가 두 ADR에, 그 앞에 둘이 더.
 * 셋 다 초록으로 통과해 `main`에 들어갔다. 여기서 실효 설정과 대조한다.
 */
describe("ADR이 인용한 강제 장치가 실재한다", async () => {
  const active = await activeEslintRules();
  const packages = declaredPackages();

  /** `a/b`·`a/*`처럼 접두가 붙은 것과, 앞의 접두를 물려받는 맨이름 둘 다 받는다. */
  const exists = (token: string, inherited: string | null): boolean => {
    if (token.endsWith("/*")) {
      const prefix = token.slice(0, -1);
      return [...active].some((name) => name.startsWith(prefix));
    }
    if (active.has(token)) return true;
    return inherited !== null && active.has(`${inherited}/${token}`);
  };

  it.each(ADRS)("%s — `강제:`가 가리킨 규칙 ID와 패키지가 실재한다", (file) => {
    const missing: string[] = [];
    for (const line of sectionsOf(read(file)).get("강제") ?? []) {
      /* `a/b`·`c` 처럼 접두를 한 번만 적고 이어 쓰는 관례를 받는다 — 맨이름은 앞의 접두도 본다. */
      let inherited: string | null = null;
      for (const token of backticked(line)) {
        if (token.includes("/") && !token.endsWith("/*")) inherited = token.slice(0, token.lastIndexOf("/"));
        if (!isCitable(token)) continue;
        if (exists(token, inherited) || packages.has(token)) continue;
        missing.push(token);
      }
    }

    expect(missing).toEqual([]);
  });
});
