import type { IWorkspaceFiles } from '../model/IWorkspaceFiles';
import { FileContentModel } from './FileContentModel';
import type { IFileContentModel } from './IFileContentModel';

/**
 * 검사하는 것은 **캐시 규칙·서버 응답을 화면 상태로 접는 규칙·편집 버퍼와 저장의 관계**다.
 *
 * 탭을 오갈 때마다 다시 읽으면 폰에서 그대로 느려지므로, "이미 읽었으면 읽지 않는다"가 이 Model
 * 의 계약이다. 잘림·바이너리는 서버가 알려주는 것을 그대로 나르지 않고 화면 어휘로 바꾼다.
 *
 * **`content` 와 `savedContent` 의 차이가 곧 dirty 다.** 따로 불리언을 두지 않는 것은, 두 소스가
 * 어긋나는 사고(예: 저장했는데 dirty 가 안 꺼짐)를 아예 만들 수 없게 하기 위해서다.
 */

type Reply = { path: string; content: string; truncated: boolean; encoding: 'utf8' | 'binary' };
type ScriptedPort = {
  list(path: string): Promise<{ path: string; parent: string | null; entries: [] }>;
  read(path: string): Promise<Reply>;
  write(path: string, content: string): Promise<void>;
};

const serving = (
  byPath: Record<string, Reply>,
  options: { writeFails?: string } = {},
): ScriptedPort & { seenReads: string[]; seenWrites: { path: string; content: string }[] } => {
  const seenReads: string[] = [];
  const seenWrites: { path: string; content: string }[] = [];
  return {
    seenReads,
    seenWrites,
    async list() {
      throw new Error('이 테스트는 목록을 보지 않는다');
    },
    async read(path) {
      seenReads.push(path);
      const reply = byPath[path];
      if (reply === undefined) throw new Error(`없는 파일: ${path}`);
      return reply;
    },
    async write(path, content) {
      seenWrites.push({ path, content });
      if (options.writeFails !== undefined) throw new Error(options.writeFails);
    },
  };
};

const text = (path: string, content: string, extra: Partial<Reply> = {}): Reply => ({
  path,
  content,
  truncated: false,
  encoding: 'utf8',
  ...extra,
});

const model = (port: ScriptedPort): IFileContentModel => {
  return new FileContentModel({ workspaceFiles: port as unknown as IWorkspaceFiles, workspaceWatch: { watch: () => () => undefined } });
};

describe('open', () => {
  it('내용을 읽어 경로별로 담는다 — content 와 savedContent 가 같은 채로 시작한다', async () => {
    const files = model(serving({ 'a.md': text('a.md', '# hi\n') }));

    await files.open('a.md');

    expect(files.files['a.md']).toEqual({
      path: 'a.md',
      status: 'loaded',
      savedContent: '# hi\n',
      content: '# hi\n',
      truncated: false,
      binary: false,
      failure: null,
      saveStatus: 'idle',
      saveFailure: null,
    });
  });

  it('이미 읽은 파일은 다시 읽지 않는다', async () => {
    const port = serving({ 'a.md': text('a.md', 'x') });
    const files = model(port);
    await files.open('a.md');

    await files.open('a.md');

    expect(port.seenReads).toEqual(['a.md']);
  });

  it('여러 파일을 따로 담는다', async () => {
    const files = model(serving({ 'a.md': text('a.md', 'A'), 'b.md': text('b.md', 'B') }));

    await files.open('a.md');
    await files.open('b.md');

    expect(files.files['a.md']?.content).toBe('A');
    expect(files.files['b.md']?.content).toBe('B');
  });

  it('실패하면 이유를 담는다', async () => {
    const files = model(serving({}));

    await files.open('gone.md');

    expect(files.files['gone.md']).toMatchObject({ status: 'error', content: '' });
    expect(files.files['gone.md']?.failure).toMatch(/없는 파일/u);
  });

  it('실패는 캐시하지 않는다 — 다시 열면 다시 시도한다', async () => {
    const port = serving({});
    const files = model(port);
    await files.open('gone.md');

    await files.open('gone.md');

    expect(port.seenReads).toEqual(['gone.md', 'gone.md']);
  });

  it('한 번 성공한 뒤에는 다시 읽지 않는다 — 실패 재시도가 캐시를 깨지 않는다', async () => {
    const replies: Record<string, Reply> = {};
    const port = serving(replies);
    const files = model(port);
    // 실패
    await files.open('a.md');
    replies['a.md'] = text('a.md', 'A');
    // 재시도 → 성공
    await files.open('a.md');

    await files.open('a.md');

    expect(port.seenReads).toEqual(['a.md', 'a.md']);
    expect(files.files['a.md']?.content).toBe('A');
  });
});

