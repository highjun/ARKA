import { existsSync } from "node:fs";
import path from "node:path";
import type { Rule } from "eslint";

/** 컴포넌트가 사는 자리 — `shared/components/**`와 슬라이스의 `component/**`. */
const isComponentPath = (segments: readonly string[]): boolean =>
  segments.includes("component") || (segments.includes("shared") && segments.includes("components"));

/**
 * 컴포넌트 폴더의 주인 파일(`FileTree/FileTree.tsx`)에는 스토리가 있어야 한다(→ ADR 0008).
 *
 * `view/`는 대상이 아니다 — 조합이 드러나는 것만 고르기로 했고 그 목록은 `.storybook/main.ts`에
 * 있다(CONVENTIONS "테스트"). 폴더의 곁다리 파일(`shared.ts`, 훅)도 대상이 아니다. 주인 파일만 본다.
 *
 * 2026-09-09에 켰다 — "전건 위반인 규칙은 규칙이 아니라 백로그"라 미뤄 뒀던 것을 실측해
 * 위반 0을 확인한 뒤다. 스토리가 3개일 때 켰으면 전면 빨간불이었다.
 */
export const componentsHaveStories: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: { description: "component/와 shared/components/의 컴포넌트에는 스토리가 있다" },
    messages: {
      missing:
        "`{{name}}.stories.tsx`가 없습니다 — 컴포넌트의 시각 검증은 Storybook이 맡습니다(ADR 0008). 최소 세트는 기본/빈/로딩/에러입니다. 스토리가 필요 없는 자리라면 그 파일은 `component/`가 아니라 다른 계층입니다.",
    },
    schema: [],
  },
  create(context) {
    const segments = path.relative(context.cwd, context.filename).split(path.sep);
    const file = segments.pop() ?? "";
    if (!file.endsWith(".tsx") || file.endsWith(".test.tsx") || file.endsWith(".stories.tsx")) return {};
    if (!segments.includes("src") || !isComponentPath(segments)) return {};

    // 컴포넌트 폴더의 **주인 파일**만 본다 — `FileTree/FileTree.tsx`는 맞고 `FileTree/shared.ts`는 아니다.
    const name = file.slice(0, -".tsx".length);
    if (segments.at(-1) !== name) return {};

    return {
      Program(node) {
        const story = path.join(path.dirname(context.filename), `${name}.stories.tsx`);
        if (!existsSync(story)) context.report({ node, messageId: "missing", data: { name } });
      },
    };
  },
};
