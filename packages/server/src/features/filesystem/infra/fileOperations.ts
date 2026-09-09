import { mkdir, open, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DirectoryListing, FileContent, FileEntry, FileEntryType } from '#contracts';

/**
 * 워크스페이스를 읽고 쓴다 — 목록·읽기·쓰기·생성·이동·삭제.
 *
 * 경로 방어가 이 파일의 전부라고 봐도 된다. `static/static.util.ts` 의 것과 달리 **심링크까지
 * 본다** — dist 는 우리가 만든 정적 산출물이지만 워크스페이스에는 실제로 심링크가 있고,
 * 문자열 검사만으로는 그 너머로 나가는 것을 막지 못한다.
 *
 * 순수 함수로 둔다 — 라우트(`transport/fsRoutes.ts`)와 유스케이스(`services/`)가 워크스페이스 루트를
 * 채워 부를 뿐, 여기 로직은 프레임워크와 무관하게 독립적으로 테스트한다(`fileOperations.test.ts`,
 * 실제 디스크·심링크를 쓴다).
 *
 * 마운트가 `:ro` 면 쓰기·생성·이동·삭제는 전부 `EROFS` 로 실패한다 — 그건 이 파일이 아니라
 * 배포 설정(`docker-compose.yml`)이 정한다.
 */

/** 폰 브라우저에 통째로 밀어넣지 않기 위한 상한. 넘으면 잘라서 `truncated` 로 알린다. */
const MAX_BYTES = 512 * 1024;

/**
 * 요청 경로를 루트 안의 실제 경로로 푼다. 밖으로 나가면 `null`(=거부).
 *
 * 두 단계여야 하는 이유 — 1차만 두면 `root/link → /etc` 같은 심링크로 걸어 나갈 수 있고,
 * 2차만 두면 존재하지 않는 경로에서 `realpath` 가 던져 판정 자체를 못 한다.
 *
 * **`rootDir` 은 이미 `realpath` 된 값이어야 한다.** 루트 자신이 심링크면 2차 검사가 항상
 * 어긋나서 모든 요청이 거부된다.
 */
export const resolveWithin = async (rootDir: string, requested: string): Promise<string | null> => {
  // **여기서 디코딩하지 않는다.** 호출부가 `URLSearchParams` 로 이미 풀어서 준다. 한 번 더 풀면
  // `a%20b.txt` 라는 이름의 파일이 `a b.txt` 로 열린다 — 조용히 다른 파일을 여는 종류의 버그다.
  if (requested.includes('\0')) return null;

  // 선행 슬래시를 떼어 상대경로로 만든다 — 그러지 않으면 resolve 가 root 를 통째로 무시한다.
  const relative = requested.replace(/^\/+/u, '');
  const full = path.resolve(rootDir, relative);

  // 1차 — 문자열 경계(심링크 이전). `..` 는 resolve 가 이미 접었다.
  if (full !== rootDir && !full.startsWith(`${rootDir}${path.sep}`)) return null;

  // 2차 — 심링크를 편 뒤 다시 본다.
  try {
    const real = await realpath(full);
    if (real !== rootDir && !real.startsWith(`${rootDir}${path.sep}`)) return null;
    return real;
  } catch {
    return null; // 없는 경로
  }
};

/**
 * 아직 없는 대상(생성·이동의 목적지)의 경로를 부모 기준으로 푼다.
 *
 * `resolveWithin` 은 대상이 이미 존재해야 한다 — `realpath` 로 심링크까지 확인하기 때문이다.
 * 생성·이동의 목적지는 정의상 아직 없으므로 그 확인을 대상 자신이 아니라 **부모**에게 대신
 * 시킨다. 부모가 루트 밖이면(심링크 포함) 거부되고, 부모가 실재하면 그 실경로에 새 이름만
 * 이어 붙인다 — 이름 자체는 `path.resolve` 를 이미 거쳐서 구분자나 `..` 를 담을 수 없다.
 *
 * 루트 자신은 대상이 될 수 없다 — 그러지 않으면 워크스페이스를 통째로 옮기거나 만들 수 있다는
 * 뜻이 된다.
 */
export const resolveNewEntry = async (rootDir: string, requested: string): Promise<string | null> => {
  if (requested.includes('\0')) return null;
  const relative = requested.replace(/^\/+/u, '');
  const full = path.resolve(rootDir, relative);
  if (full === rootDir) return null;
  if (!full.startsWith(`${rootDir}${path.sep}`)) return null;

  const name = path.basename(full);
  const parentRelative = path.relative(rootDir, path.dirname(full));
  const parentResolved = await resolveWithin(rootDir, parentRelative);
  if (parentResolved === null) return null;
  return path.join(parentResolved, name);
};

/** 이름 비교기를 한 번만 만든다 — `localeCompare` 는 부를 때마다 collator 를 새로 세운다. */
const byName = new Intl.Collator('ko').compare;

/**
 * 디렉터리 목록. **디렉터리 먼저, 그다음 이름순**(한국어 로캘) — 탐색기에서 눈이 가는 순서다.
 *
 * **엔트리마다 `stat` 을 하지 않는다.** 예전에는 그렇게 해서 `size`/`mtime` 까지 실어 보냈는데,
 * 화면은 이름과 종류만 쓴다 — 엔트리 수에 비례하는 syscall 이 아무도 안 읽는 필드를 위해 있었다.
 * `withFileTypes` 는 `getdents64` 가 함께 주는 `d_type` 을 그대로 쓰므로 종류가 공짜다.
 *
 * 곁가지로 심링크 문제도 없어진다 — `stat` 은 링크를 따라가서, 깨진 심링크가 예외를 던지고
 * 목록에서 조용히 사라졌다. 이제 링크는 링크 그대로 보인다.
 */
