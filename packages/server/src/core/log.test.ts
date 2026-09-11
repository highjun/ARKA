import { describe, expect, it } from "vitest";
import { createLogger, maskSecrets, serializeError } from "./log";

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

describe("비밀 마스킹 — 이름이 곧 장치다", () => {
  const parse = (line: string | undefined): Record<string, unknown> => JSON.parse(line ?? "") as Record<string, unknown>;

  it("접미사가 붙은 필드를 가린다 — 환경변수 꼴과 camelCase 둘 다", () => {
    const { lines, log } = capture();

    log.info("x", { ADE_ANTHROPIC_API_KEY: "sk-real", apiKey: "sk-real", accessToken: "t", dbPassword: "p", tunnelSecret: "s" });

    expect(parse(lines[0])).toMatchObject({
      ADE_ANTHROPIC_API_KEY: "***", apiKey: "***", accessToken: "***", dbPassword: "***", tunnelSecret: "***",
    });
  });

  it("중첩된 것도 본다 — `{ config: { apiKey } }`가 흔한 실수다", () => {
    const { lines, log } = capture();

    log.info("x", { config: { port: 3000, anthropic: { apiKey: "sk-real", model: "m" } } });

    expect(parse(lines[0])["config"]).toEqual({ port: 3000, anthropic: { apiKey: "***", model: "m" } });
  });

  it("배열 안도 본다", () => {
    expect(maskSecrets({ items: [{ token: "t" }, { name: "n" }] })).toEqual({ items: [{ token: "***" }, { name: "n" }] });
  });

  it("비밀이 아닌 필드는 그대로 둔다 — 가리기만 하면 로그가 쓸모없어진다", () => {
    const { lines, log } = capture();

    log.info("server.started", { host: "127.0.0.1", port: 3000, workspace: "/ws" });

    expect(parse(lines[0])).toMatchObject({ host: "127.0.0.1", port: 3000, workspace: "/ws" });
  });

  it("필드가 있었다는 것은 남긴다 — 없는 것과 가린 것은 다르다", () => {
    expect(Object.keys(maskSecrets({ apiKey: "x" }))).toEqual(["apiKey"]);
  });

  it("순환 참조에 죽지 않는다 — 로그 한 줄이 스택을 넘기면 안 된다", () => {
    const loop: Record<string, unknown> = { name: "a" };
    loop["self"] = loop;

    expect(() => maskSecrets({ loop })).not.toThrow();
  });
});
