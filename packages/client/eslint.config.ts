import reactHooks from "eslint-plugin-react-hooks";
import ops from "ops/lint";

/**
 * 클라이언트의 구조 규칙. 문서로만 있던 계층 규율을 강제한다 — ADR 0005의 의존 방향이
 * 코드에서 실제로 지켜지는지는 이것들이 본다.
 *
 * **글롭이 슬라이스 구조를 그대로 따라간다.** 구조가 바뀌면 여기도 바꿔야 하는데, 안 바꾸면
 * 매치되는 파일이 0개가 되어 규칙이 에러도 경고도 없이 죽는다(2026-09-08에 실제로 겪음).
 * `npx eslint --print-config <파일>`로 규칙이 붙어 있는지 확인할 수 있다.
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
    files: ["src/workbench/view/**/*.tsx", "src/extensions/*/view/**/*.tsx"],
    rules: { "arka/view-only-uses-view-model": "error" },
  },

  {
    // `.tsx`도 본다 — 확장자를 하나만 적으면 `model/X.tsx`가 무규칙 지대가 된다.
    files: ["src/workbench/model/**/*.{ts,tsx}", "src/extensions/*/model/**/*.{ts,tsx}"],
    rules: {
      "arka/model-is-state-library-free": "error",
      // 커스텀 규칙은 import만 본다. 전역 접근은 여기서 막는다 — ADR 0005의 금지 목록에서
      // 그동안 "리뷰로 본다"로 비워둔 절반이다. `this.#fetch()`는 멤버라 걸리지 않는다.
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "model/은 I/O를 정의만 합니다. 실제 호출은 infra/가 합니다." },
        { name: "window", message: "model/은 브라우저 전역을 모릅니다. infra/로 옮기세요." },
        { name: "document", message: "model/은 브라우저 전역을 모릅니다. infra/로 옮기세요." },
        { name: "localStorage", message: "model/은 브라우저 전역을 모릅니다. `IStorage` 같은 계약을 선언하고 infra/가 구현하게 하세요." },
      ],
    },
  },

  {
    // ViewModel은 화면 상태와 프레젠테이션 로직만 다룬다 — DOM은 만지지 않는다.
    files: ["src/workbench/viewmodel/**/*.{ts,tsx}", "src/extensions/*/viewmodel/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "document", message: "viewmodel/은 DOM을 조작하지 않습니다. 조립부가 얇은 함수를 주입하거나 infra/ 기여로 옮기세요." },
        { name: "window", message: "viewmodel/은 DOM을 조작하지 않습니다. 조립부가 얇은 함수를 주입하거나 infra/ 기여로 옮기세요." },
      ],
    },
  },

  {
    // component/는 props만 받아 그린다 — ViewModel·Model·DI를 모른다.
    files: ["src/workbench/component/**/*.{ts,tsx}", "src/extensions/*/component/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          // `#`으로 시작하는 것은 `patterns.group`에서 주석으로 읽혀 무시된다 — `paths`로 적는다.
          paths: [
            { name: "#core/di", message: "component/는 DI를 모릅니다. 그건 view/의 일입니다." },
            { name: "#core/viewmodel", message: "component/는 ViewModel을 모릅니다. 필요한 값은 props로 받으세요." },
          ],
          patterns: [{ group: ["**/viewmodel/**", "**/model/**"], message: "component/는 ViewModel·Model을 모릅니다. 필요한 값은 props로 받으세요." }],
        },
      ],
    },
  },

  {
    // infra/는 I/O 구현이다 — 화면을 그리지 않는다.
    files: ["src/**/infra/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: [
          { name: "react", message: "infra/는 React를 모릅니다. 화면이 필요하면 component/나 view/의 일입니다." },
          { name: "react-dom", message: "infra/는 React를 모릅니다." },
        ] },
      ],
    },
  },

  {
    // Primer는 우리 배럴을 통과하지 않는다 — import 문만 보고 우리 것인지 알 수 있어야 한다.
    // → docs/adr/0006-design-system.md
    files: ["src/shared/components/**/index.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExportNamedDeclaration[source.value=/^@primer/], ExportAllDeclaration[source.value=/^@primer/]",
          message: "Primer 컴포넌트를 배럴로 통과시키지 마세요. 쓰는 쪽이 `@primer/react`에서 직접 가져오면 우리 것인지 Primer 것인지 import 문에 드러납니다.",
        },
      ],
    },
  },

  {
    // DI 토큰은 자기 계약 파일(`I<Name>.ts`)에 둔다 — 슬라이스 루트의 `tokens.ts`는 모든 계약을
    // import하는 역방향 허브가 된다(→ ADR 0005). 파일이 하나라도 생기면 그 파일 전체가 에러다.
    files: ["src/**/tokens.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: "Program", message: "tokens.ts를 두지 않습니다. 토큰은 그 계약 파일(I<Name>.ts)에서 createToken으로 함께 내보내세요." },
      ],
    },
  },

  {
    // 파일·폴더 이름. 실측 관행(클래스 PascalCase / 함수 모듈 camelCase / 계약 I<Name>)을 규칙으로.
    files: ["src/**/*.{ts,tsx}"],
    rules: { "arka/file-names": "error" },
  },

  {
    // 컴포넌트에는 스토리가 있다. 2026-09-09에 위반 0을 실측하고 켰다. `view/`는 대상이 아니다.
    files: ["src/**/component/**/*.tsx", "src/shared/components/**/*.tsx"],
    rules: { "arka/components-have-stories": "error" },
  },

  {
    // 슬라이스 형제 금지. `roots`는 `context.cwd`(= 이 패키지) 기준이다.
    files: ["src/extensions/**/*.{ts,tsx}"],
    rules: { "arka/slices-are-siblings": ["error", { roots: ["src/extensions"] }] },
  },

  {
    // 계층 사이의 방향. `src/` 밖(test/·설정 파일)도 대상이다 — 그동안 `src/**`만 봐서
    // e2e가 소스를 import해도 통과했다.
    files: ["src/**/*.{ts,tsx}", "test/**/*.ts", ".storybook/*.{ts,tsx}", "*.config.ts"],
    rules: {
      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            // `test/`는 **대상을 특정할 수 없는 테스트**가 사는 자리다. E2E·VRT는 앱을 화면으로만 보므로
            // 소스를 import하면 더 이상 바깥 관점이 아니다.
            {
              target: ["./test"],
              from: ["./src"],
              message: "E2E·VRT는 소스를 import하지 않습니다. 화면에 보이는 것만으로 검사하세요 — 배선은 registerServices.test.tsx가, 응답 계약은 서버의 responseContract가 봅니다.",
            },
            // extensions는 workbench를 모른다 — 오늘 0건이고, 이 0을 지키는 것이 마이크로커널 전환 조건이다.
            {
              target: "./src/extensions",
              from: "./src/workbench",
              message: "extensions는 workbench를 import할 수 없습니다. 필요한 것은 core의 계약이나 이벤트로 받으세요.",
            },
            // workbench의 계층은 특정 extension을 알 수 없다 — 조립부(registerServices.tsx)만 잇는다.
            {
              target: ["./src/workbench/model", "./src/workbench/viewmodel", "./src/workbench/view", "./src/workbench/component"],
              from: "./src/extensions",
              message: "workbench의 계층은 특정 extension을 알 수 없습니다. 계약을 workbench에 선언하고 조립부(registerServices.tsx)가 잇게 하세요 — `ITabDirtyState`가 그 예입니다.",
            },
            { target: "./src/core", from: ["./src/workbench", "./src/extensions"], message: "core는 커널입니다 — workbench·extensions를 모릅니다." },
            { target: "./src/shared", from: ["./src/core", "./src/workbench", "./src/extensions"], message: "shared는 아무것도 import하지 않습니다. 공통 추출은 아래로만 합니다." },
            // client는 server를 모른다. 공유할 코드는 contracts로 옮기고 `#contracts`로 가져온다(→ ADR 0001).
            // **`no-restricted-imports`로 쓰지 않는다** — 그 규칙은 계층별로 이미 쓰고 있어서, 여기서
            // 또 쓰면 나중 블록이 앞의 것을 통째로 덮는다(2026-09-09에 실제로 겪음).
            { target: "./src", from: "../server/src", message: "client는 server를 import할 수 없습니다. 공유할 코드는 contracts로 옮기고 `#contracts`로 가져오세요." },
          ],
        },
      ],
    },
  },
];
