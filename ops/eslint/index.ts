import js from "@eslint/js";
import importX from "eslint-plugin-import-x";
import tseslint from "typescript-eslint";
import type { Linter } from "eslint";
import { arkaRules } from "../eslint-rules";

/**
 * 이 저장소의 린트 플러그인. 커스텀 규칙과 **모든 패키지가 공유하는 바탕**을 함께 낸다.
 *
 * 각 패키지가 자기 `eslint.config.ts`를 갖는다 — 규칙의 대부분이 그 패키지 전용이기 때문이다.
 * 그런데 **중첩 설정은 병합이 아니라 대체**라(ESLint 10에서 실측), 패키지 설정이 생기는 순간
 * 바탕까지 함께 사라진다. 그래서 바탕을 여기서 내보내고 각 설정이 앞에 펼친다.
 *
 * ```ts
 * import ops from "ops/eslint";
 * export default [...ops.configs.base, { files: ["src/**"], rules: { … } }];
 * ```
 */
const base: Linter.Config[] = [
  // 산출물은 검사하지 않는다 — 번들된 코드가 규칙에 걸려도 고칠 소스가 여기가 아니다.
  { ignores: ["**/node_modules/**", "**/dist/**", "**/storybook-static/**", "**/.output/**"] },

  // 플러그인은 **여기서 한 번만** 등록한다. 패키지 설정이 다시 등록하면 같은 이름에 다른
  // 객체가 걸려 `Cannot redefine plugin "arka"`로 죽는다 — 정의는 배열 전체에 누적된다.
  { plugins: { arka: arkaRules } },
  // `import-x`도 여기서 한 번만 등록한다. 세 패키지가 각자 등록하던 것을 모았다 — 같은 이름에
  // 다른 객체가 걸리면 `Cannot redefine plugin`으로 죽는다. zone 설정은 각 패키지가 얹는다.
  { plugins: { "import-x": importX } },
  {
    // **선언하지 않은 것을 import하면 잡는다.** Node와 ESLint의 해석기가 `node_modules`를 위로
    // 걸어 올라가 저장소 루트에서 찾아 주기 때문에, 선언이 빠져도 조용히 동작한다 — 이 규칙이
    // 없으면 패키지가 스스로 설 수 있는지 아무도 모른다.
    files: ["**/*.{ts,tsx,js}"],
    rules: { "import-x/no-extraneous-dependencies": "error" },
  },

  js.configs.recommended as Linter.Config,

  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "@typescript-eslint": tseslint.plugin as never },
    languageOptions: {
      parser: tseslint.parser as never,
      // parserOptions.project를 일부러 두지 않는다. 경계 규칙은 import 경로만 보고
      // 타입 정보가 필요 없어서, 타입 검사 프로그램을 만들지 않으면 그만큼 컴파일러 API에 덜 묶인다.
      parserOptions: { sourceType: "module", ecmaVersion: "latest" },
    },
    rules: {
      // zod 스키마를 `export const X` + `export type X`로 함께 내보내는데, 코어 규칙은
      // 이걸 재선언으로 본다. 진짜 재선언은 tsc가 잡는다.
      "no-redeclare": "off",
      // 인터페이스 메서드의 파라미터를 미사용으로 본다. tsconfig의
      // noUnusedLocals/noUnusedParameters가 TS 의미를 알고 같은 일을 한다.
      "no-unused-vars": "off",
      // 코어 규칙은 어떤 전역이 있는지 스스로 알 수 없어 `process` 같은 것을 미정의로 본다.
      // 각 패키지 tsconfig의 `types`가 전역을 정하고 tsc가 검사한다.
      "no-undef": "off",
      // 흡수해 온 코드가 몇 자리에서 이것들을 eslint-disable로 지목한다. 규칙이 꺼져 있으면
      // 그 주석이 "쓸모없는 지시"로 남아 오히려 노이즈가 된다.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-empty-object-type": "error",
    },
  },

  // 테스트 이름은 한글로. 실패 출력이 곧 리뷰 대상이다(→ ADR 0008).
  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "**/*.contract.ts"],
    rules: {
      "arka/test-names-korean": "error",
      // 스냅샷은 변경 시 무비판적으로 갱신하게 된다. → ADR 0008
      // `no-restricted-properties`가 아니라 selector인 것은, 그 규칙이 `expect.toMatchSnapshot`만
      // 잡고 실제 형태인 `expect(x).toMatchSnapshot()`은 못 잡기 때문이다.
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[property.name=/^toMatch(Inline)?Snapshot$/]",
          message: "`toMatchSnapshot`을 쓰지 않습니다. 무엇이 왜 그래야 하는지를 단언으로 적으세요. 화면 모양은 VRT(`packages/client/test/vrt/`)가 봅니다.",
        },
      ],
    },
  },
  // 던더 폴더를 쓰지 않는다 — 같은 것을 폴더명과 파일명 두 군데로 표시하게 된다.
  // **테스트 블록보다 뒤에 온다** — 둘 다 `no-restricted-syntax`라, `__tests__/a.test.ts`처럼
  // 양쪽에 맞는 파일은 나중 것만 걸린다. 던더가 이겨야 한다.
  {
    files: ["**/__tests__/**", "**/__mocks__/**", "**/__fixtures__/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: "Program", message: "던더 폴더를 쓰지 않습니다 — 테스트는 대상 옆에 `*.test.ts`로 두세요(ADR 0008)." },
      ],
    },
  },

];

export default { rules: arkaRules.rules, configs: { base } };
