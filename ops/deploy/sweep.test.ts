import { describe, expect, it, vi } from "vitest";
import { SWEEP, pickAbandoned, previewNumber, sweep } from "./sweep.ts";
import { makeFakePorts } from "./testFakes.ts";

/**
 * **접두사 검사가 이 파일의 전부다.** 실배포(`ade`)를 미리보기로 착각하면 돌고 있는
 * 서비스를 지운다 — 되돌릴 수 없는 종류의 실수라 케이스를 여럿 둔다.
 */
const projects = (...names: string[]): { Name: string }[] => names.map((Name) => ({ Name }));

describe("미리보기 이름만 고른다", () => {
  it("pr-<숫자>만 미리보기다", () => {
    expect(previewNumber("pr-12")).toBe(12);
    expect(previewNumber("pr-0")).toBe(0);
  });

  it("실배포 이름은 미리보기가 아니다", () => {
    for (const name of ["ade", "workbench", "label", "file-server"]) {
      expect(previewNumber(name)).toBeUndefined();
    }
  });

  it("접두사만 같은 이름에 속지 않는다", () => {
    for (const name of ["pr-", "pr-abc", "pr-12-old", "prod", "pr12"]) {
      expect(previewNumber(name)).toBeUndefined();
    }
  });
});

describe("무엇을 걷을지 고른다", () => {
  const closed = (pr: number): boolean => pr !== 12;

  it("닫힌 PR의 것만 고른다", () => {
    expect(pickAbandoned(projects("pr-11", "pr-12"), (pr) => !closed(pr))).toEqual(["pr-11"]);
  });

  it("실배포는 절대 고르지 않는다 — 상태를 모르는 것으로 답해도", () => {
    expect(pickAbandoned(projects("ade", "workbench"), () => false)).toEqual([]);
  });

  it("상태를 모르면 살아 있는 것으로 친다 — 모르는 것을 지우는 쪽으로 기울지 않는다", () => {
    expect(pickAbandoned(projects("pr-11"), () => undefined)).toEqual([]);
  });

  it("아무것도 없으면 빈 배열이다", () => {
    expect(pickAbandoned([], () => false)).toEqual([]);
  });
});

describe("걷을 때", () => {
  const base = { stateDir: "/state", credentialsDir: "/secure", zone: "z", token: "t" };

  it("Access까지 지운다 — 그 호스트 이름은 다시 쓰이지 않는다", () => {
    expect(SWEEP.access).toBe(true);
    expect(SWEEP.image).toBe(true);
  });

  it("미리보기가 아닌 이름이 들어오면 던진다 — 마지막 방어선이다", async () => {
    await expect(sweep(["ade"], base, makeFakePorts())).rejects.toThrow("실배포를 지울 뻔했습니다");
  });

  it("하나가 실패해도 나머지를 계속 걷는다 — 멈추면 그 다음부터 아무것도 회수되지 않는다", async () => {
    const log = vi.fn();
    const ports = makeFakePorts({
      log,
      fs: { ...makeFakePorts().fs, exists: () => false },
    });
    // manifest가 없어 첫 번째가 던진다(호스트 이름을 모른다). 두 번째는 지나가야 한다.
    await expect(sweep(["pr-11", "pr-13"], base, ports)).resolves.toEqual([]);
    expect(log.mock.calls.flat().join(" ")).toContain("건너뜁니다");
    expect(log.mock.calls.flat().join(" ")).toContain("pr-13");
  });

  it("dry-run이면 이름만 찍고 아무것도 안 지운다", async () => {
    const log = vi.fn();
    const exec = vi.fn(async () => Promise.resolve({ code: 0, stdout: "", stderr: "" }));
    await expect(sweep(["pr-11"], base, makeFakePorts({ dryRun: true, log, exec }))).resolves.toEqual(["pr-11"]);
    expect(exec).not.toHaveBeenCalled();
    expect(log.mock.calls.flat().join(" ")).toContain("pr-11");
  });
});