describe('서버 어휘를 화면 어휘로 바꾼다', () => {
  it('encoding 이 binary 면 binary 플래그가 선다', async () => {
    const files = model(serving({ 'x.png': text('x.png', '', { encoding: 'binary' }) }));

    await files.open('x.png');

    expect(files.files['x.png']).toMatchObject({ binary: true, content: '' });
  });

  it('잘린 것은 그대로 알린다', async () => {
    const files = model(serving({ 'big.txt': text('big.txt', 'xxx', { truncated: true }) }));

    await files.open('big.txt');

    expect(files.files['big.txt']).toMatchObject({ truncated: true, status: 'loaded' });
  });
});

describe('reload / close', () => {
  it('reload 는 이미 읽었어도 다시 읽는다', async () => {
    const port = serving({ 'a.md': text('a.md', 'x') });
    const files = model(port);
    await files.open('a.md');

    await files.reload('a.md');

    expect(port.seenReads).toEqual(['a.md', 'a.md']);
  });

  it('close 는 그 파일만 지운다', async () => {
    const files = model(serving({ 'a.md': text('a.md', 'A'), 'b.md': text('b.md', 'B') }));
    await files.open('a.md');
    await files.open('b.md');

    files.close('a.md');

    expect(files.files['a.md']).toBeUndefined();
    expect(files.files['b.md']?.content).toBe('B');
  });
});

describe('edit', () => {
  it('버퍼만 바꾼다 — savedContent 는 그대로다', async () => {
    const files = model(serving({ 'a.md': text('a.md', '원본') }));
    await files.open('a.md');

    files.edit('a.md', '고친 내용');

    expect(files.files['a.md']).toMatchObject({ content: '고친 내용', savedContent: '원본' });
  });

  it('서버로는 아무것도 나가지 않는다 — edit 는 로컬 상태다', async () => {
    const port = serving({ 'a.md': text('a.md', '원본') });
    const files = model(port);
    await files.open('a.md');

    files.edit('a.md', '고친 내용');

    expect(port.seenWrites).toEqual([]);
  });

  it('아직 안 읽은 파일은 편집해도 아무 일도 없다', () => {
    const files = model(serving({}));

    files.edit('never-opened.md', 'x');

    expect(files.files['never-opened.md']).toBeUndefined();
  });

  it('잘린 파일은 편집을 거부한다 — 저장하면 뒷부분이 사라진다', async () => {
    const files = model(serving({ 'big.txt': text('big.txt', '앞부분', { truncated: true }) }));
    await files.open('big.txt');

    files.edit('big.txt', '건드림');

    expect(files.files['big.txt']?.content).toBe('앞부분');
  });

  it('바이너리 파일은 편집을 거부한다', async () => {
    const files = model(serving({ 'x.png': text('x.png', '', { encoding: 'binary' }) }));
    await files.open('x.png');

    files.edit('x.png', '텍스트인 척');

    expect(files.files['x.png']?.content).toBe('');
  });
});

