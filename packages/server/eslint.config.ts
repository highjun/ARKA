import ops from "ops/lint";

/** server의 슬라이스. 새 슬라이스를 더할 때 여기 한 줄을 빼먹으면 그 슬라이스만 검사에서 빠진다. */
const SLICES = ["agent", "filesystem", "git", "search", "static"];

/**
 * **의존은 안쪽을 향한다**(의 server 판).
 * 계층마다 *자기 슬라이스 안에서* 볼 수 있는 것.
 *
 * `runtime/`은 요청보다 오래 사는 것을 든다 — `services/`(요청 하나를 처리하고 끝나는 유스케이스)와
 * 수명이 달라 따로 있다(`RunManager`가 그 자리다).
 */
const LAYER_ALLOW: Readonly<Record<string, readonly string[]>> = {
  domain: ["domain"],
  infra: ["domain", "infra"],
  services: ["domain", "infra", "services"],
  runtime: ["domain", "infra", "services", "runtime"],
  transport: ["domain", "infra", "services", "runtime", "transport"],
};

const LAYER_ZONES = SLICES.flatMap((slice) =>
  Object.entries(LAYER_ALLOW).map(([layer, allowed]) => ({
    target: `./src/features/${slice}/${layer}`,
    from: `./src/features/${slice}`,
    except: allowed.map((name) => `./${name}`),
    message: "의존은 안쪽을 향합니다 — 이 계층은 자기 아래만 봅니다.",
  })),
);

/**
 * 서버의 린트 설정. **client와 같은 선이다** — 2026-09-14까지 계층 방향과 슬라이스 경계가
 * 비어 있었고(2026-09-13에 지워진 뒤 새 번호로 옮겨지지 않았다) 남은 zone은 패키지 경계뿐이었다.
 */
export default [
  ...ops.configs.base,
  {
    files: ["src/**/*.ts", "*.config.ts", "build.ts"],
    rules: {
      // **`#contracts`로 가져온다**. 맨이름 `"contracts"`는 서드파티와 구분되지 않는다.
      // `import-x`로는 못 한다 — 둘이 같은 파일로 풀려 구분이 사라진다. 문자열을 보는 코어 규칙이라야 갈린다.
      // `no-restricted-imports`는 **동적 `import()`를 놓친다**(2026-09-10 실측). 그래서 선택자가 형태별로 넷이다.
      "no-restricted-syntax": [
        "error",
        ...["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration", "ImportExpression"].map((node) => ({
          selector: `${node}[source.value=/^contracts(\\/|$)/]`,
          message: "`#contracts`로 가져오세요 — 맨이름은 서드파티와 구분되지 않습니다.",
        })),
      ],
      // 다른 패키지를 상대경로로 가져오는 것(`../../contracts/src/…`). 해석에 기대므로 바탕의
      // 리졸버가 서야 한다. `no-internal-modules`는 쓰지 않는다 — `#contracts`·`#core/di` 같은
      // 서브패스 import를 전부 위반으로 보고, 위 정규식이 `contracts/*`를 이미 덮는다.
      "import-x/no-relative-packages": "error",
      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./src",
              from: "../client/src",
              message:
                "server는 client를 import할 수 없습니다. 공유할 코드는 contracts로 옮기고 `#contracts`로 가져오세요.",
            },
            ...SLICES.map((slice) => ({
              target: `./src/features/${slice}`,
              from: "./src/features",
              except: [`./${slice}`],
              message: "슬라이스끼리 직접 import하지 않습니다 — 조립부(`src/app.ts`)가 잇습니다.",
            })),
            // `core/`는 도메인을 모른다(DI·설정·부팅·로그). **예외는 기능의 `config.ts` 하나** —
            // 환경변수의 주인은 기능이고 검증 관문만 `core/config.ts`에 있다. 기능을 지우면
            // 그 변수도 함께 사라지는 배치다.
            {
              target: "./src/core",
              from: "./src/features",
              except: SLICES.map((slice) => `./${slice}/config.ts`),
              message: "`core/`는 도메인을 모릅니다 — 기능의 `config.ts`만 예외입니다.",
            },
            ...LAYER_ZONES,
          ],
        },
      ],
    },
  },
];
