import { describe, expect, it, vi } from "vitest";
import { ErrorLog } from "./ErrorLog";

describe("ErrorLog", () => {
  it("Error를 값으로 옮겨 기록한다", () => {
    const log = new ErrorLog({ now: () => 7 });
    log.report(new RangeError("boom"), "render");
    expect(log.entries).toEqual([
      { time: 7, source: "render", name: "RangeError", message: "boom", stack: expect.any(String) },
    ]);
  });

  it("Error가 아닌 값도 기록한다", () => {
    const log = new ErrorLog();
    log.report("문자열", "unhandledrejection");
    log.report(undefined, "unhandledrejection");
    expect(log.entries.map((entry) => [entry.name, entry.message])).toEqual([
      ["NonError", "문자열"],
      ["NonError", "undefined"],
    ]);
  });

  it("기록마다 알린다", () => {
    const log = new ErrorLog();
    const listener = vi.fn();
    const subscription = log.onDidChange(listener);
    log.report(new Error("a"), "x");
    expect(listener).toHaveBeenCalledTimes(1);
    subscription.dispose();
    log.report(new Error("b"), "x");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("상한을 넘으면 오래된 것부터 버린다", () => {
    const log = new ErrorLog();
    for (let i = 0; i < ErrorLog.MAX_ENTRIES + 3; i += 1) log.report(new Error(String(i)), "x");
    expect(log.entries).toHaveLength(ErrorLog.MAX_ENTRIES);
    expect(log.entries[0]?.message).toBe("3");
  });
});