describe('save', () => {
  it('버퍼를 서버에 쓰고, 성공하면 savedContent 를 그 값으로 올린다', async () => {
    const port = serving({ 'a.md': text('a.md', '원본') });
    const files = model(port);
    await files.open('a.md');
    files.edit('a.md', '고친 내용');

    await files.save('a.md');

    expect(port.seenWrites).toEqual([{ path: 'a.md', content: '고친 내용' }]);
    expect(files.files['a.md']).toMatchObject({
      content: '고친 내용',
      savedContent: '고친 내용',
      saveStatus: 'idle',
    });
  });

  it('바꾼 게 없으면 아무것도 안 보낸다', async () => {
    const port = serving({ 'a.md': text('a.md', '원본') });
    const files = model(port);
    await files.open('a.md');

    // content === savedContent
    await files.save('a.md');

    expect(port.seenWrites).toEqual([]);
  });

  it('실패하면 saveStatus 와 이유를 남기고, 화면의 content 는 그대로 둔다', async () => {
    const port = serving({ 'a.md': text('a.md', '원본') }, { writeFails: '이 배포는 읽기 전용이다.' });
    const files = model(port);
    await files.open('a.md');
    files.edit('a.md', '고친 내용');

    await files.save('a.md');

    expect(files.files['a.md']).toMatchObject({
      content: '고친 내용',
      savedContent: '원본',
      saveStatus: 'error',
      saveFailure: '이 배포는 읽기 전용이다.',
    });
  });

  it('실패한 뒤 다시 저장하면 다시 시도한다', async () => {
    const port = serving({ 'a.md': text('a.md', '원본') }, { writeFails: '실패' });
    const files = model(port);
    await files.open('a.md');
    files.edit('a.md', '고친 내용');
    await files.save('a.md');

    await files.save('a.md');

    expect(port.seenWrites).toHaveLength(2);
  });

  it('저장 중에는 다시 부르지 않는다 — 겹쳐 보내지 않는다', async () => {
    const writes: string[] = [];
    let resolveWrite: (() => void) | undefined;
    const port: ScriptedPort = {
      async list() {
        throw new Error('안 쓴다');
      },
      async read() {
        return text('a.md', '원본');
      },
      async write(path) {
        writes.push(path);
        await new Promise<void>((resolve) => {
          resolveWrite = resolve;
        });
      },
    };
    const files = model(port);
    await files.open('a.md');
    files.edit('a.md', '고친 내용');

    const first = files.save('a.md');
    // 저장 중 — 아무 일도 하지 않는다
    const second = files.save('a.md');
    resolveWrite?.();
    await Promise.all([first, second]);

    expect(writes).toEqual(['a.md']);
  });

  it('잘린 파일은 저장을 거부한다', async () => {
    const port = serving({ 'big.txt': text('big.txt', '앞부분', { truncated: true }) });
    const files = model(port);
    await files.open('big.txt');

    await files.save('big.txt');

    expect(port.seenWrites).toEqual([]);
  });

  it('아직 안 읽은 파일을 저장해도 아무 일도 없다', async () => {
    const port = serving({});
    const files = model(port);

    await files.save('never-opened.md');

    expect(port.seenWrites).toEqual([]);
  });
});

/**
 * 파일이 옮겨지거나 이름이 바뀌면 열려 있던 버퍼가 **경로째로** 새 키를 따라가야 한다 — 안 그러면
 * 편집 중이던 내용이 옛 경로 아래 고아로 남고, 새 경로를 다시 열면 디스크에서 새로 읽어 그
 * 편집을 조용히 잃는다.
 */
describe('retargetOpenFile', () => {
  it('편집 중이던 내용까지 새 경로로 따라간다', async () => {
    const port = serving({ 'old.md': text('old.md', '원본') });
    const files = model(port);
    await files.open('old.md');
    files.edit('old.md', '고친 내용');

    files.retargetOpenFile('old.md', 'new.md');

    expect(files.files['old.md']).toBeUndefined();
    expect(files.files['new.md']).toMatchObject({ path: 'new.md', content: '고친 내용', savedContent: '원본' });
  });

  it('폴더 이동이면 그 아래 열린 파일 전부를 접두어째로 옮긴다', async () => {
    const port = serving({ 'old/a.md': text('old/a.md', 'a'), 'old/b.md': text('old/b.md', 'b') });
    const files = model(port);
    await files.open('old/a.md');
    await files.open('old/b.md');

    files.retargetOpenFile('old', 'new');

    expect(Object.keys(files.files).sort()).toEqual(['new/a.md', 'new/b.md']);
  });

  it('겹치는 접두어를 가진 다른 파일은 건드리지 않는다', async () => {
    const port = serving({ 'old.md': text('old.md', 'x') });
    const files = model(port);
    await files.open('old.md');

    files.retargetOpenFile('old', 'new');

    expect(files.files['old.md']).toBeDefined();
  });

  it('해당하는 파일이 열려 있지 않으면 아무 일도 없다', async () => {
    const port = serving({ 'a.md': text('a.md', 'x') });
    const files = model(port);
    await files.open('a.md');

    files.retargetOpenFile('nope', 'new');

    expect(Object.keys(files.files)).toEqual(['a.md']);
  });
});

/**
 * 열린 파일 집합을 구독 경로로 삼되, **편집 중(dirty)인 파일은 외부 변경이 와도 자동으로
 * 덮어쓰지 않는다** — 사용자의 미저장 편집을 보호하는 것이 이 Model 이 감시를 갖는 핵심 이유다.
 */
