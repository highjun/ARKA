import type { FsPort, Ports } from "./ports.ts";
import type { ExecResult } from "./cloudflared.ts";

/**
 * 테스트용 가짜 포트. **디렉터리라는 개념이 없다** — `Map` 하나에 경로→내용만 둔다.
 *
 * 심링크를 다루는 테스트가 없으므로 `exists`와 `realpath`가 같은 집합을 본다. 그 단순화가
 * 정확한 범위에서만 쓴다.
 */
export const makeFakeFs = (
  initial: Readonly<Record<string, string>> = {},
): FsPort & { files: Map<string, string>; modes: Map<string, number> } => {
  const files = new Map(Object.entries(initial));
  const modes = new Map<string, number>();
  return {
    files,
    modes,
    exists: (p) => files.has(p),
    realpath: (p) => (files.has(p) ? p : undefined),
    readFile: (p) => files.get(p) ?? "",
    writeFile: (p, content) => void files.set(p, content),
    mkdir: () => undefined,
    rename: (from, to) => {
      files.set(to, files.get(from) ?? "");
      files.delete(from);
    },
    chmod: (p, mode) => void modes.set(p, mode),
    rm: (p) => void files.delete(p),
  };
};

/** `{code:0, stdout:"", stderr:""}`에서 필요한 것만 덮는다. */
export const execResult = (over: Partial<ExecResult> = {}): ExecResult => ({ code: 0, stdout: "", stderr: "", ...over });

/**
 * 명령을 **문자열 접두사로 라우팅**한다. `[file, ...args].join(" ")`로 눌러서 고른다.
 *
 * 부른 것을 전부 `calls`에 남기므로, 단언은 "무엇을 어떤 순서로 불렀는가"로 한다.
 */
export const routeExec = (
  calls: string[][],
  routes: Readonly<Record<string, (call: readonly string[]) => ExecResult>>,
): Ports["exec"] =>
  async (file, args) => {
    const call = [file, ...args];
    calls.push(call);
    const joined = call.join(" ");
    const route = Object.keys(routes).find((prefix) => joined.startsWith(prefix));
    return Promise.resolve(route === undefined ? execResult() : (routes[route] ?? execResult)(call));
  };

/** 기본값이 전부 결정적이다 — `now`가 고정이고 `sleep`은 즉시 끝난다. */
export const makeFakePorts = (over: Partial<Ports> = {}): Ports => ({
  exec: async () => Promise.resolve(execResult()),
  fetch: async () => Promise.resolve({ status: 200, json: async () => Promise.resolve({ success: true, errors: [], result: {} }) } as unknown as Response),
  fs: makeFakeFs(),
  log: () => undefined,
  now: () => "2026-09-11T00:00:00.000Z",
  sleep: async () => Promise.resolve(),
  dryRun: false,
  ...over,
});
