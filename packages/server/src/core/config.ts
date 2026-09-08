/**
 * 서버 설정. 도메인을 모르므로 `core/`에 둔다 — 워크스페이스 루트는
 * filesystem 전용이 아니라 git·run도 알아야 하는 앱 수준 값이다.
 */

/** `ADE_WORKSPACE`가 없으면 현재 작업 디렉터리를 쓴다. */
export function workspaceRootFromEnv(): string {
  return process.env["ADE_WORKSPACE"] ?? process.cwd();
}

/** `ADE_PORT`가 없으면 3000을 쓴다. */
export function portFromEnv(): number {
  return Number(process.env["ADE_PORT"] ?? 3000);
}
