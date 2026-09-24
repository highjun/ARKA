import eslintReact from "@eslint-react/eslint-plugin";
import boundaries from "eslint-plugin-boundaries";
import jsxA11y from "eslint-plugin-jsx-a11y";
import primerReact from "eslint-plugin-primer-react";
import reactHooks from "eslint-plugin-react-hooks";
import storybook from "eslint-plugin-storybook";
import ops from "ops/lint";

const RESTRICTED_SYNTAX = [
  ...["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration", "ImportExpression"].map((node) => ({
    selector: `${node}[source.value=/^contracts(\\/|$)/]`,
    message: "`#contracts`로 가져오세요 — 맨이름은 서드파티와 구분되지 않습니다.",
  })),
  {
    selector: "TSTypeReference > Identifier[name=/^(?:[A-Za-z]+)?HTMLAttributes$/]",
    message: "props 바탕은 `ComponentPropsWithoutRef<'tag'>`를 쓰세요 — 원소 고유 속성이 빠집니다.",
  },
];

const SLICE_ROOTS = "./src/{workbench,extensions/*}";

const LAYERS = ["row", "api", "model", "infra", "viewmodel", "view", "component", "contrib", "data"] as const;

const LAYER_ALLOW: Readonly<Record<(typeof LAYERS)[number], readonly string[]>> = {
  row: ["row"],
  api: ["row", "api"],
  model: ["row", "api", "model"],
  infra: ["row", "api", "model", "infra"],
  viewmodel: ["row", "api", "model", "viewmodel"],
  view: ["row", "api", "model", "viewmodel", "view", "component", "contrib"],
  component: ["row", "component"],
  contrib: ["row", "api", "model", "component", "contrib"],
  data: ["data"],
};

const ROW_ONLY_SYNTAX = [
  {
    selector:
      "ExportNamedDeclaration > :matches(VariableDeclaration, FunctionDeclaration, ClassDeclaration, TSEnumDeclaration)",
    message: "`row/`는 타입만 삽니다 — 값이 필요하면 model로 올리세요.",
  },
  {
    selector: 'ImportDeclaration[importKind!="type"]',
    message: "`row/`는 타입만 가져옵니다 — 런타임 0바이트여야 층을 가로지를 수 있습니다.",
  },
];

const LAYER_ZONES = LAYERS.map((layer) => {
  const forbidden = LAYERS.filter((other) => !LAYER_ALLOW[layer].includes(other));
  return {
    target: `${SLICE_ROOTS}/${layer}/**`,
    from: [`${SLICE_ROOTS}/{${forbidden.join(",")}}/**`, `${SLICE_ROOTS}/*.{ts,tsx}`],
    message: "의존은 안쪽을 향합니다 — 이 계층은 자기 아래만 봅니다.",
  };
});

const SAME_SLICE = { type: "extension", captured: { name: "{{from.element.captured.name}}" } };

const BOUNDARY_POLICIES = [
  { from: { element: { type: "app" } }, allow: { to: { element: { type: "*" } } } },
  {
    from: { element: { type: "extension" } },
    allow: {
      to: {
        element: [
          SAME_SLICE,
          { type: "workbench", fileInternalPath: "index.ts" },
          { type: "core" },
          { type: "shared" },
        ],
      },
    },
  },
  {
    from: { element: { type: "extension" } },
    dependency: { kind: "type" },
    allow: { to: { element: { type: "extension", fileInternalPath: "index.ts" } } },
  },
  {
    from: { element: { type: "workbench" } },
    allow: { to: { element: [{ type: "workbench" }, { type: "core" }, { type: "shared" }] } },
  },
  { from: { element: { type: "core" } }, allow: { to: { element: [{ type: "core" }, { type: "shared" }] } } },
  { from: { element: { type: "shared" } }, allow: { to: { element: { type: "shared" } } } },
];

const NODE_GLOBALS = [
  { name: "process", message: "브라우저 패키지입니다 — 빌드 타임 값은 `import.meta.env`를 쓰세요." },
  { name: "Buffer", message: "브라우저 패키지입니다 — `Uint8Array`나 `TextEncoder`를 쓰세요." },
  { name: "__dirname", message: "브라우저 패키지입니다 — 경로는 `import.meta.url`을 쓰세요." },
  { name: "__filename", message: "브라우저 패키지입니다 — 경로는 `import.meta.url`을 쓰세요." },
  { name: "global", message: "브라우저 패키지입니다 — `globalThis`를 쓰세요." },
  { name: "require", message: "ESM입니다 — `import`를 쓰세요." },
];

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
  message: "`model/`·`viewmodel/`은 플랫폼에 직접 닿지 않습니다 — 조립부가 주입하는 함수를 받으세요.",
}));

const VIEW_ONLY_SYNTAX = [
  {
    selector: 'CallExpression[callee.name=/^use[A-Z]/]:not([callee.name="useViewModel"])',
    message: "`view/`는 `useViewModel` 하나만 부릅니다 — 상태가 필요하면 ViewModel로 올리세요.",
  },
  {
    selector: 'CallExpression[callee.property.name="resolve"]',
    message: "`view/`는 DI 컨테이너를 직접 보지 않습니다 — `useViewModel`이 그 자리입니다.",
  },
];

