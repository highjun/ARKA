import { realpathSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { resolveWatchPaths, watchPaths, type WorkspaceWatchHandle } from './watchOperations';

/**
 * 진짜 파일시스템과 진짜 `fs.watch` 를 쓴다.
 *
 * 이 파일이 지키는 것은 **실제 변경이 실제로 전달되는가** 인데, 그건 커널 이벤트가 실제로 와야만
 * 검증된다. 도착 시점은 예측할 수 없으므로 고정 `sleep` 대신 `waitFor` 로 폴링한다(vitest의
 * `vi.waitFor`에 해당하는 게 jest 기본 API엔 없어 직접 짠다).
 */

const waitFor = async (assertion: () => void, { timeoutMs = 2_000, intervalMs = 20 } = {}): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      assertion();
      return;
    } catch (error) {
      if (Date.now() >= deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
};

let root: string;

describe('watchOperations', () => {

  beforeAll(async () => {
    root = realpathSync(await mkdtemp(path.join(os.tmpdir(), 'wb-watch-')));
    await mkdir(path.join(root, 'projects'), { recursive: true });
    await writeFile(path.join(root, 'a.md'), '원본');
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  const handles: WorkspaceWatchHandle[] = [];
  afterEach(() => {
    for (const handle of handles.splice(0)) handle.close();
  });

  const watch = (absolutePaths: readonly string[]): { calls: () => (readonly string[])[] } => {
    const calls: (readonly string[])[] = [];
    handles.push(watchPaths(root, absolutePaths, (changed) => calls.push(changed)));
    return { calls: () => calls };
  };

  it('파일이 바뀌면 루트 기준 상대경로로 알려준다', async () => {
    const target = path.join(root, 'a.md');
    const { calls } = watch([target]);

    await writeFile(target, '고친 내용');

    await waitFor(() => expect(calls().flat()).toContain('a.md'));
  });

  it('여러 이벤트가 몰리면 한 프레임으로 묶는다', async () => {
    const target = path.join(root, 'coalesce.md');
    await writeFile(target, '0');
    const { calls } = watch([target]);

    for (let index = 0; index < 5; index += 1) await writeFile(target, String(index));

    await waitFor(() => expect(calls().length).toBeGreaterThan(0));
    // 5번 썼지만 코얼레싱 창(200ms) 안에서 벌어졌으므로 프레임 수는 그보다 훨씬 적어야 한다.
    expect(calls().length).toBeLessThan(5);
  });

  it('감시 대상 하나가 없어도 나머지는 계속 감시한다', async () => {
    const gone = path.join(root, 'never-existed.md');
    const target = path.join(root, 'survives.md');
    await writeFile(target, '0');
    const { calls } = watch([gone, target]);

    await writeFile(target, '1');

    await waitFor(() => expect(calls().flat()).toContain('survives.md'));
  });

  it('close 하면 더는 알리지 않는다', async () => {
    const target = path.join(root, 'stop.md');
    await writeFile(target, '0');
    const calls: (readonly string[])[] = [];
    const handle = watchPaths(root, [target], (changed) => calls.push(changed));

    handle.close();
    await writeFile(target, '1');
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(calls).toEqual([]);
  });

  it('디렉터리를 감시하면 그 안의 새 파일도 알린다', async () => {
    const dir = path.join(root, 'projects');
    const { calls } = watch([dir]);

    await writeFile(path.join(dir, 'new.txt'), 'x');

    await waitFor(() => expect(calls().flat()).toContain('projects'));
  });

  it('resolveWatchPaths — 여러 경로를 전부 해석한다', async () => {
    const resolved = await resolveWatchPaths(root, ['', 'a.md', 'projects']);

    expect(resolved).toEqual([root, path.join(root, 'a.md'), path.join(root, 'projects')]);
  });

  it('resolveWatchPaths — 하나라도 루트 밖이면 전부 거부한다', async () => {
    const resolved = await resolveWatchPaths(root, ['a.md', '../outside']);

    expect(resolved).toBeNull();
  });
});
