import { watch as fsWatch, type FSWatcher } from 'node:fs';
import path from 'node:path';
import { resolveWithin } from './fileOperations';

/**
 * 워크스페이스의 파일·디렉터리 변경을 감시한다.
 *
 * **재귀 감시를 쓰지 않는다.** 워크스페이스 루트는 `~/ARKA` 전체를 가리킬 수 있고 안에는 여러
 * 프로젝트의 `node_modules` 가 있다 — 통째로 재귀 감시(`fs.watch(dir, {recursive:true})`)하면
 * inotify watch 수가 폭발할 위험이 크다. `DirectoryTreeModel` 이 이미 "펼친 폴더만 안다"는 지연
 * 로딩 철학을 갖고 있으므로, 서버 감시도 **클라이언트가 지금 아는 경로만** 받아 각각 비재귀로
 * 감시한다 — 디렉터리 하나를 감시하면 그 직계 자식의 생성·삭제·이름변경뿐 아니라 자식 파일의
 * 내용 변경까지 잡히므로 "이 목록이 바뀌었을 수 있다" 판정에는 그것으로 충분하다.
 *
 * 순수 함수로 둔다 — 라우트(`transport/watchRoutes.ts`)가 워크스페이스 루트를 채워 부를 뿐,
 * 여기 로직은 프레임워크와 무관하게 독립적으로 테스트한다(`watchOperations.test.ts`, 실제
 * 파일시스템과 실제 `fs.watch`를 쓴다).
 */

/** 짧은 시간에 몰리는 fs 이벤트를 한 프레임으로 묶는 대기 시간. 에디터의 "임시파일 쓰고 rename"
 *  저장 패턴이나 `git checkout` 처럼 여러 파일이 한꺼번에 바뀌는 경우를 한 번으로 합친다. */
const COALESCE_MS = 200;

/** 한 연결이 감시할 수 있는 경로 수의 상한. 넘으면 클라이언트가 관심 있는 것만 보내야 한다. */
export const MAX_WATCH_PATHS = 128;

/** 감시를 끊는 손잡이. 연결이 끝나면 반드시 부른다 — 안 부르면 파일 감시자가 남는다. */
export type WorkspaceWatchHandle = { readonly close: () => void };

/**
 * `absolutePaths` 각각을 감시하고, 바뀌면(코얼레싱 뒤) 루트 기준 상대경로 목록으로 `onChange` 를
 * 부른다.
 *
 * 경로 하나에 감시를 걸 수 없거나(그 사이 삭제됨 등) 감시 도중 대상이 사라지면 그 경로만 건너뛰고
 * 나머지 감시는 계속한다 — 연결 전체를 막을 이유가 없다. 대상이 사라진 경우는 그 사실 자체를 한 번
 * `onChange` 로 흘려보낸다 — 클라이언트가 다음 재조회에서 사라짐을 스스로 발견하게 하기 위해서다.
 */
export const watchPaths = (
  rootDir: string,
  absolutePaths: readonly string[],
  onChange: (relativePaths: readonly string[]) => void,
): WorkspaceWatchHandle => {
  const watchers: FSWatcher[] = [];
  const dirty = new Set<string>();
  let flushTimer: ReturnType<typeof setTimeout> | undefined;

  const relativeOf = (absPath: string): string => path.relative(rootDir, absPath);

  const scheduleFlush = (): void => {
    if (flushTimer !== undefined) return;
    flushTimer = setTimeout(() => {
      flushTimer = undefined;
      if (dirty.size === 0) return;
      const paths = [...dirty];
      dirty.clear();
      onChange(paths);
    }, COALESCE_MS);
  };

  for (const absPath of absolutePaths) {
    try {
      const watcher = fsWatch(absPath, () => {
        dirty.add(relativeOf(absPath));
        scheduleFlush();
      });
      watcher.on('error', () => {
        dirty.add(relativeOf(absPath));
        scheduleFlush();
        watcher.close();
      });
      watchers.push(watcher);
    } catch {
      // 감시를 걸 수 없다 — 이 경로만 건너뛰고 나머지는 계속한다.
    }
  }

  return {
    close: () => {
      if (flushTimer !== undefined) clearTimeout(flushTimer);
      for (const watcher of watchers) watcher.close();
    },
  };
};

/**
 * 요청받은 경로들을 검증해 절대경로로 바꾼다. `files/files.util.ts` 의 `resolveWithin` 을 그대로
 * 재사용해 경로 탈출 방어(2단계: 문자열 경계 + realpath)를 그대로 물려받는다. 하나라도 루트 밖이거나
 * 없으면 `null` — 부분 성공을 허용하지 않는다, 그러면 어느 경로가 거부됐는지가 클라이언트에 새어 나간다.
 */
export const resolveWatchPaths = async (
  rootDir: string,
  requested: readonly string[],
): Promise<readonly string[] | null> => {
  const resolved: string[] = [];
  for (const each of requested) {
    const abs = await resolveWithin(rootDir, each);
    if (abs === null) return null;
    resolved.push(abs);
  }
  return resolved;
};
