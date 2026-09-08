import { access, chmod, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createEntry,
  listDirectory,
  moveEntry,
  readFileContent,
  removeEntry,
  resolveNewEntry,
  resolveWithin,
  writeFileContent,
} from './fileOperations';

/**
 * 진짜 디스크를 쓴다.
 *
 * 이 파일이 지키는 것은 **심링크 탈출 차단**인데, 그건 `realpath` 가 실제로 동작해야만 검증된다.
 * fs 를 가짜로 두면 정작 위험한 경로가 테스트 밖으로 빠진다.
 */

let root: string;
let outside: string;

beforeAll(async () => {
  // tmpdir 자체가 심링크일 수 있다(macOS 의 /var → /private/var) — 루트는 항상 편 값으로 둔다.
  outside = realpathSync(await mkdtemp(path.join(os.tmpdir(), 'wb-files-')));
  root = path.join(outside, 'root');

  await mkdir(path.join(root, 'projects', 'app'), { recursive: true });
  await writeFile(path.join(root, 'readme.md'), '# 안녕\n');
  await writeFile(path.join(root, 'zeta.txt'), 'z');
  await writeFile(path.join(root, 'alpha.txt'), 'a');
  await writeFile(path.join(root, 'a%20b.txt'), '이름에 퍼센트가 들어 있다');
  await writeFile(path.join(root, 'projects', 'app', 'main.ts'), 'export const a = 1;\n');
  await writeFile(path.join(outside, 'secret.txt'), '비밀\n');
  await symlink(path.join(outside, 'secret.txt'), path.join(root, 'escape-link'));
  await symlink(path.join(root, 'readme.md'), path.join(root, 'inside-link'));
});

afterAll(async () => {
  await rm(outside, { recursive: true, force: true });
});

const mkdirTemp = async (): Promise<string> => realpathSync(await mkdtemp(path.join(os.tmpdir(), 'wb-big-')));

describe('resolveWithin — 경로 탈출 방어', () => {
  it('빈 경로는 루트 자신이다', async () => {
    expect(await resolveWithin(root, '')).toBe(root);
  });

  it('평범한 하위 경로를 푼다', async () => {
    expect(await resolveWithin(root, 'projects/app')).toBe(path.join(root, 'projects', 'app'));
  });

  it('선행 슬래시가 절대경로로 해석되지 않는다', async () => {
    expect(await resolveWithin(root, '/readme.md')).toBe(path.join(root, 'readme.md'));
  });

  it('평문 .. 로 루트를 벗어날 수 없다', async () => {
    expect(await resolveWithin(root, '../secret.txt')).toBeNull();
  });

  it('퍼센트 인코딩을 한 번 더 풀지 않는다 — 이름에 %20 이 든 파일을 다른 파일로 열면 안 된다', async () => {
    // 디코딩은 호출부(URLSearchParams)의 일이다. 여기서 또 풀면 `a%20b.txt` 가 `a b.txt` 로 열린다.
    expect(await resolveWithin(root, 'a%20b.txt')).toBe(path.join(root, 'a%20b.txt'));
    expect(await resolveWithin(root, 'a b.txt')).toBeNull();
  });

  it('루트 밖을 가리키는 심링크를 막는다 — 1차 문자열 검사만으로는 통과하는 경로다', async () => {
    expect(await resolveWithin(root, 'escape-link')).toBeNull();
  });

  it('루트 안을 가리키는 심링크는 허용한다', async () => {
    expect(await resolveWithin(root, 'inside-link')).toBe(path.join(root, 'readme.md'));
  });

  it('없는 경로는 거부한다', async () => {
    expect(await resolveWithin(root, 'nope/none.txt')).toBeNull();
  });

  it('깨진 퍼센트 인코딩과 널 바이트를 거부한다', async () => {
    expect(await resolveWithin(root, '%')).toBeNull();
    expect(await resolveWithin(root, 'readme.md%00.png')).toBeNull();
  });
});

