import eslintReact from "@eslint-react/eslint-plugin";
import jsxA11y from "eslint-plugin-jsx-a11y";
import primerReact from "eslint-plugin-primer-react";
import reactHooks from "eslint-plugin-react-hooks";
import storybook from "eslint-plugin-storybook";
import ops from "ops/lint";

/**
 * `no-restricted-syntax` 는 **한 파일에 한 배열**이다 — 같은 규칙 이름을 여러 블록에 두면 나중
 * 블록이 앞의 것을 통째로 덮는다(2026-09-09에 겪고, 2026-09-14에 또 겪었다). 그래서 공통 선택자를
 * 여기 모아 두고 블록마다 펴 쓴다.
 */
const RESTRICTED_SYNTAX = [
  // **`#contracts`로 가져온다**(→ ADR 0001). 맨이름 `"contracts"`는 서드파티와 구분되지 않는다.
  // `import-x`로는 못 한다 — 둘이 같은 파일로 풀려 구분이 사라진다. 문자열을 보는 코어 규칙이라야
  // 갈린다. `no-restricted-imports`는 동적 `import()`를 놓쳐서(2026-09-10 실측) 형태별로 넷이다.
  ...["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration", "ImportExpression"].map((node) => ({
    selector: `${node}[source.value=/^contracts(\\/|$)/]`,
    message: "`#contracts`로 가져오세요 — 맨이름은 서드파티와 구분되지 않습니다.",
  })),
  // 테스트 이름을 보던 셀렉터 둘은 `vitest/valid-title`로 갈았다(→ ADR 0011).
  /*
   * **props 바탕은 `ComponentPropsWithoutRef<'tag'>`다**(→ ADR 0008). `HTMLAttributes<HTMLXElement>`는
   * 원소 고유 속성을 빠뜨린다 — `href`·`disabled`·`type`이 없어서 소비처가 캐스트하게 된다.
   * 루트 태그가 갈리는 컴포넌트만 예외이고, 그 자리는 사유를 적은 `eslint-disable`로 드러난다.
   */
  {
    selector: "TSTypeReference > Identifier[name=/^(?:[A-Za-z]+)?HTMLAttributes$/]",
    message: "props 바탕은 `ComponentPropsWithoutRef<'tag'>`를 쓰세요 — 원소 고유 속성이 빠집니다(→ ADR 0008).",
  },
];

/** client의 슬라이스. 새 슬라이스를 더할 때 여기 한 줄을 빼먹으면 그 슬라이스만 검사에서 빠진다. */
const SLICES = ["agent", "filesystem", "git", "markdown", "search"];

/**
 * **의존은 안쪽을 향한다**(→ ADR 0007). 계층마다 *자기 슬라이스 안에서* 볼 수 있는 것.
 *
 * `view`가 `model`을 보는 것은 DI 토큰과 타입 때문이다 — 값을 읽는 길은 `useViewModel` 하나고
 * 그건 위 선택자가 따로 본다.
 */
const LAYER_ALLOW: Readonly<Record<string, readonly string[]>> = {
  model: ["model"],
  infra: ["model", "infra"],
  viewmodel: ["model", "viewmodel"],
  view: ["model", "viewmodel", "view", "component"],
  component: ["component"],
};

/** 슬라이스를 품는 뿌리마다 계층 zone을 낸다. `core/`·`shared/`는 계층이 없어 대상이 아니다. */
const LAYER_ZONES = ["./src/workbench", ...SLICES.map((slice) => `./src/extensions/${slice}`)].flatMap((root) =>
  Object.entries(LAYER_ALLOW).map(([layer, allowed]) => ({
    target: `${root}/${layer}`,
    from: root,
    except: allowed.map((name) => `./${name}`),
    message: "의존은 안쪽을 향합니다 — 이 계층은 자기 아래만 봅니다(→ ADR 0007).",
  })),
);

