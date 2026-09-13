import type { ServerConfig } from "./config";

/**
 * 테스트용 `ServerConfig`. **필드를 하나 더할 때 테스트 리터럴이 줄줄이 깨지는 것을 여기서 끊는다** —
 * `gitSha` 하나를 더했을 때 `app.test.ts`와 `responseContract.ts`가 깨졌고 후자가 라우트 테스트
 * 넷으로 번졌다. 기본값은 **아무것도 바깥에 열지 않는 값**이다.
 *
 * @param overrides - 그 테스트가 실제로 보는 필드만 적는다.
 */
export const makeConfig = (overrides: Partial<ServerConfig> & Pick<ServerConfig, "workspaceRoot">): ServerConfig => ({
  port: 0,
  host: "127.0.0.1",
  clientRoot: undefined,
  dataDir: ":memory:",
  agent: { runner: "scripted" },
  gitSha: undefined,
  ...overrides,
});
