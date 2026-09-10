import { mkdir, realpath, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";

/**
 * 서버 설정. 도메인을 모르므로 `core/`에 둔다 — 워크스페이스 루트는
 * filesystem 전용이 아니라 git·run도 알아야 하는 앱 수준 값이다.
 *
 * 환경변수 하나하나를 zod로 검증한다. 잘못된 값으로 조용히 뜨는 것보다 부팅에서
 * 죽는 편이 낫다 — `ADE_PORT=abc`가 `NaN` 포트로 이어지면 원인을 한참 뒤에 찾는다.
 */

/** 환경변수가 잘못됐다. `message`에 어느 변수가 왜 틀렸는지 담는다. */
export class ConfigError extends Error {
  /** `message`는 사람이 읽고 바로 고칠 수 있어야 한다 — 변수 이름과 기대값을 담는다. */
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

const Env = z.object({
  /** 워크스페이스 루트. 없으면 현재 작업 디렉터리. */
  ADE_WORKSPACE: z.string().min(1).optional(),
  /** 1~65535. 없으면 3000. */
  ADE_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  /**
   * 바인드할 주소. 기본은 루프백이다 — 같은 호스트의 다른 프로세스가 이 서버를 보는 것만으로
   * 워크스페이스 전체에 읽기·쓰기가 되므로(→ ADR 0014), 바깥에 열려면 명시해야 한다.
   * 컨테이너에서는 `0.0.0.0`으로 준다.
   */
  ADE_HOST: z.string().min(1).default("127.0.0.1"),
  /** 빌드된 클라이언트가 있는 디렉터리. 없으면 정적 서빙을 켜지 않는다. */
  ADE_CLIENT_ROOT: z.string().min(1).optional(),
  /** 데이터 디렉터리(SQLite 등). 없으면 `~/.ade`. 없는 디렉터리는 만든다. */
  ADE_DATA_DIR: z.string().min(1).optional(),
  /** 있으면 실제 LLM 실행기를 쓴다. 없으면 스크립트 실행기(→ ADR 0019). 리포에 넣지 않는다. */
  ADE_ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ADE_ANTHROPIC_MODEL: z.string().min(1).default("claude-opus-5"),
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
  /** 키가 없으면 `undefined` — 스크립트 실행기. */
  readonly anthropic: { readonly apiKey: string; readonly model: string } | undefined;
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
 * 환경변수에서 설정을 만든다.
 *
 * @throws ConfigError 값이 스키마에 맞지 않거나, 가리키는 디렉터리가 없거나 디렉터리가 아닐 때.
 */
export const loadConfig = async (env: Readonly<Record<string, string | undefined>> = process.env): Promise<ServerConfig> => {
  const parsed = Env.safeParse(env);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path.join(".") ?? "env";
    throw new ConfigError(`${field}: ${issue?.message ?? "invalid"}`);
  }
  const { ADE_WORKSPACE, ADE_PORT, ADE_HOST, ADE_CLIENT_ROOT, ADE_DATA_DIR, ADE_ANTHROPIC_API_KEY, ADE_ANTHROPIC_MODEL } = parsed.data;

  // 데이터 디렉터리는 워크스페이스와 달리 우리가 소유한다 — 없으면 만든다.
  const dataDir = path.resolve(ADE_DATA_DIR ?? path.join(os.homedir(), ".ade"));
  try {
    await mkdir(dataDir, { recursive: true });
  } catch (error) {
    throw new ConfigError(`ADE_DATA_DIR: cannot create ${dataDir}: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    workspaceRoot: await resolveDirectory("ADE_WORKSPACE", ADE_WORKSPACE ?? process.cwd()),
    port: ADE_PORT,
    host: ADE_HOST,
    clientRoot: ADE_CLIENT_ROOT === undefined ? undefined : await resolveDirectory("ADE_CLIENT_ROOT", ADE_CLIENT_ROOT),
    dataDir: await resolveDirectory("ADE_DATA_DIR", dataDir),
    anthropic: ADE_ANTHROPIC_API_KEY === undefined ? undefined : { apiKey: ADE_ANTHROPIC_API_KEY, model: ADE_ANTHROPIC_MODEL },
  };
};
