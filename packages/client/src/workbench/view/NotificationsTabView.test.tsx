import { describe, expect, it } from "vitest";
import { formatAgo } from "./NotificationsTabView";

const NOW = 1_700_000_000_000;
const 전 = (ms: number) => formatAgo(NOW - ms, NOW);

describe("formatAgo", () => {
  it("분 아래로는 안 센다 — 알림에서 초는 읽는 사람에게 뜻이 없다", () => {
    expect(전(0)).toBe("방금");
    expect(전(59_000)).toBe("방금");
  });

  it("분·시간·일로 올라간다", () => {
    expect(전(60_000)).toBe("1분 전");
    expect(전(59 * 60_000)).toBe("59분 전");
    expect(전(60 * 60_000)).toBe("1시간 전");
    expect(전(23 * 60 * 60_000)).toBe("23시간 전");
    expect(전(24 * 60 * 60_000)).toBe("1일 전");
  });

  it("미래 시각이면 방금이다 — 시계가 어긋나도 음수를 안 보인다", () => {
    expect(formatAgo(NOW + 60_000, NOW)).toBe("방금");
  });
});
