import { describe, expect, it } from "vitest";
import { ErrorLog } from "../model/ErrorLog";
import { createGlobalErrorHandlers } from "./GlobalErrorHandlers";

describe("createGlobalErrorHandlers", () => {
  it("window.error를 기록한다", () => {
    const errorLog = new ErrorLog();
    const handlers = createGlobalErrorHandlers({ errorLog });
    const event = new ErrorEvent("error", { error: new Error("boom"), message: "boom", cancelable: true });
    window.dispatchEvent(event);
    handlers.dispose();
    expect(errorLog.entries.map((entry) => [entry.source, entry.message])).toEqual([["window.error", "boom"]]);
  });

  it("unhandledrejection을 기록한다", () => {
    const errorLog = new ErrorLog();
    const handlers = createGlobalErrorHandlers({ errorLog });
    const event = Object.assign(new Event("unhandledrejection"), { reason: new Error("rejected") });
    window.dispatchEvent(event);
    handlers.dispose();
    expect(errorLog.entries.map((entry) => [entry.source, entry.message])).toEqual([
      ["unhandledrejection", "rejected"],
    ]);
  });

  it("dispose 뒤에는 기록하지 않는다", () => {
    const errorLog = new ErrorLog();
    const handlers = createGlobalErrorHandlers({ errorLog });
    handlers.dispose();
    window.dispatchEvent(new ErrorEvent("error", { message: "late" }));
    expect(errorLog.entries).toHaveLength(0);
  });
});