describe('watch', () => {
  const watchPort = () => {
    const calls: (readonly string[])[] = [];
    let unsubscribeCount = 0;
    let latestOnChange: ((changed: readonly string[]) => void) | undefined;
    return {
      calls,
      unsubscribeCount: () => unsubscribeCount,
      trigger: (changed: readonly string[]) => latestOnChange?.(changed),
      watch(paths: readonly string[], onChange: (changed: readonly string[]) => void) {
        calls.push(paths);
        latestOnChange = onChange;
        return () => {
          unsubscribeCount += 1;
        };
      },
    };
  };

  const modelWithWatch = (port: ScriptedPort, watch: ReturnType<typeof watchPort>): IFileContentModel => {
    return new FileContentModel({ workspaceFiles: port as unknown as IWorkspaceFiles, workspaceWatch: watch });
  };

  it('startWatching 을 부르면 열린 파일들을 구독한다', async () => {
    vi.useFakeTimers();
    const watch = watchPort();
    const files = modelWithWatch(serving({ 'a.md': text('a.md', 'A') }), watch);

    files.startWatching();
    await files.open('a.md');
    await vi.advanceTimersByTimeAsync(400);

    expect(watch.calls).toEqual([['a.md']]);
    vi.useRealTimers();
  });

  it('연 파일이 늘면 재구독한다 — 예전 구독은 해지된다', async () => {
    vi.useFakeTimers();
    const watch = watchPort();
    const files = modelWithWatch(serving({ 'a.md': text('a.md', 'A'), 'b.md': text('b.md', 'B') }), watch);

    files.startWatching();
    await files.open('a.md');
    await vi.advanceTimersByTimeAsync(400);
    await files.open('b.md');
    await vi.advanceTimersByTimeAsync(400);

    expect(watch.calls).toEqual([['a.md'], ['a.md', 'b.md']]);
    expect(watch.unsubscribeCount()).toBe(1);
    vi.useRealTimers();
  });

  it('깨끗한 파일이 바뀌었다는 알림이 오면 다시 읽는다', async () => {
    vi.useFakeTimers();
    const watch = watchPort();
    const port = serving({ 'a.md': text('a.md', 'A') });
    const files = modelWithWatch(port, watch);
    files.startWatching();
    await files.open('a.md');
    await vi.advanceTimersByTimeAsync(400);
    const before = port.seenReads.length;

    watch.trigger(['a.md']);
    await vi.advanceTimersByTimeAsync(0);

    expect(port.seenReads.length).toBe(before + 1);
    vi.useRealTimers();
  });

  it('편집 중(dirty)인 파일은 알림이 와도 자동으로 다시 읽지 않는다 — 미저장 편집을 지키기 위해서다', async () => {
    vi.useFakeTimers();
    const watch = watchPort();
    const port = serving({ 'a.md': text('a.md', 'A') });
    const files = modelWithWatch(port, watch);
    files.startWatching();
    await files.open('a.md');
    await vi.advanceTimersByTimeAsync(400);
    files.edit('a.md', '고친 내용');
    const before = port.seenReads.length;

    watch.trigger(['a.md']);
    await vi.advanceTimersByTimeAsync(0);

    expect(port.seenReads.length).toBe(before);
    expect(files.files['a.md']?.content).toBe('고친 내용');
    vi.useRealTimers();
  });

  it('열려 있지 않은 파일로 알림이 와도 아무 일이 없다', async () => {
    vi.useFakeTimers();
    const watch = watchPort();
    const port = serving({ 'a.md': text('a.md', 'A') });
    const files = modelWithWatch(port, watch);
    files.startWatching();
    await files.open('a.md');
    await vi.advanceTimersByTimeAsync(400);
    const before = port.seenReads.length;

    watch.trigger(['never-opened.md']);
    await vi.advanceTimersByTimeAsync(0);

    expect(port.seenReads.length).toBe(before);
    vi.useRealTimers();
  });

  it('stopWatching 하면 구독을 해지하고, 다시 부르기 전까지 재구독하지 않는다', async () => {
    vi.useFakeTimers();
    const watch = watchPort();
    const files = modelWithWatch(serving({ 'a.md': text('a.md', 'A'), 'b.md': text('b.md', 'B') }), watch);
    files.startWatching();
    await files.open('a.md');
    await vi.advanceTimersByTimeAsync(400);

    files.stopWatching();
    await files.open('b.md');
    await vi.advanceTimersByTimeAsync(400);

    expect(watch.unsubscribeCount()).toBe(1);
    expect(watch.calls.length).toBe(1);
    vi.useRealTimers();
  });
});
