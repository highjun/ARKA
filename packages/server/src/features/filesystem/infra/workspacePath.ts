import path from "node:path";
import type { URI } from "contracts";
import { FileError } from "../domain/errors";

/**
 * URI를 workspace 루트 안의 디스크 절대경로로 바꾼다.
 *
 * 루트를 인자로 받는다 — 환경변수를 직접 읽으면 테스트가 전역 상태에 묶인다.
 *
 * @throws FileError
 * - `NoPermission` 결과 경로가 루트를 벗어날 때
 * - `Unavailable` `file:` 스킴이 아니거나 authority가 있을 때
 */
export function resolveWorkspacePath(uri: URI, workspaceRoot: string): string {
  if (uri.scheme !== "file") {
    throw new FileError(
      "Unavailable",
      `no provider for scheme "${uri.scheme}": ${uri.toString()}`,
    );
  }
  // authority가 있으면 원격 파일을 뜻하는데 로컬 프로바이더는 다루지 않는다.
  if (uri.authority !== "") {
    throw new FileError(
      "Unavailable",
      `remote file authority is not supported: ${uri.toString()}`,
    );
  }

  const root = path.resolve(workspaceRoot);
  const resolved = path.resolve(root, uri.path);

  // `..`를 문자열로 찾으면 `a/../../b` 같은 조합을 놓친다. 해석을 끝낸 뒤
  // 루트 하위인지 보는 것만이 확실하다.
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new FileError(
      "NoPermission",
      `path escapes the workspace root: ${uri.toString()}`,
    );
  }

  return resolved;
}
