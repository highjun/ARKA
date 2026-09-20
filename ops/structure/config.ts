import { ESLint } from "eslint";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { REPO_ROOT, TRACKED, read } from "./repo.ts";

/**
 * **글롭 공간을 대표하는 파일들.** ESLint는 파일마다 설정이 달라서, 어느 규칙이 "실효"인지는
 * 대표 파일을 골라 물어야 알 수 있다. 여기 빠진 글롭의 규칙은 실재하는데 없다고 판정되므로,
 * 새 글롭을 만들면 이 목록에 한 줄을 더한다.
 */
const PROBES: readonly (readonly [string, readonly string[]])[] = [
  [
    "packages/client",
    [
      "src/shared/component/Icon/Icon.tsx",
      "src/shared/component/Icon/Icon.stories.tsx",
      "src/shared/component/Icon/Icon.test.tsx",
      "src/workbench/model/ThemeModel.ts",
      "src/workbench/viewmodel/ShellViewModel.ts",
      "src/workbench/view/ShellView.tsx",
      ".storybook/main.ts",
      "test/structure.test.ts",
    ],
  ],
  ["packages/server", ["src/index.ts"]],
  ["packages/contracts", ["src/index.ts"]],
  ["ops", ["lint/index.ts", "pipeline/check.ts"]],
];

/**
 * 루트 설정의 대표 파일. **루트만 CLI로 묻는다** — 루트 `eslint.config.ts`가 import하는
 * 플러그인이 `ops/node_modules`에만 있어서, `ops`의 ESLint 바이너리로는 풀리고 이 프로세스의
 * API 호출로는 안 풀린다. 파일 셋이라 `--print-config` 세 번이 싸다.
 */
const ROOT_PROBES = ["tsconfig.json", "package.json", ".github/workflows/ci.yml"] as const;

/** 루트 설정이 그 파일에 켜는 규칙 이름. */
const rootRules = (file: string): readonly string[] => {
  const bin = path.join(REPO_ROOT, "ops/node_modules/.bin/eslint");
  const { status, stdout } = spawnSync(bin, ["--config", "eslint.config.ts", "--print-config", file], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  if (status !== 0) throw new Error(`루트 설정을 읽지 못했습니다: ${file}`);
  return Object.keys((JSON.parse(stdout) as { rules?: Record<string, unknown> }).rules ?? {});
};

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
  for (const file of ROOT_PROBES) {
    for (const name of rootRules(file)) names.add(name);
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

/**
 * `.github/workflows/*.yml`이 선언한 잡 — **id와 `name:` 둘 다 담는다.** 두 이름이 갈린 자리가
 * 실제로 있다(`storybook.yml`은 id가 `publish`, `name`이 `storybook`). 인용하는 쪽이 사람이 보는
 * 이름을 쓰기도 해서 어느 쪽이든 받는다.
 *
 * **YAML 파서를 들이지 않는다** — 워크플로가 둘이고 잡 선언이 들여쓰기 두 칸으로 평평해,
 * 의존성 하나가 이 정규식보다 비싸다.
 */
export const workflowJobs = (): ReadonlySet<string> => {
  const names = new Set<string>();
  for (const file of TRACKED.filter((f) => /^\.github\/workflows\/.+\.ya?ml$/u.test(f))) {
    const body = read(file);
    const start = body.indexOf("\njobs:");
    if (start < 0) continue;
    for (const line of body.slice(start).split("\n")) {
      const id = /^ {2}(?<id>[A-Za-z_][\w-]*):\s*$/u.exec(line)?.groups?.["id"];
      const name = /^ {4}name:\s*(?<name>.+?)\s*$/u.exec(line)?.groups?.["name"];
      if (id !== undefined) names.add(id);
      if (name !== undefined && !name.includes("${{")) names.add(name.replace(/^["']|["']$/gu, ""));
    }
  }
  return names;
};
