import type { ESLint } from "eslint";
import { modelIsStateLibraryFree } from "./modelIsStateLibraryFree";
import { viewOnlyUsesViewModel } from "./viewOnlyUsesViewModel";

/**
 * 이 저장소의 구조를 강제하는 규칙들.
 *
 * 패키지로 만들지 않는다 — 여러 리포에 배포할 이유가 사라졌고(그게 흡수의 목적이었다),
 * `eslint.config.ts`가 상대경로로 바로 불러 쓰면 된다.
 */
export const arkaRules: ESLint.Plugin = {
  rules: {
    "view-only-uses-view-model": viewOnlyUsesViewModel,
    "model-is-state-library-free": modelIsStateLibraryFree,
  },
};
