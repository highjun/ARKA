/**
 * `cloudflared` CLI를 감싼다. **인자 순서를 여기 한 곳에 가둔다.**
 *
 * 실측 버전은 `cloudflared 2026.7.1`. 플래그를 위치 인자 뒤에 두면 세 서브커맨드가 각각
 * 다르게 깨지는데, 그중 하나는 **조용히** 틀린다. 아래 각 함수의 주석이 그 셋을 적는다.
 */

/** 프로세스 하나를 돌린 결과. 종료 코드는 던지지 않고 값으로 돌려준다 — 가짜로 바꾸기 쉬워진다. */
export interface ExecResult {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}

/** 프로세스를 부르는 포트. 테스트가 여기에 가짜를 끼운다. */
export type Exec = (file: string, args: readonly string[]) => Promise<ExecResult>;

/** `tunnel list -o json`이 주는 것 중 우리가 쓰는 것만. */
export interface Tunnel {
  readonly id: string;
  readonly name: string;
  readonly connections?: readonly unknown[];
}

const cloudflared = async (exec: Exec, args: readonly string[]): Promise<ExecResult> => {
  const result = await exec("cloudflared", args);
  if (result.code !== 0) {
    throw new Error(`cloudflared ${args.join(" ")} 실패 (code ${String(result.code)})\n${result.stderr}`);
  }
  return result;
};

/** 계정의 터널 전부. */
export const listTunnels = async (exec: Exec): Promise<readonly Tunnel[]> => {
  const { stdout } = await cloudflared(exec, ["tunnel", "list", "-o", "json"]);
  return JSON.parse(stdout) as readonly Tunnel[];
};

/** 이름으로 하나 찾는다. 없으면 `undefined`. */
export const findTunnelByName = async (exec: Exec, name: string): Promise<Tunnel | undefined> =>
  (await listTunnels(exec)).find((tunnel) => tunnel.name === name);

/**
 * 터널을 만들고 **UUID를 돌려준다.**
 *
 * **stdout을 파싱하지 않는다** — 버전마다 모양이 달라진다. 만든 뒤 `list`로 다시 찾는다.
 * `--cred-file`은 **이름보다 앞**이다. 뒤에 두면 `requires exactly 1 argument`로 죽는다.
 */
export const createTunnel = async (exec: Exec, name: string, credFile: string): Promise<string> => {
  await cloudflared(exec, ["tunnel", "create", "--cred-file", credFile, name]);
  const created = await findTunnelByName(exec, name);
  if (created === undefined) throw new Error(`터널 ${name}을 만들었는데 목록에 없습니다`);
  return created.id;
};

/**
 * 호스트 이름의 CNAME을 만든다. **REST가 아니라 CLI가 한다** — 그래야 `proxied`와
 * `<uuid>.cfargotunnel.com`을 우리가 알 필요가 없다.
 *
 * `--overwrite-dns`는 **위치 인자보다 앞**이다. 뒤에 두면 `expects the format …`으로 거부한다.
 */
export const routeDns = async (exec: Exec, tunnel: string, hostname: string, overwrite = false): Promise<void> => {
  const flags = overwrite ? ["--overwrite-dns"] : [];
  await cloudflared(exec, ["tunnel", "route", "dns", ...flags, tunnel, hostname]);
};

/**
 * 터널을 지운다.
 *
 * **`--force`가 TUNNEL보다 앞이어야 한다. 여기가 조용히 틀리는 자리다** — `delete`는 TUNNEL을
 * 여러 개 받는 가변 위치 인자라, 뒤에 두면 `--force`라는 **이름의 터널**을 찾으러 간다.
 */
export const deleteTunnel = async (exec: Exec, tunnel: string, force = true): Promise<void> => {
  const flags = force ? ["--force"] : [];
  await cloudflared(exec, ["tunnel", "delete", ...flags, tunnel]);
};
