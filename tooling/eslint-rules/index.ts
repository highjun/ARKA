import type { ESLint } from "eslint";
import { modelIsStateLibraryFree } from "./modelIsStateLibraryFree";
import { slicesAreSiblings } from "./slicesAreSiblings";
import { testNamesKorean } from "./testNamesKorean";
import { viewOnlyUsesViewModel } from "./viewOnlyUsesViewModel";

/**
 * 이 저장소의 구조를 강제하는 규칙들.
 *
 * 패키지로 만들지 않는다 — 여러 리포에 배포할 이유가 사라졌고(그게 흡수의 목적이었다),
 * `eslint.config.ts`가 상대경로로 바로 불러 쓰면 된다.
 *
 * 규칙마다 `*.test.ts`에 valid/invalid fixture가 있다 — 규칙이 죽어 있어도 초록이기 때문이다.
 */
export const arkaRules: ESLint.Plugin = {
  rules: {
    "view-only-uses-view-model": viewOnlyUsesViewModel,
    "model-is-state-library-free": modelIsStateLibraryFree,
    "slices-are-siblings": slicesAreSiblings,
    "test-names-korean": testNamesKorean,
  },
};