describe('listDirectory', () => {
  it('디렉터리를 먼저, 그다음 이름순으로 준다', async () => {
    const listing = await listDirectory(root, root);
    expect(listing.entries.map((entry) => entry.name)).toEqual([
      'projects',
      'a%20b.txt',
      'alpha.txt',
      'escape-link',
      'inside-link',
      'readme.md',
      'zeta.txt',
    ]);
    expect(listing.entries[0]?.type).toBe('dir');
  });

  it('루트의 parent 는 null 이다', async () => {
    expect(await listDirectory(root, root)).toMatchObject({ path: '', parent: null });
  });

  it('한 단계 아래의 parent 는 빈 문자열 — 루트를 가리킨다', async () => {
    expect(await listDirectory(root, path.join(root, 'projects'))).toMatchObject({ path: 'projects', parent: '' });
  });

  it('두 단계 아래는 상위 경로를 준다', async () => {
    expect(await listDirectory(root, path.join(root, 'projects', 'app'))).toMatchObject({
      path: path.join('projects', 'app'),
      parent: 'projects',
    });
  });

  it('이름과 종류만 준다 — 그 외의 필드는 채우려면 엔트리마다 stat 을 해야 한다', async () => {
    const listing = await listDirectory(root, root);

    expect(Object.keys(listing.entries[0] ?? {}).sort()).toEqual(['name', 'type']);
  });

  /**
   * 예전에는 엔트리마다 `stat` 을 했는데, `stat` 은 심링크를 따라간다 — 가리키는 대상이 없으면
   * 예외가 나고 그 항목이 **목록에서 조용히 사라졌다.** 있는 파일이 안 보이는 종류의 버그다.
   */
  it('깨진 심링크도 목록에 남는다', async () => {
    await symlink(path.join(outside, '없는-파일'), path.join(root, 'dangling-link'));

    const listing = await listDirectory(root, root);

    expect(listing.entries.map((entry) => entry.name)).toContain('dangling-link');
  });
});

describe('readFileContent', () => {
  it('내용과 루트 기준 상대 경로를 준다', async () => {
    expect(await readFileContent(root, path.join(root, 'readme.md'))).toEqual({
      path: 'readme.md',
      content: '# 안녕\n',
      truncated: false,
      encoding: 'utf8',
    });
  });

  it('널 바이트가 있으면 바이너리로 보고 내용을 보내지 않는다', async () => {
    const dir = await mkdirTemp();
    const file = path.join(dir, 'bin');
    await writeFile(file, Buffer.from([0x89, 0x50, 0x00, 0x01]));

    expect(await readFileContent(dir, file)).toEqual({ path: 'bin', content: '', truncated: false, encoding: 'binary' });
    await rm(dir, { recursive: true, force: true });
  });

  it('상한을 넘으면 잘라서 truncated 로 알린다 — 전체를 메모리에 올리지 않는다', async () => {
    const dir = await mkdirTemp();
    const file = path.join(dir, 'big.txt');
    await writeFile(file, 'x'.repeat(600 * 1024));

    const result = await readFileContent(dir, file);
    expect(result.truncated).toBe(true);
    expect(result.content).toHaveLength(512 * 1024);
    await rm(dir, { recursive: true, force: true });
  });

  it('빈 파일도 다룬다', async () => {
    const dir = await mkdirTemp();
    const file = path.join(dir, 'empty.txt');
    await writeFile(file, '');

    expect(await readFileContent(dir, file)).toMatchObject({ content: '', truncated: false, encoding: 'utf8' });
    await rm(dir, { recursive: true, force: true });
  });
});

describe('writeFileContent', () => {
  it('파일을 통째로 덮어쓴다', async () => {
    const dir = await mkdirTemp();
    const file = path.join(dir, 'a.md');
    await writeFile(file, '이전 내용');

    await writeFileContent(file, '새 내용');

    expect(await readFile(file, 'utf8')).toBe('새 내용');
    await rm(dir, { recursive: true, force: true });
  });

  it('빈 문자열로도 비운다', async () => {
    const dir = await mkdirTemp();
    const file = path.join(dir, 'a.md');
    await writeFile(file, '지울 내용');

    await writeFileContent(file, '');

    expect(await readFile(file, 'utf8')).toBe('');
    await rm(dir, { recursive: true, force: true });
  });

  /**
   * 배포 마운트가 `:ro` 면 여기서 `EROFS` 가 난다. 파일 하나를 읽기 전용으로 만들어 같은 종류의
   * 실패(`EACCES`)를 재현한다 — 마운트 자체를 읽기 전용으로 만드는 것은 이 테스트 환경에서 못 한다.
   * `FilesService` 가 이 오류를 사람이 읽을 메시지로 바꾸는 것은 여기서는 보지 않는다 — 여기서는
   * **오류가 삼켜지지 않고 그대로 올라오는지**만 본다.
   */
  it('쓰기 권한이 없으면 오류가 그대로 올라온다', async () => {
    const dir = await mkdirTemp();
    const file = path.join(dir, 'locked.md');
    await writeFile(file, '원본');
    await chmod(file, 0o444);

    await expect(writeFileContent(file, '새 내용')).rejects.toThrow();

    await chmod(file, 0o644);
    await rm(dir, { recursive: true, force: true });
  });
});

