import { describe, expect, it } from 'vitest';
import { GitModel } from './GitModel';
import { diffKeyOf } from './IGitModel';
import { MockGitService } from './MockGitService';

const make = async () => {
  const service = new MockGitService();
  service.write('a.txt', 'one\n');
  await service.stage(['a.txt']);
  await service.commit('init');
  return { service, model: new GitModel({ gitService: service }) };
};

describe('GitModel', () => {
  it('refresh가 상태를 읽는다', async () => {
    const { service, model } = await make();
    service.write('a.txt', 'two\n');
    await model.refresh();
    expect(model).toMatchObject({ repository: true, branch: 'main', status: 'loaded' });
    expect(model.files).toEqual([{ path: 'a.txt', staged: null, unstaged: 'modified' }]);
  });

  it('스테이지·커밋 뒤 스스로 다시 읽는다', async () => {
    const { service, model } = await make();
    service.write('a.txt', 'two\n');
    await model.stage(['a.txt']);
    expect(model.files[0]?.staged).toBe('modified');
    const hash = await model.commit('둘');
    expect(hash).toMatch(/^0+2$/u);
    expect(model.files).toEqual([]);
  });

  it('실패는 failure에 남고 던지지 않는다', async () => {
    const { model } = await make();
    expect(await model.commit('x')).toBeNull();
    expect(model.failure).toBe('스테이지된 변경이 없다.');
  });

  it('diff를 키로 읽어 둔다', async () => {
    const { service, model } = await make();
    service.write('a.txt', 'two\n');
    await model.loadDiff('a.txt', false);
    expect(model.diffs[diffKeyOf('a.txt', false)]).toMatchObject({ status: 'loaded' });
    expect(model.diffs[diffKeyOf('a.txt', false)]?.text).toContain('+two');
  });
});
