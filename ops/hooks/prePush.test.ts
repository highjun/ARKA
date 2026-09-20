import { describe, expect, it } from "vitest";
import { protectedPushes } from "./prePush.ts";

const line = (remoteRef: string): string => `refs/heads/x deadbeef ${remoteRef} cafebabe`;

describe("main으로 직접 미는 것을 막는다", () => {
  it("main을 향하면 잡는다", () => {
    expect(protectedPushes(line("refs/heads/main"))).toEqual(["refs/heads/main"]);
  });

  it("기능 브랜치는 보낸다", () => {
    expect(protectedPushes(line("refs/heads/feat/검색"))).toEqual([]);
  });

  it("여러 ref를 한 번에 밀 때 그중 main만 잡는다 — 한 push에 여러 줄이 온다", () => {
    expect(protectedPushes([line("refs/heads/feat/a"), line("refs/heads/main")].join("\n"))).toEqual([
      "refs/heads/main",
    ]);
  });

  it("이름이 main으로 시작하는 브랜치는 보낸다 — 접두사가 아니라 정확히 같아야 한다", () => {
    expect(protectedPushes(line("refs/heads/main-experiment"))).toEqual([]);
  });

  it("빈 입력에 죽지 않는다 — 지울 것이 없는 push도 훅을 부른다", () => {
    expect(protectedPushes("")).toEqual([]);
    expect(protectedPushes("\n")).toEqual([]);
  });
});