/** `view/`에만 더 걸리는 것 — 훅 하나와 DI 접근 금지(→ ADR 0007). */
/*
 * **브라우저 패키지에 Node 전역이 보인다** — `tsconfig`의 `types: ["vitest/globals"]`가
 * `@types/node`를 전이로 끌고 온다(→ TASK-44). `types` 배열은 전역 자동 포함만 통제하고 전이
 * 의존은 못 막으니 여기서 막는다. `test/`·`vite.config.ts`·`.storybook/`은 Node에서 돌아 대상이 아니다.
 */
const NODE_GLOBALS = [
  { name: "process", message: "브라우저 패키지입니다 — 빌드 타임 값은 `import.meta.env`를 쓰세요." },
  { name: "Buffer", message: "브라우저 패키지입니다 — `Uint8Array`나 `TextEncoder`를 쓰세요." },
  { name: "__dirname", message: "브라우저 패키지입니다 — 경로는 `import.meta.url`을 쓰세요." },
  { name: "__filename", message: "브라우저 패키지입니다 — 경로는 `import.meta.url`을 쓰세요." },
  { name: "global", message: "브라우저 패키지입니다 — `globalThis`를 쓰세요." },
  { name: "require", message: "ESM입니다 — `import`를 쓰세요." },
];

/*
 * **`model/`·`viewmodel/`은 브라우저 API를 직접 보지 않는다**(→ ADR 0007). 플랫폼에 닿는 것은
 * 조립부(`registerServices.tsx`)가 얇은 함수로 주입한다 — 그래야 이 계층이 jsdom 없이도 돈다.
 * 규약과 코드 주석이 이 규칙을 인용해 왔는데 정작 설정에는 없었다(2026-09-14 실측).
 */
const PLATFORM_GLOBALS = [
  "fetch",
  "window",
  "document",
  "navigator",
  "location",
  "localStorage",
  "sessionStorage",
  "alert",
  "confirm",
  "prompt",
].map((name) => ({
  name,
  message: "`model/`·`viewmodel/`은 플랫폼에 직접 닿지 않습니다 — 조립부가 주입하는 함수를 받으세요(→ ADR 0007).",
}));

const VIEW_ONLY_SYNTAX = [
  {
    selector: 'CallExpression[callee.name=/^use[A-Z]/]:not([callee.name="useViewModel"])',
    message: "`view/`는 `useViewModel` 하나만 부릅니다 — 상태가 필요하면 ViewModel로 올리세요(→ ADR 0007).",
  },
  {
    selector: 'CallExpression[callee.property.name="resolve"]',
    message: "`view/`는 DI 컨테이너를 직접 보지 않습니다 — `useViewModel`이 그 자리입니다(→ ADR 0007).",
  },
];

/**
 * 클라이언트의 린트 설정.
 */
