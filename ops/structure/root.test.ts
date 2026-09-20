import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { REPO_ROOT } from "./repo.ts";

const REASONS: Readonly<Record<string, string>> = {
  ".github": "GitHub가 읽는 자리가 루트 하나로 정해져 있다 — 워크플로·CODEOWNERS·dependabot.",
  ".gitignore": "git이 읽는 자리가 루트다. 패키지마다 두면 무엇이 무시되는지 흩어진다.",
  "AGENTS.md": "에이전트가 시작할 때 읽는 자리가 루트 하나로 정해져 있다.",
  LICENSE: "저장소 하나에 라이선스 하나다. GitHub가 루트에서 찾는다.",
  docs: "패키지 하나가 아니라 저장소 전체를 설명하는 글이다 — 컨셉·계약·그림.",
  "eslint.config.ts":
    "루트 파일들(`package.json`·`tsconfig.json`·`.github/**`)을 검사한다. 패키지는 각자 자기 설정을 갖는다.",
  ops: "세 패키지를 함께 다스리는 명령과 설정 — 파이프라인·린트·배포·백업.",
  "package.json": "워크스페이스 루트 선언과 전역 명령. pnpm이 루트에서 찾는다.",
  packages: "배포 단위가 되는 코드. 그 밖은 배치·설정·결정이다.",
  "pnpm-lock.yaml": "워크스페이스 전체가 잠기는 자리가 하나다. pnpm이 루트에서 찾는다.",
  "pnpm-workspace.yaml": "어디가 패키지인지와 catalog를 선언한다. pnpm이 루트에서 찾는다.",
  "tsconfig.json": "세 패키지가 `extends`하는 바탕. 한 곳에서 정하지 않으면 옵션이 갈린다.",
};

const actual = (): readonly string[] =>
  readdirSync(REPO_ROOT)
    .filter((entry) => entry !== ".git")
    .filter((entry) => spawnSync("git", ["check-ignore", "-q", entry], { cwd: REPO_ROOT }).status !== 0)
    .sort();

describe("루트 항목", () => {
  it("실재하는 것에 사유가 있다 — 없으면 사유를 적고 승인받는다", () => {
    expect(actual().filter((entry) => REASONS[entry] === undefined)).toEqual([]);
  });

  it("사유표에 없는 것이 남아 있지 않다 — 지워진 항목도 잡는다", () => {
    const present = new Set(actual());

    expect(Object.keys(REASONS).filter((entry) => !present.has(entry))).toEqual([]);
  });

  it("사유가 빈 문장이 아니다", () => {
    expect(Object.entries(REASONS).filter(([, reason]) => reason.trim().length < 10)).toEqual([]);
  });
});
