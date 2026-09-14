import { ESLint } from "eslint";
import path from "node:path";
import { REPO_ROOT, TRACKED, read } from "./repo.ts";

/**
 * **글롭 공간을 대표하는 파일들.** ESLint는 파일마다 설정이 달라서, 어느 규칙이 "실효"인지는
 * 대표 파일을 골라 물어야 알 수 있다. 여기 빠진 글롭의 규칙은 실재하는데 없다고 판정되므로,
 * 새 글롭을 만들면 이 목록에 한 줄을 더한다.
 */
const PROBES: readonly (readonly [string, readonly string[]])[] = [
  ["packages/client", [
    "src/shared/component/Icon/Icon.tsx",
    "src/shared/component/Icon/Icon.stories.tsx",
    "src/shared/component/Icon/Icon.test.tsx",
    "src/workbench/model/ThemeModel.ts",
    "src/workbench/viewmodel/ShellViewModel.ts",
    "src/workbench/view/ShellView.tsx",
    ".storybook/main.ts",
    "test/structure.test.ts",
  ]],
  ["packages/server", ["src/index.ts"]],
  ["packages/contracts", ["src/index.ts"]],
  ["ops", ["lint/index.ts", "pipeline/check.ts"]],
];

/*
 * **저장소 루트는 대표에 없다.** 루트 `eslint.config.ts`가 `@eslint/json`을 import하는데 그것은
 * `ops/node_modules`에만 있어서, ESLint CLI(`ops`의 바이너리)로는 풀리고 여기서는 안 풀린다.
 * 루트가 켜는 규칙(`no-restricted-syntax`)은 패키지 쪽에도 있어 잃는 것이 없다.
 */

/** 위 대표 파일들에 **실제로 걸리는** ESLint 규칙 이름 전부. */
export const activeEslintRules = async (): Promise<ReadonlySet<string>> => {
  const names = new Set<string>();
  for (const [dir, files] of PROBES) {
    const eslint = new ESLint({ cwd: path.join(REPO_ROOT, dir) });
    for (const file of files) {
      const config = await eslint.calculateConfigForFile(file);
      for (const name of Object.keys(config.rules ?? {})) names.add(name);
    }
  }
  return names;
};

/** 어느 `package.json`에든 선언된 의존성 이름 전부. */
export const declaredPackages = (): ReadonlySet<string> => {
  const names = new Set<string>();
  for (const file of TRACKED.filter((f) => f === "package.json" || f.endsWith("/package.json"))) {
    const json = JSON.parse(read(file)) as Record<string, Record<string, string> | undefined>;
    for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
      for (const name of Object.keys(json[field] ?? {})) names.add(name);
    }
  }
  return names;
};
