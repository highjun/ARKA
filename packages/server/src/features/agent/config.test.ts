import { describe, expect, it } from "vitest";
import { AgentEnv } from "./config";

/** 첫 이슈의 경로와 메시지. 조각이 어느 변수를 탓하는지 본다. */
const issueOf = (env: Record<string, string>) => {
  const result = AgentEnv.safeParse(env);
  return result.success ? undefined : { path: result.error.issues[0]?.path.join("."), message: result.error.issues[0]?.message };
};

describe("AgentEnv", () => {
  it("아무것도 안 주면 스크립트 실행기다 — 켜지 않은 기능은 조용히 꺼져 있어도 된다", () => {
    expect(AgentEnv.parse({})).toEqual({ runner: "scripted" });
  });

  it("scripted면 키가 있어도 보지 않는다 — 키를 남겨 둔 채 끌 수 있다", () => {
    expect(AgentEnv.parse({ ADE_AGENT_RUNNER: "scripted", ADE_ANTHROPIC_API_KEY: "sk-test" })).toEqual({ runner: "scripted" });
  });

  it("켰는데 키가 없으면 부팅을 막는다 — 기능이 조용히 꺼진 채 뜨는 것이 제일 나쁜 실패다", () => {
    expect(issueOf({ ADE_AGENT_RUNNER: "anthropic" })).toEqual({ path: "ADE_ANTHROPIC_API_KEY", message: "required when ADE_AGENT_RUNNER=anthropic" });
  });

  it("키 이름에 오타가 나도 모드는 안 바뀐다 — 켠 채로 죽는다", () => {
    expect(issueOf({ ADE_AGENT_RUNNER: "anthropic", ADE_ANTHROPIC_APIKEY: "sk-test" })?.path).toBe("ADE_ANTHROPIC_API_KEY");
  });

  it("켜고 키를 주면 모델 기본값은 claude-opus-5다", () => {
    expect(AgentEnv.parse({ ADE_AGENT_RUNNER: "anthropic", ADE_ANTHROPIC_API_KEY: "sk-test" })).toEqual({
      runner: "anthropic", apiKey: "sk-test", model: "claude-opus-5",
    });
  });

  it("모르는 실행기 이름은 거부한다 — 오타가 기본값으로 떨어지면 스위치가 아니다", () => {
    expect(issueOf({ ADE_AGENT_RUNNER: "anthrpic" })?.path).toBe("ADE_AGENT_RUNNER");
  });
});