export const listDirectory = async (rootDir: string, absDir: string): Promise<DirectoryListing> => {
  const dirents = await readdir(absDir, { withFileTypes: true });
  const entries: FileEntry[] = dirents
    // 소켓·디바이스 등은 목록에 없다. 심링크는 무엇을 가리키는지 모르는 채로 파일로 둔다 —
    // 알아내려면 링크마다 `stat` 을 해야 하고, 그게 방금 걷어낸 비용이다.
    .filter((entry) => entry.isDirectory() || entry.isFile() || entry.isSymbolicLink())
    .map((entry): FileEntry => ({ name: entry.name, type: entry.isDirectory() ? 'dir' : 'file' }));

  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return byName(a.name, b.name);
  });

  const relative = path.relative(rootDir, absDir); // 루트면 ''
  const parent = relative === '' ? null : path.dirname(relative) === '.' ? '' : path.dirname(relative);
  return { path: relative, parent, entries };
};

/**
 * 널 바이트가 있으면 바이너리로 친다.
 *
 * 확장자로 판정하지 않는 이유 — 확장자 없는 실행파일도, `.txt` 인 바이너리도 있다. 널 바이트는
 * UTF-8 텍스트에 나올 수 없어서, 짧고 틀리지 않는 판정이다.
 */
const looksBinary = (buffer: Buffer): boolean => buffer.includes(0);

/**
 * 파일 앞부분만 읽는다.
 *
 * `readFile` 로 통째로 읽고 자르면 상한이 무의미하다 — 400MB 짜리가 하나 있으면 그 순간 서버가
 * 그만큼을 메모리에 올린다. 핸들을 열어 딱 `MAX_BYTES` 만 읽는다.
 */
export const readFileContent = async (rootDir: string, absPath: string): Promise<FileContent> => {
  const relative = path.relative(rootDir, absPath);
  const handle = await open(absPath, 'r');

  try {
    const { size } = await handle.stat();
    const buffer = Buffer.alloc(Math.min(size, MAX_BYTES));
    if (buffer.byteLength > 0) await handle.read(buffer, 0, buffer.byteLength, 0);

    if (looksBinary(buffer)) {
      return { path: relative, content: '', truncated: false, encoding: 'binary' };
    }
    return { path: relative, content: buffer.toString('utf8'), truncated: size > MAX_BYTES, encoding: 'utf8' };
  } finally {
    await handle.close();
  }
};

/**
 * 파일을 통째로 덮어쓴다.
 *
 * 호출부가 이미 `resolveWithin` 으로 경로를 걸렀고, 대상이 파일임도 `stat` 으로 확인한 뒤 부른다
 * — 여기서 다시 확인하지 않는다(`fsRoutes` 의 라우팅 하나가 그 책임을 진다).
 *
 * **잘린 파일(`truncated: true`)은 여기로 오면 안 된다.** 앞부분만 읽은 내용을 덮어쓰면 뒷부분이
 * 통째로 사라진다 — 그 판단은 클라이언트가 `readOnly` 로 미리 막는다(`FileContentViewModel`).
 * 서버는 그 판단을 다시 하지 않는다 — 잘렸는지 알려면 다시 읽어야 하고, 그 비용을 쓰기마다
 * 치를 이유가 없다.
 */
export const writeFileContent = async (absPath: string, content: string): Promise<void> => {
  await writeFile(absPath, content, 'utf8');
};

/**
 * 새 파일 또는 빈 디렉터리를 만든다.
 *
 * 이미 있으면 `EEXIST` 로 실패한다 — 그 경우를 덮어쓰는 것은 `writeFileContent`(파일)나
 * 다른 이름으로 다시 시도하는 것(디렉터리)의 몫이지, 이 함수가 조용히 흡수할 일이 아니다.
 */
export const createEntry = async (absPath: string, type: FileEntryType): Promise<void> => {
  if (type === 'dir') await mkdir(absPath);
  else await writeFile(absPath, '', { flag: 'wx' });
};

/**
 * 파일이나 디렉터리를 옮긴다. 같은 부모 안에서 옮기면 이름변경이다 — 별도 함수를 두지 않는다.
 *
 * 호출부가 이미 출발지를 `resolveWithin`, 목적지를 `resolveNewEntry` 로 걸렀고, 목적지가 비어
 * 있는지(덮어쓰지 않는지)도 미리 확인한 뒤 부른다 — 여기서 다시 확인하지 않는다.
 */
export const moveEntry = async (fromAbs: string, toAbs: string): Promise<void> => {
  await rename(fromAbs, toAbs);
};

/**
 * 파일이나 디렉터리를 지운다. 디렉터리면 안까지 통째로.
 *
 * 되돌릴 방법이 없는 작업이다 — 확인은 호출부(컨텍스트 메뉴의 다이얼로그)의 몫이고, 여기서는
 * 다시 묻지 않는다. 워크스페이스 루트 자신을 지우는 것을 막는 것도 호출부(`fsRoutes`)의
 * 몫이다 — 이 함수는 `rootDir` 을 모르므로 판단할 수 없다.
 */
export const removeEntry = async (absPath: string): Promise<void> => {
  await rm(absPath, { recursive: true });
};
