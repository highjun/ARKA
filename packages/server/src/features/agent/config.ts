import { z } from "zod";

/**
 * 에이전트 기능이 **소유하는** 환경변수 조각. `core/config.ts`가 이것을 합쳐 검증한다 —
 * 관문은 하나인데 변수의 주인은 기능이다. 이 기능을 지우면 변수도 같이 사라진다.
 */

/** 조립된 실행기 설정. `anthropic`이면 키가 이미 검증돼 있다 — 조립부가 다시 확인하지 않는다. */
export type AgentConfig =
  { readonly runner: "scripted" } | { readonly runner: "anthropic"; readonly apiKey: string; readonly model: string };

/**
 * **스위치와 비밀을 가른다.** 예전에는 `ARKA_ANTHROPIC_API_KEY`의 유무가 실행기를 겸해서
 * 키 이름에 오타가 나면 아무 말 없이 스크립트 실행기로 떨어졌다 — 제일 나쁜 실패다.
 * 이제 켜는 것은 `ARKA_AGENT_RUNNER`고, 켜 놓고 키가 없으면 **부팅에서 죽는다.**
 */
export const AgentEnv = z
  .object({
    ARKA_AGENT_RUNNER: z.enum(["scripted", "anthropic"]).default("scripted"),
    ARKA_ANTHROPIC_API_KEY: z.string().min(1).optional(),
    ARKA_ANTHROPIC_MODEL: z.string().min(1).default("claude-opus-5"),
  })
  .transform((env, ctx): AgentConfig => {
    // `scripted`면 키를 아예 보지 않는다 — 키가 남아 있어도 모드는 안 바뀐다.
    if (env.ARKA_AGENT_RUNNER === "scripted") return { runner: "scripted" };
    if (env.ARKA_ANTHROPIC_API_KEY === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["ARKA_ANTHROPIC_API_KEY"],
        message: "required when ARKA_AGENT_RUNNER=anthropic",
      });
      return z.NEVER;
    }
    return { runner: "anthropic", apiKey: env.ARKA_ANTHROPIC_API_KEY, model: env.ARKA_ANTHROPIC_MODEL };
  });
