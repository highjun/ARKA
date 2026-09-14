import { mkdir, realpath, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { type AgentConfig, AgentEnv } from "../features/agent/config";

/**
 * 서버 설정. 도메인을 모르므로 `core/`에 둔다 — 워크스페이스 루트는
 * filesystem 전용이 아니라 git·run도 알아야 하는 앱 수준 값이다.
 *
 * 환경변수 하나하나를 zod로 검증한다. 잘못된 값으로 조용히 뜨는 것보다 부팅에서
 * 죽는 편이 낫다 — `ARKA_PORT=abc`가 `NaN` 포트로 이어지면 원인을 한참 뒤에 찾는다.
 */

/** 환경변수가 잘못됐다. `message`에 어느 변수가 왜 틀렸는지 담는다. */
export class ConfigError extends Error {
  /** `message`는 사람이 읽고 바로 고칠 수 있어야 한다 — 변수 이름과 기대값을 담는다. */
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

const CoreEnv = z.object({
  /** 워크스페이스 루트. 없으면 현재 작업 디렉터리. */
  ARKA_WORKSPACE: z.string().min(1).optional(),
  /** 1~65535. 없으면 3000. */
  ARKA_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  /**
   * 바인드할 주소. 기본은 루프백이다 — 같은 호스트의 다른 프로세스가 이 서버를 보는 것만으로
   * 워크스페이스 전체에 읽기·쓰기가 되므로, 바깥에 열려면 명시해야 한다.
   * 컨테이너에서는 `0.0.0.0`으로 준다.
   */
  ARKA_HOST: z.string().min(1).default("127.0.0.1"),
  /** 빌드된 클라이언트가 있는 디렉터리. 없으면 정적 서빙을 켜지 않는다. */
  ARKA_CLIENT_ROOT: z.string().min(1).optional(),
  /** 데이터 디렉터리(SQLite 등). 없으면 `~/.arka`. 없는 디렉터리는 만든다. */
  ARKA_DATA_DIR: z.string().min(1).optional(),
  /** 이 이미지를 만든 커밋. 이미지가 구워 넣는다 — 소스에서 바로 띄우면 없다. */
  ARKA_GIT_SHA: z.string().min(1).optional(),
});

/** 검증을 통과한 뒤의 설정. 경로는 전부 절대경로로 풀려 있다. */
export type ServerConfig = {
  /** `realpath`를 거친 절대경로. 경로 방어(`resolveWithin`)가 이것을 전제한다. */
  readonly workspaceRoot: string;
  readonly port: number;
  readonly host: string;
  /** 절대경로. 정적 서빙을 켜지 않으면 `undefined`. */
  readonly clientRoot: string | undefined;
  /** 절대경로. `data.db`가 여기 산다. */
  readonly dataDir: string;
  /** 어느 실행기를 조립할지. 기능이 자기 변수를 소유한다(→ features/agent/config.ts). */
  readonly agent: AgentConfig;
  /** 이 이미지를 만든 커밋. 소스에서 바로 띄우면 `undefined`. */
  readonly gitSha: string | undefined;
};

/**
 * 디렉터리여야 하고 실재해야 한다. 심링크는 편다 — `resolveWithin`이 "루트는 이미
 * realpath된 값"을 요구하기 때문이다. 루트 자신이 심링크인 채로 두면 2차 검사가 항상
 * 어긋나 모든 요청이 거부된다.
 */
const resolveDirectory = async (name: string, value: string): Promise<string> => {
  const absolute = path.resolve(value);
  let real: string;
  try {
    real = await realpath(absolute);
  } catch {
    throw new ConfigError(`${name}: no such directory: ${absolute}`);
  }
  const stats = await stat(real);
  if (!stats.isDirectory()) {
    throw new ConfigError(`${name}: not a directory: ${absolute}`);
  }
  return real;
};

/**
 * **빈 문자열은 "없음"이다.**
 *
 * docker의 `ENV X=$ARG`는 인자를 안 주면 빈 문자열을 넣고, compose의 `X: "${X:-}"`도 그렇다.
 * 그것을 값으로 보면 `.min(1)`이 "너무 짧음"으로 잡아 **부팅이 죽고 재시작 루프에 빠진다** —
 * `ARKA_ANTHROPIC_API_KEY`와 `ARKA_GIT_SHA`에서 두 번 당했다. 여기서 한 번에 걷는다.
 */
const withoutEmpty = (env: Readonly<Record<string, string | undefined>>): Record<string, string | undefined> =>
  Object.fromEntries(Object.entries(env).filter(([, value]) => value !== ""));

/**
 * 조각 하나를 같은 환경에 대고 돌린다. **실패는 전부 여기서 `ConfigError`가 된다** — 조각이
 * 여럿이어도 사람이 보는 오류 꼴은 하나다. 조각끼리 순서를 타지 않게 각각 따로 판다.
 */
const parseEnv = <T>(schema: z.ZodType<T>, env: Readonly<Record<string, string | undefined>>): T => {
  const parsed = schema.safeParse(env);
  if (parsed.success) return parsed.data;
  const issue = parsed.error.issues[0];
  throw new ConfigError(`${issue?.path.join(".") ?? "env"}: ${issue?.message ?? "invalid"}`);
};

/**
 * 환경변수에서 설정을 만든다.
 *
 * @throws ConfigError 값이 스키마에 맞지 않거나, 가리키는 디렉터리가 없거나 디렉터리가 아닐 때.
 */
export const loadConfig = async (
  env: Readonly<Record<string, string | undefined>> = process.env,
): Promise<ServerConfig> => {
  const present = withoutEmpty(env);
  const { ARKA_WORKSPACE, ARKA_PORT, ARKA_HOST, ARKA_CLIENT_ROOT, ARKA_DATA_DIR, ARKA_GIT_SHA } = parseEnv(
    CoreEnv,
    present,
  );
  const agent = parseEnv(AgentEnv, present);

  // 데이터 디렉터리는 워크스페이스와 달리 우리가 소유한다 — 없으면 만든다.
  const dataDir = path.resolve(ARKA_DATA_DIR ?? path.join(os.homedir(), ".arka"));
  try {
    await mkdir(dataDir, { recursive: true });
  } catch (error) {
    throw new ConfigError(
      `ARKA_DATA_DIR: cannot create ${dataDir}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return {
    workspaceRoot: await resolveDirectory("ARKA_WORKSPACE", ARKA_WORKSPACE ?? process.cwd()),
    port: ARKA_PORT,
    host: ARKA_HOST,
    clientRoot:
      ARKA_CLIENT_ROOT === undefined ? undefined : await resolveDirectory("ARKA_CLIENT_ROOT", ARKA_CLIENT_ROOT),
    dataDir: await resolveDirectory("ARKA_DATA_DIR", dataDir),
    agent,
    gitSha: ARKA_GIT_SHA,
  };
};
