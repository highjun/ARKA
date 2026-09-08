import { describe, expect, it } from "vitest";
import { createLogger, serializeError } from "./log";

const capture = () => {
  const lines: string[] = [];
  const log = createLogger((line) => lines.push(line), () => new Date("2026-09-09T00:00:00.000Z"));
  return { lines, log };
};

describe("createLogger", () => {
  it("한 줄에 JSON 하나를 쓰고 줄바꿈으로 끝낸다", () => {
    const { lines, log } = capture();
    log.info("server.started", { port: 3000 });
    expect(lines).toHaveLength(1);
    expect(lines[0]?.endsWith("\n")).toBe(true);
    expect(JSON.parse(lines[0] ?? "")).toEqual({
      time: "2026-09-09T00:00:00.000Z",
      level: "info",
      event: "server.started",
      port: 3000,
    });
  });

  it("레벨이 필드에 실린다", () => {
    const { lines, log } = capture();
    log.warn("a");
    log.error("b");
    expect(lines.map((line) => (JSON.parse(line) as { level: string }).level)).toEqual(["warn", "error"]);
  });
});

describe("serializeError", () => {
  it("Error는 이름·메시지·스택을 꺼낸다", () => {
    const fields = serializeError(new TypeError("boom"));
    expect(fields).toMatchObject({ name: "TypeError", message: "boom" });
    expect(typeof fields["stack"]).toBe("string");
  });

  it("Error가 아니면 문자열로 만든다", () => {
    expect(serializeError(42)).toEqual({ value: "42" });
  });
});
