import { CommandCenterRegistry } from '#core/commands';
import { describe, expect, it, vi } from 'vitest';
import { MarkdownPreviewModel } from '../model/MarkdownPreviewModel';
import { MockMarkdownSource } from '../model/MockMarkdownSource';
import { MarkdownPreviewViewModel } from './MarkdownPreviewViewModel';

const settled = () => new Promise((resolve) => setTimeout(resolve, 0));
const make = (activeFile: string | null) => {
  const openTab = vi.fn();
  const registry = new CommandCenterRegistry();
  const viewModel = new MarkdownPreviewViewModel({
    previewModel: new MarkdownPreviewModel({ source: new MockMarkdownSource({ 'a.md': '# 하나' }) }),
    commandCenterRegistry: registry,
    activeFile: () => activeFile,
    openTab,
  });
  return { viewModel, openTab, registry };
};

describe('MarkdownPreviewViewModel', () => {
  it('커맨드가 활성 .md 파일의 미리보기 탭을 연다', () => {
    const { openTab, registry } = make('docs/a.md');
    registry.commandRegistry.get('markdown.openPreview').execute(undefined);
    expect(openTab).toHaveBeenCalledWith({ id: 'preview:docs/a.md', kind: 'markdownPreview', title: '미리보기 a.md' });
    expect(registry.dispatchKeydown('ctrl+shift+v')).toBe(true);
  });

  it('활성 파일이 마크다운이 아니면 아무 일도 없다', () => {
    const { viewModel, openTab } = make('a.ts');
    viewModel.openActivePreview();
    expect(openTab).not.toHaveBeenCalled();
  });

  it('탭 id로 미리보기를 열고 원문을 준다', async () => {
    const { viewModel } = make(null);
    viewModel.openPreview('preview:a.md');
    expect(viewModel.previewOf('preview:a.md').loading).toBe(true);
    await settled();
    expect(viewModel.previewOf('preview:a.md')).toMatchObject({ loading: false, markdown: '# 하나' });
  });
});