describe('resolveNewEntry — 아직 없는 대상의 경로', () => {
  it('부모가 있으면 새 이름을 이어 붙인다', async () => {
    expect(await resolveNewEntry(root, 'projects/new.txt')).toBe(path.join(root, 'projects', 'new.txt'));
  });

  it('부모째로 없으면 거부한다', async () => {
    expect(await resolveNewEntry(root, 'nope/new.txt')).toBeNull();
  });

  it('루트 자신은 대상이 될 수 없다', async () => {
    expect(await resolveNewEntry(root, '')).toBeNull();
  });

  it('.. 로 부모를 벗어날 수 없다', async () => {
    expect(await resolveNewEntry(root, '../escaped.txt')).toBeNull();
  });

  it('부모가 루트 밖을 가리키는 심링크면 거부한다', async () => {
    expect(await resolveNewEntry(root, 'escape-link/new.txt')).toBeNull();
  });

  it('널 바이트를 거부한다', async () => {
    expect(await resolveNewEntry(root, 'a\0.txt')).toBeNull();
  });
});

describe('createEntry', () => {
  it('빈 파일을 만든다', async () => {
    const dir = await mkdirTemp();
    const file = path.join(dir, 'new.txt');

    await createEntry(file, 'file');

    expect(await readFile(file, 'utf8')).toBe('');
    await rm(dir, { recursive: true, force: true });
  });

  it('디렉터리를 만든다', async () => {
    const dir = await mkdirTemp();
    const sub = path.join(dir, 'new-folder');

    await createEntry(sub, 'dir');

    await expect(access(sub)).resolves.toBeUndefined();
    await rm(dir, { recursive: true, force: true });
  });

  it('이미 있으면 실패한다 — 덮어쓰지 않는다', async () => {
    const dir = await mkdirTemp();
    const file = path.join(dir, 'exists.txt');
    await writeFile(file, '원본');

    await expect(createEntry(file, 'file')).rejects.toThrow();

    expect(await readFile(file, 'utf8')).toBe('원본');
    await rm(dir, { recursive: true, force: true });
  });
});

describe('moveEntry', () => {
  it('파일을 옮긴다 — 내용이 그대로 따라간다', async () => {
    const dir = await mkdirTemp();
    const from = path.join(dir, 'old.txt');
    const to = path.join(dir, 'new.txt');
    await writeFile(from, '내용');

    await moveEntry(from, to);

    expect(await readFile(to, 'utf8')).toBe('내용');
    await expect(access(from)).rejects.toThrow();
    await rm(dir, { recursive: true, force: true });
  });

  it('디렉터리를 옮긴다 — 안의 파일까지 따라간다', async () => {
    const dir = await mkdirTemp();
    const from = path.join(dir, 'old-folder');
    const to = path.join(dir, 'new-folder');
    await mkdir(from);
    await writeFile(path.join(from, 'inner.txt'), '안쪽');

    await moveEntry(from, to);

    expect(await readFile(path.join(to, 'inner.txt'), 'utf8')).toBe('안쪽');
    await rm(dir, { recursive: true, force: true });
  });
});

describe('removeEntry', () => {
  it('파일을 지운다', async () => {
    const dir = await mkdirTemp();
    const file = path.join(dir, 'gone.txt');
    await writeFile(file, '내용');

    await removeEntry(file);

    await expect(access(file)).rejects.toThrow();
    await rm(dir, { recursive: true, force: true });
  });

  it('디렉터리를 안까지 통째로 지운다', async () => {
    const dir = await mkdirTemp();
    const sub = path.join(dir, 'folder');
    await mkdir(sub);
    await writeFile(path.join(sub, 'inner.txt'), '안쪽');

    await removeEntry(sub);

    await expect(access(sub)).rejects.toThrow();
    await rm(dir, { recursive: true, force: true });
  });
});
