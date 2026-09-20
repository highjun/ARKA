import { describe, expect, it } from "vitest";
import { VERSION, versionComplaint } from "./preCommit.ts";

describe("gitleaks 판을 CI와 맞춘다", () => {
  it("판이 같으면 아무 말도 하지 않는다", () => {
    expect(versionComplaint(`${VERSION}\n`)).toBeNull();
  });

  it("깔려 있지 않으면 막는다 — 조용히 통과하면 훅이 없는 것과 같다", () => {
    expect(versionComplaint(null)).toContain("없습니다");
  });

  it("판이 다르면 막는다 — 로컬이 초록인데 CI가 빨간 상태가 생긴다", () => {
    expect(versionComplaint("8.29.0\n")).toContain("8.29.0");
  });
});
