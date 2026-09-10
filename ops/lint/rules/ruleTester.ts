import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe, it } from "vitest";

/**
 * 규칙 fixture 테스트의 공통 설정. TS 파서를 쓰고, vitest의 `describe`/`it`에 케이스를 건다 —
 * 그래야 케이스 하나하나가 테스트 결과에 이름으로 보인다.
 */
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

/** 케이스마다 새로 만든다 — `RuleTester`는 한 번 `run`하면 재사용을 전제하지 않는다. */
export const createRuleTester = (): RuleTester =>
  new RuleTester({
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { sourceType: "module", ecmaVersion: "latest", ecmaFeatures: { jsx: true } },
    },
  });
