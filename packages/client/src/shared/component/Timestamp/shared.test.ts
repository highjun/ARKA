import { describe, expect, it } from "vitest";
import { formatDateTime, formatDuration, formatRelative, formatTimestamp } from "./shared";

const FIXED_NOW = 1_700_000_000_000;

describe("formatDateTime", () => {
  it("기본 포맷은 YYYY-MM-DD HH:mm", () => {
    const date = new Date(FIXED_NOW);
    const expected = `${String(date.getFullYear())}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

    expect(formatDateTime(date)).toBe(expected);
  });

  it("format 토큰 문자열을 파싱한다(한글 리터럴 포함)", () => {
    const date = new Date(FIXED_NOW);
    const expected = `${String(date.getFullYear())}년 ${String(date.getMonth() + 1).padStart(2, "0")}월`;

    expect(formatDateTime(date, "YYYY년 MM월")).toBe(expected);
  });
});

describe("formatRelative", () => {
  it("1분 미만은 방금", () => {
    expect(formatRelative(new Date(FIXED_NOW - 10 * 1000), FIXED_NOW)).toBe("방금");
  });

  it("1시간 미만은 N분 전", () => {
    expect(formatRelative(new Date(FIXED_NOW - 5 * 60 * 1000), FIXED_NOW)).toBe("5분 전");
  });

  it("하루 미만은 N시간 전", () => {
    expect(formatRelative(new Date(FIXED_NOW - 3 * 60 * 60 * 1000), FIXED_NOW)).toBe("3시간 전");
  });

  it("일주일 미만은 N일 전", () => {
    expect(formatRelative(new Date(FIXED_NOW - 3 * 24 * 60 * 60 * 1000), FIXED_NOW)).toBe("3일 전");
  });

  it("한 달 미만(일주일 이상 포함)은 계속 N일 전", () => {
    expect(formatRelative(new Date(FIXED_NOW - 20 * 24 * 60 * 60 * 1000), FIXED_NOW)).toBe("20일 전");
  });

  it("한 달 이상 1년 미만은 N개월 전", () => {
    const date = new Date(FIXED_NOW);
    date.setMonth(date.getMonth() - 3);

    expect(formatRelative(date, FIXED_NOW)).toBe("3개월 전");
  });

  it("1년 이상은 N년 전", () => {
    const date = new Date(FIXED_NOW);
    date.setFullYear(date.getFullYear() - 2);

    expect(formatRelative(date, FIXED_NOW)).toBe("2년 전");
  });
});

describe("formatDuration", () => {
  it("기본 포맷은 HH시간 mm분", () => {
    expect(formatDuration((4 * 60 + 2) * 60 * 1000)).toBe("04시간 02분");
  });

  it("같은 토큰을 경과 일/시/분으로 재해석한다", () => {
    // 1일 2시간 5분
    const diffMinutes = 26 * 60 + 5;

    expect(formatDuration(diffMinutes * 60 * 1000, "DD일 HH시간 mm분")).toBe("01일 02시간 05분");
  });

  it("YYYY/MM 토큰은 지원하지 않아 리터럴로 남는다", () => {
    expect(formatDuration(60 * 1000, "YYYY-MM mm분")).toBe("YYYY-MM 01분");
  });
});

describe("formatTimestamp", () => {
  it("relative 모드는 format을 무시한다", () => {
    const date = new Date(FIXED_NOW - 10 * 1000);

    expect(formatTimestamp("relative", date, FIXED_NOW, "YYYY년")).toBe("방금");
  });

  it("mode에 따라 알맞은 포매터로 위임한다", () => {
    const date = new Date(FIXED_NOW);

    expect(formatTimestamp("datetime", date, FIXED_NOW, "YYYY")).toBe(String(date.getFullYear()));
  });
});
