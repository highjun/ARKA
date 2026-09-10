import type { ESLint } from "eslint";
import { maxCommentLines } from "./maxCommentLines";

/**
 * 이 저장소의 결정을 강제하는 규칙들.
 *
 * 패키지로 만들지 않는다 — 여러 리포에 배포할 이유가 없고, `ops/lint/index.ts`가 바로 등록하면 된다.
 * 규칙마다 `*.test.ts`에 valid/invalid fixture가 있다 — 규칙이 죽어 있어도 초록이기 때문이다.
 */
export const arkaRules: ESLint.Plugin = {
  rules: { "max-comment-lines": maxCommentLines },
};
