import { describe, expect, it } from "vitest";
import { buildCommand, describeCommit, pruneCommands } from "./build.ts";

/**
 * **함정마다 케이스 하나.** 이 저장소에 `<none>` 이미지 656개가 쌓여 디스크를 86%까지
 * 밀어 올린 적이 있고, 아래 넷 중 하나만 어긋나도 같은 일이 다시 생긴다.
 */
describe("빌드 명령", () => {
  it("BuildKit을 강제한다 — 레거시 빌더가 중간 단계를 이미지로 커밋한 것이 656개의 원인이다", () => {
    expect(buildCommand("ade:latest", "abc").env?.["DOCKER_BUILDKIT"]).toBe("1");
  });

  it("저장소의 Dockerfile과 태그를 쓴다", () => {
    expect(buildCommand("ade:pr-12", "abc1234").args).toEqual([
      "build", "-f", "ops/deploy/Dockerfile", "--build-arg", "ADE_GIT_SHA=abc1234", "-t", "ade:pr-12", ".",
    ]);
  });

  it("커밋 SHA를 이미지에 굽는다 — 이것이 없으면 무엇이 떠 있는지 물을 길이 없다", () => {
    expect(buildCommand("ade:latest", "deadbeef").args).toContain("ADE_GIT_SHA=deadbeef");
  });
});

describe("회수 명령", () => {
  const flat = (budget = "20GB"): string[] => pruneCommands(budget).flatMap((c) => [c.file, ...c.args]);

  it("deprecated된 --keep-storage를 쓰지 않는다 — docker 29가 경고한다", () => {
    expect(flat()).not.toContain("--keep-storage");
  });

  it("`-a`를 쓰지 않는다 — 붙이면 지금 안 도는 playwright·gitleaks·node 베이스까지 지운다", () => {
    expect(flat()).not.toContain("-a");
    expect(flat()).not.toContain("--all");
  });

  it("dangling 이미지와 빌드 캐시를 둘 다 걷는다 — 하나만 하면 나머지가 자란다", () => {
    const joined = pruneCommands("20GB").map((c) => c.args.join(" "));
    expect(joined).toContain("image prune -f");
    expect(joined.some((a) => a.startsWith("builder prune"))).toBe(true);
  });

  it("캐시에 남길 양을 준다 — 없으면 통째로 날려 다음 빌드가 처음부터 돈다", () => {
    expect(flat("7GB")).toContain("--reserved-space");
    expect(flat("7GB")).toContain("7GB");
  });

  it("확인 없이 지운다 — CI에는 답할 사람이 없다", () => {
    for (const c of pruneCommands("20GB")) expect(c.args).toContain("-f");
  });
});

describe("커밋을 어떻게 적는가", () => {
  it("앞 12자만 쓴다 — 사람이 읽고 옮겨 적을 수 있는 길이다", () => {
    expect(describeCommit("0123456789abcdef0123456789abcdef01234567", false)).toBe("0123456789ab");
  });

  it("더러운 트리면 -dirty를 붙인다 — 이력의 어느 지점도 아니라는 뜻이다", () => {
    expect(describeCommit("0123456789abcdef", true)).toBe("0123456789ab-dirty");
  });
});
