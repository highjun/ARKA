import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { composeEnvKeys, envFileKeys } from "./envKeys.ts";

/**
 * **실제 파일 둘을 대조한다.** 손으로 쓰는 `.env.example`이 `compose.yml`과 갈리는 순간
 * 여기가 빨개진다 — 사본을 두되 갈리지 못하게 하는 것이 이 테스트의 전부다(→ ADR 0007).
 */
const read = (name: string): string => readFileSync(path.join(import.meta.dirname, name), "utf8");

describe("compose가 요구하는 키를 뽑는다", () => {
  it("보간(`${NAME}`)과 통과(`- NAME`) 둘 다 센다", () => {
    const yaml = [
      "services:", "  app:", "    ports:", '      - "127.0.0.1:${ADE_PORT:-3000}:3000"',
      "    environment:", "      - ADE_ANTHROPIC_API_KEY", "      - ADE_MODEL=${ADE_MODEL:-x}",
    ].join("\n");

    expect(composeEnvKeys(yaml)).toEqual(["ADE_ANTHROPIC_API_KEY", "ADE_MODEL", "ADE_PORT"]);
  });

  it("주석 안의 예시를 키로 세지 않는다 — `# KEY: \"${KEY:-}\"` 같은 설명이 실제로 있다", () => {
    expect(composeEnvKeys('    # 이렇게 쓰면 안 된다: KEY: "${KEY:-}"\n    image: x')).toEqual([]);
  });

  it("compose 서비스 이름 같은 소문자 항목은 키가 아니다", () => {
    expect(composeEnvKeys("    depends_on:\n      - app\n")).toEqual([]);
  });
});

describe("`.env` 꼴 파일의 키를 뽑는다", () => {
  it("값이 비어 있어도 키로 센다 — 채우라고 둔 빈칸이다", () => {
    expect(envFileKeys("A=\nB=x\n")).toEqual(["A", "B"]);
  });

  it("주석과 빈 줄을 건너뛴다", () => {
    expect(envFileKeys("# A=1\n\nB=\n")).toEqual(["B"]);
  });
});

describe("`.env.example`이 `compose.yml`과 어긋나지 않는다", () => {
  it("키 집합이 정확히 같다 — compose에 변수를 더하고 원본을 안 고치면 여기가 빨갛다", () => {
    expect(envFileKeys(read(".env.example"))).toEqual(composeEnvKeys(read("compose.yml")));
  });

  it("`.env.example`에는 값이 없다 — 있으면 비밀이 추적되는 파일에 들어간 것이다", () => {
    const filled = read(".env.example")
      .split("\n")
      .filter((line) => /^\s*[A-Z][A-Z0-9_]*\s*=\s*\S/u.test(line));

    expect(filled).toEqual([]);
  });
});
