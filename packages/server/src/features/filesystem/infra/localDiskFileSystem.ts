import fs from "node:fs/promises";
import type { Stats } from "node:fs";
import type { URI } from "contracts";
import { FileError } from "../domain/errors";
import { resolveWorkspacePath } from "./workspacePath";

export interface ReadResult {
  content: Uint8Array;
  etag: string;
}

/**
 * workspace 안의 파일을 읽는다.
 *
 * @throws FileError 경로가 루트를 벗어나거나, 파일이 없거나, 권한이 없거나,
 * 디렉터리일 때
 */
export async function readFile(
  uri: URI,
  workspaceRoot: string,
): Promise<ReadResult> {
  // try 밖에서 부른다. 안이면 여기서 던진 FileError가 아래 매핑에 다시 걸려
  // NoPermission이 Unavailable로 덮인다.
  const absolutePath = resolveWorkspacePath(uri, workspaceRoot);

  let handle;
  try {
    handle = await fs.open(absolutePath, "r");
  } catch (error) {
    throw toFileError(error, uri);
  }

  try {
    // 경로로 stat과 read를 따로 부르면 그사이 파일이 바뀌었을 때 etag가 내용과
    // 어긋난다. 같은 핸들을 쓰면 둘이 같은 것을 본다.
    const stats = await handle.stat();
    const content = await handle.readFile();
    return { content, etag: etagOf(stats) };
  } catch (error) {
    throw toFileError(error, uri);
  } finally {
    await handle.close();
  }
}

/**
 * 내용 해시가 아니라 mtime과 크기를 쓴다. 해시는 파일 전체를 읽어야 해서
 * 목록처럼 stat만 하는 자리에서 쓸 수 없다.
 */
function etagOf(stats: Stats): string {
  return `${stats.mtimeMs}-${stats.size}`;
}

function toFileError(error: unknown, uri: URI): FileError {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  const target = uri.toString();

  switch (code) {
    case "ENOENT":
      return new FileError("NotFound", `no such file: ${target}`);
    case "EACCES":
    case "EPERM":
      return new FileError("NoPermission", `permission denied: ${target}`);
    case "EISDIR":
      return new FileError("IsADirectory", `is a directory: ${target}`);
    case "ENOTDIR":
      return new FileError("NotADirectory", `not a directory: ${target}`);
    default:
      return new FileError("Unavailable", `cannot read ${target}: ${code}`);
  }
}
