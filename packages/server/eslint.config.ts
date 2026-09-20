import ops from "ops/lint";

const SLICES = ["agent", "filesystem", "git", "search", "static"];

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

export default [
  ...ops.configs.base,
  {
    files: ["src/**/*.ts", "*.config.ts", "build.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration", "ImportExpression"].map((node) => ({
          selector: `${node}[source.value=/^contracts(\\/|$)/]`,
          message: "`#contracts`로 가져오세요 — 맨이름은 서드파티와 구분되지 않습니다.",
        })),
      ],
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