export default [
  ...ops.configs.base,

  {
    // 훅 규칙. 의존성 배열을 일부러 좁힌 자리(CodeMirror 에디터)를 eslint-disable로 여는데,
    // 플러그인이 없으면 그 주석 자체가 에러가 된다.
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: { "react-hooks/rules-of-hooks": "error", "react-hooks/exhaustive-deps": "warn" },
  },

  {
    // Primer 를 잘못 쓰는 것을 그 배포자가 잡는다(→ ADR 0009). 프리셋을 통째로 켜는 것은 규칙
    // 전부가 결정 하나에 달려 있어서다(→ ADR 0011). 이 플러그인의 `configs.recommended`는
    // eslintrc 모양(`parserOptions`)이라 그대로 못 펴고 `plugins`·`rules`·`settings`만 가져온다.
    files: ["src/**/*.tsx"],
    plugins: { "primer-react": primerReact },
    settings: primerReact.configs.recommended.settings,
    rules: {
      ...primerReact.configs.recommended.rules,
      /*
       * 프리셋 밖의 규칙. ADR이 인용하던 셋 중 **이것만** 켠다 — 나머지 둘은 우리 결정과
       * 어긋난다는 것을 실측으로 확인했고 그 ADR의 `기각:`으로 옮겼다.
       */
      // 폐기된 진입점(→ ADR 0009).
      "primer-react/no-deprecated-entrypoints": "error",
      // 와일드카드 import — 무엇을 쓰는지 감춘다.
      "primer-react/no-wildcard-imports": "error",
      // CSS Modules 는 default import 로 받는다.
      "primer-react/enforce-css-module-default-import": "error",
    },
  },

  {
    // 원소 JSX 의 접근성. `primer-react` 가 딸려 오게 하는 것과 같은 플러그인이다.
    files: ["src/**/*.tsx"],
    plugins: { "jsx-a11y": jsxA11y },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      // 포커스 받는 `separator` 는 창 분할 손잡이의 정본 패턴이다(WAI-ARIA window splitter).
      // 규칙의 기본 허용 목록에 `tabpanel` 만 있어 더한다.
      "jsx-a11y/no-noninteractive-tabindex": ["error", { tags: [], roles: ["tabpanel", "separator"] }],
    },
  },

  {
    // React 19 전용 — `forwardRef` 는 더 쓰지 않는다(→ ADR 0008).
    files: ["src/**/*.tsx"],
    plugins: { "@eslint-react": eslintReact },
    rules: { "@eslint-react/no-forward-ref": "error", "@eslint-react/no-context-provider": "error" },
  },

  /*
   * 스토리 파일의 모양. **프리셋을 그대로 펴야 한다** — 블록이 셋이고(설정·스토리 글롭·
   * `.storybook/main` 글롭) `.at(-1)`로 하나만 집으면 규칙 12개가 조용히 빠진 채 초록이
   * 된다(2026-09-14에 그 상태로 머지됐다). 글롭도 프리셋의 것을 쓴다 — `.storybook/main.ts`를
   * 보는 `no-uninstalled-addons`는 스토리 파일에 걸 규칙이 아니다.
   */
  ...storybook.configs["flat/recommended"],

  {
    files: ["src/**/*.{ts,tsx}", "test/**/*.ts", ".storybook/*.{ts,tsx}", "*.config.ts"],
    rules: {
      "no-restricted-syntax": ["error", ...RESTRICTED_SYNTAX],
      // 다른 패키지를 상대경로로 가져오는 것(`../../contracts/src/…`). 해석에 기대므로 바탕의
      // 리졸버가 서야 한다. `no-internal-modules`는 쓰지 않는다 — `#contracts`·`#core/di` 같은
      // 서브패스 import를 전부 위반으로 보고, 위 정규식이 `contracts/*`를 이미 덮는다.
      "import-x/no-relative-packages": "error",
      /*
       * 슬라이스끼리 직접 import하지 않는다(→ ADR 0007). 슬라이스를 열거하는 것은
       * `eslint-plugin-boundaries`의 캡처 변수(`{{from.slice}}`)가 v7에서 우리 배치에 안 걸렸기
       * 때문이다 — 다섯 줄이면 정확히 같은 경계를 표현한다. 새 슬라이스를 더할 때 여기 한 줄을
       * 빼먹으면 그 슬라이스만 검사에서 빠진다(리뷰가 볼 자리다).
       */
      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./src",
              from: "../server/src",
              message:
                "client는 server를 import할 수 없습니다. 공유할 코드는 contracts로 옮기고 `#contracts`로 가져오세요.",
            },
            ...SLICES.map((slice) => ({
              target: `./src/extensions/${slice}`,
              from: "./src/extensions",
              except: [`./${slice}`],
              message: "슬라이스끼리 직접 import하지 않습니다 — DI 토큰이나 이벤트로 소통하세요(→ ADR 0007).",
            })),
            // `shared/`는 아무것도 import할 수 없다 — 공통 추출은 아래로만 한다(→ ADR 0007).
            {
              target: "./src/shared",
              from: "./src",
              except: ["./shared"],
              message: "`shared/`는 아무것도 import하지 않습니다 — 공통 추출은 아래로만 합니다(→ ADR 0007).",
            },
            // `core/`는 도메인을 모른다. 아래(`shared/`)만 본다.
            {
              target: "./src/core",
              from: "./src",
              except: ["./core", "./shared"],
              message: "`core/`는 도메인을 모릅니다 — `workbench/`·`extensions/`를 import하지 않습니다(→ ADR 0007).",
            },
            ...LAYER_ZONES,
          ],
        },
      ],
    },
  },

  {
    // Primer `IconButton`을 직접 가져오면 터치 최소 타겟 CSS를 잃는다(→ ADR 0009). 여기서만
    // `no-restricted-imports`를 쓰는 이유는 막을 것이 모듈 이름이 아니라 **가져오는 이름**이고
    // `importNames`가 별칭(`IconButton as PrimerIconButton`)까지 잡기 때문이다. 그 겹 자신은
    // 가져와야 하므로 `ignores`로 대상에서 뺀다 — 규칙을 끄는 것이 아니다.
    files: ["src/**/*.{ts,tsx}"],
    // `ModeToggle`은 겹을 쓰면 자기 `data-component`를 잃는다(→ TASK-64). 그때까지만 예외다.
    ignores: ["src/shared/component/IconButton/**", "src/shared/component/ModeToggle/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@primer/react",
              importNames: ["IconButton"],
              message: "`#component/IconButton`으로 가져오세요 — 터치 환경의 최소 타겟 CSS가 그 겹에만 있습니다.",
            },
          ],
        },
      ],
    },
  },

  {
    /*
     * `model/`은 상태 라이브러리와 React를 **런타임으로** 모른다(→ ADR 0007). 이 규칙을 쓰는
     * 이유는 `allowTypeImports` 하나다 — `import type`은 컴파일에서 지워져 결합을 만들지 않으므로
     * 허용해야 하고, 그 구분을 아는 것이 타입을 읽는 이 규칙뿐이다. 이름이 코어
     * `no-restricted-imports`와 달라 위 블록을 덮지 않는다.
     */
    files: ["src/**/model/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: ["react", "react-dom", "nanostores", "zustand", "jotai", "valtio", "@primer/react"].map((name) => ({
            name,
            allowTypeImports: true,
            message:
              "`model/`은 상태 라이브러리와 React를 런타임으로 모릅니다 — 화면 상태는 ViewModel이 소유합니다(→ ADR 0007).",
          })),
          patterns: [
            {
              group: ["@nanostores/*", "@radix-ui/*"],
              allowTypeImports: true,
              message: "`model/`은 상태 라이브러리를 런타임으로 모릅니다(→ ADR 0007).",
            },
          ],
        },
      ],
    },
  },

  {
    // Node 전역(→ TASK-44). `src/`만이다 — `test/`·`vite.config.ts`·`.storybook/`은 Node에서 돈다.
    files: ["src/**/*.{ts,tsx}"],
    rules: { "no-restricted-globals": ["error", ...NODE_GLOBALS] },
  },

  {
    // 플랫폼 전역. **Node 쪽까지 함께 펴 준다** — `no-restricted-globals`도 한 파일에 한 배열이라
    // 나중 블록이 앞의 것을 통째로 덮는다(위 `RESTRICTED_SYNTAX` 주석과 같은 함정).
    files: ["src/**/model/**/*.{ts,tsx}", "src/**/viewmodel/**/*.{ts,tsx}"],
    rules: { "no-restricted-globals": ["error", ...NODE_GLOBALS, ...PLATFORM_GLOBALS] },
  },

  {
    // `view/`는 위 선택자에 더해 훅·DI 제한을 받는다. **이 블록이 일반 블록 뒤에 와야 한다** —
    // 같은 규칙 이름이라 나중 것이 이기므로, 여기서 공통 선택자까지 함께 펴 준다.
    // 스토리·테스트는 흉내를 세우려면 훅이 필요해 대상이 아니다.
    files: ["src/**/view/*.tsx"],
    ignores: ["src/**/view/*.stories.tsx", "src/**/view/*.test.tsx"],
    rules: { "no-restricted-syntax": ["error", ...RESTRICTED_SYNTAX, ...VIEW_ONLY_SYNTAX] },
  },
];
