import { describe, expect, it } from 'vitest';
import { GitModel } from '../model/GitModel';
import { MockGitService } from '../model/MockGitService';
import { parseDiffTabId, SourceControlViewModel } from './SourceControlViewModel';

const settled = () => new Promise((resolve) => setTimeout(resolve, 0));
const make = async () => {
  const service = new MockGitService();
  service.write('a.txt', 'one\n');
  await service.stage(['a.txt']);
  await service.commit('init');
  service.write('a.txt', 'two\n');
  service.write('b.txt', 'new\n');
  const viewModel = new SourceControlViewModel({ gitModel: new GitModel({ gitService: service }) });
  viewModel.onMount();
  await settled();
  return { service, viewModel };
};

describe('SourceControlViewModel', () => {
  it('마운트에 읽어 스테이지/작업 트리로 나눈다', async () => {
    const { viewModel } = await make();
    expect(viewModel.branch).toBe('main');
    expect(viewModel.unstaged).toEqual([
      { path: 'a.txt', badge: 'M', staged: false },
      { path: 'b.txt', badge: 'U', staged: false },
    ]);
    expect(viewModel.staged).toEqual([]);
  });

  it('스테이지하고 메시지를 적으면 커밋할 수 있고, 커밋하면 비워진다', async () => {
    const { viewModel } = await make();
    expect(viewModel.canCommit).toBe(false);
    viewModel.stageAll();
    await settled();
    expect(viewModel.staged.map((r) => r.badge)).toEqual(['M', 'A']);
    viewModel.setMessage('둘');
    expect(viewModel.canCommit).toBe(true);
    viewModel.commit();
    await settled();
    expect(viewModel.lastCommit).toBe('0000000');
    expect(viewModel.message).toBe('');
    expect(viewModel.staged).toEqual([]);
  });

  it('diff 탭 id를 풀고 읽어 둔다', async () => {
    const { viewModel } = await make();
    expect(parseDiffTabId('wt:src/a.ts')).toEqual({ path: 'src/a.ts', staged: false });
    expect(parseDiffTabId('nope')).toBeNull();
    viewModel.openDiff('wt:a.txt');
    await settled();
    expect(viewModel.diffOf('wt:a.txt')).toMatchObject({ loading: false });
    expect(viewModel.diffOf('wt:a.txt').text).toContain('+two');
  });
});