export default [
  ...ops.configs.base,

  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: { "react-hooks/rules-of-hooks": "error", "react-hooks/exhaustive-deps": "warn" },
  },

  {
    files: ["src/**/*.tsx"],
    plugins: { "primer-react": primerReact },
    settings: primerReact.configs.recommended.settings,
    rules: {
      ...primerReact.configs.recommended.rules,
      "primer-react/no-deprecated-entrypoints": "error",
      "primer-react/no-wildcard-imports": "error",
      "primer-react/enforce-css-module-default-import": "error",
    },
  },

  {
    files: ["src/**/*.tsx"],
    plugins: { "jsx-a11y": jsxA11y },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      "jsx-a11y/no-noninteractive-tabindex": ["error", { tags: [], roles: ["tabpanel", "separator"] }],
    },
  },

  {
    files: ["src/**/*.tsx"],
    plugins: { "@eslint-react": eslintReact },
    rules: { "@eslint-react/no-forward-ref": "error", "@eslint-react/no-context-provider": "error" },
  },

  ...storybook.configs["flat/recommended"],

  {
    files: ["src/**/*.{ts,tsx}", "test/**/*.ts", ".storybook/*.{ts,tsx}", "*.config.ts"],
    rules: {
      "no-restricted-syntax": ["error", ...RESTRICTED_SYNTAX],
      "import-x/no-relative-packages": "error",
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
            {
              target: "./src/extensions/*",
              from: "./src/workbench",
              except: ["./index.ts"],
              message: "확장은 workbench를 `#workbench` 배럴로만 봅니다.",
            },
            {
              target: "./src/workbench",
              from: "./src/extensions",
              message: "workbench는 확장을 모릅니다 — 확장 목록은 app/만 압니다.",
            },
            {
              target: "./src/shared",
              from: "./src",
              except: ["./shared"],
              message: "`shared/`는 아무것도 import하지 않습니다 — 공통 추출은 아래로만 합니다.",
            },
            {
              target: "./src/core",
              from: "./src",
              except: ["./core", "./shared"],
              message: "`core/`는 도메인을 모릅니다 — `workbench/`·`extensions/`를 import하지 않습니다.",
            },
            ...LAYER_ZONES,
          ],
        },
      ],
    },
  },

  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "app", pattern: "src/app" },
        { type: "extension", pattern: "src/extensions/*", capture: ["name"] },
        { type: "workbench", pattern: "src/workbench" },
        { type: "core", pattern: "src/core" },
        { type: "shared", pattern: "src/shared" },
      ],
      "import/resolver": { node: { extensions: [".ts", ".tsx", ".js", ".jsx", ".json"] } },
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          message:
            "층은 아래만 봅니다(app → extensions → workbench → core → shared). 확장은 서로 모르고, workbench는 #workbench 배럴로만 봅니다.",
          policies: BOUNDARY_POLICIES,
        },
      ],
    },
  },

  {
    files: ["src/extensions/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^#extensions/",
              allowTypeImports: true,
              message: "다른 확장은 타입으로만 봅니다 — 값은 DI 토큰이나 레지스트리로 받으세요.",
            },
          ],
        },
      ],
    },
  },

  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/shared/ui/IconButton/**", "src/shared/ui/ModeToggle/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@primer/react",
              importNames: ["IconButton"],
              message: "`#ui/IconButton`으로 가져오세요 — 터치 환경의 최소 타겟 CSS가 그 겹에만 있습니다.",
            },
          ],
        },
      ],
    },
  },

  {
    files: ["src/**/model/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: ["react", "react-dom", "mobx", "nanostores", "zustand", "jotai", "valtio", "@primer/react"].map(
            (name) => ({
              name,
              allowTypeImports: true,
              message: "`model/`은 상태 라이브러리와 React를 런타임으로 모릅니다 — 화면 상태는 ViewModel이 소유합니다.",
            }),
          ),
          patterns: [
            {
              group: ["@nanostores/*", "@radix-ui/*"],
              allowTypeImports: true,
              message: "`model/`은 상태 라이브러리를 런타임으로 모릅니다.",
            },
          ],
        },
      ],
    },
  },

  {
    files: ["src/**/*.{ts,tsx}"],
    rules: { "no-restricted-globals": ["error", ...NODE_GLOBALS] },
  },

  {
    files: ["src/**/model/**/*.{ts,tsx}", "src/**/viewmodel/**/*.{ts,tsx}"],
    rules: { "no-restricted-globals": ["error", ...NODE_GLOBALS, ...PLATFORM_GLOBALS] },
  },

  {
    files: ["src/**/row/**/*.ts"],
    rules: { "no-restricted-syntax": ["error", ...RESTRICTED_SYNTAX, ...ROW_ONLY_SYNTAX] },
  },

  {
    files: ["src/**/view/*.tsx"],
    ignores: ["src/**/view/*.stories.tsx", "src/**/view/*.test.tsx"],
    rules: { "no-restricted-syntax": ["error", ...RESTRICTED_SYNTAX, ...VIEW_ONLY_SYNTAX] },
  },
];
