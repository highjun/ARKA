import type { DirectoryListing, FileContent, FileEntry, FileEntryType, IWorkspaceFiles } from './IWorkspaceFiles';

type Node = { readonly type: 'dir' } | { readonly type: 'file'; readonly content: string };

/** 파일 씨앗 — 값이 문자열이면 파일, `null`이면 빈 디렉터리. 중간 디렉터리는 자동으로 생긴다. */
export type WorkspaceSeed = Readonly<Record<string, string | null>>;

/**
 * 메모리 안의 `IWorkspaceFiles`. 테스트와 스토리가 공유한다.
 *
 * 실물처럼 굴어야 한다 — `workspaceFiles.contract.ts`가 그것을 강제한다. 여기서 "대충" 통과시키면
 * 그 위의 테스트가 전부 거짓 초록이 된다.
 */
export class MockWorkspaceFiles implements IWorkspaceFiles {
  readonly #nodes = new Map<string, Node>();
  static readonly #byName = new Intl.Collator('ko').compare;

  constructor(seed: WorkspaceSeed = {}) {
    this.#nodes.set('', { type: 'dir' });
    for (const [path, value] of Object.entries(seed)) {
      this.#ensureParents(path);
      this.#nodes.set(path, value === null ? { type: 'dir' } : { type: 'file', content: value });
    }
  }

  async list(path: string): Promise<DirectoryListing> {
    const normalized = MockWorkspaceFiles.#normalize(path);
    const node = this.#nodes.get(normalized);
    if (node === undefined) throw new Error(`no such path: ${path}`);
    if (node.type !== 'dir') throw new Error(`not a directory: ${path}`);

    const prefix = normalized === '' ? '' : `${normalized}/`;
    const entries: FileEntry[] = [];
    for (const [candidate, child] of this.#nodes) {
      if (candidate === '' || !candidate.startsWith(prefix)) continue;
      const rest = candidate.slice(prefix.length);
      if (rest === '' || rest.includes('/')) continue;
      entries.push({ name: rest, type: child.type });
    }
    entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return MockWorkspaceFiles.#byName(a.name, b.name);
    });
    return { path: normalized, parent: MockWorkspaceFiles.#parentOf(normalized), entries };
  }

  async read(path: string): Promise<FileContent> {
    const normalized = MockWorkspaceFiles.#normalize(path);
    const node = this.#nodes.get(normalized);
    if (node === undefined) throw new Error(`no such path: ${path}`);
    if (node.type !== 'file') throw new Error(`is a directory: ${path}`);
    return { path: normalized, content: node.content, truncated: false, encoding: 'utf8' };
  }

  async write(path: string, content: string): Promise<void> {
    const normalized = MockWorkspaceFiles.#normalize(path);
    const node = this.#nodes.get(normalized);
    if (node === undefined) throw new Error(`no such path: ${path}`);
    if (node.type !== 'file') throw new Error(`is a directory: ${path}`);
    this.#nodes.set(normalized, { type: 'file', content });
  }

  async create(path: string, type: FileEntryType): Promise<void> {
    const normalized = MockWorkspaceFiles.#normalize(path);
    if (normalized === '') throw new Error('cannot create the root');
    if (this.#nodes.has(normalized)) throw new Error(`already exists: ${path}`);
    const parent = this.#nodes.get(MockWorkspaceFiles.#parentOf(normalized) ?? '');
    if (parent === undefined || parent.type !== 'dir') throw new Error(`no such parent: ${path}`);
    this.#nodes.set(normalized, type === 'dir' ? { type: 'dir' } : { type: 'file', content: '' });
  }

  async move(from: string, to: string): Promise<void> {
    const source = MockWorkspaceFiles.#normalize(from);
    const target = MockWorkspaceFiles.#normalize(to);
    if (source === '' || target === '') throw new Error('cannot move the root');
    if (!this.#nodes.has(source)) throw new Error(`no such path: ${from}`);
    if (this.#nodes.has(target)) throw new Error(`already exists: ${to}`);
    const parent = this.#nodes.get(MockWorkspaceFiles.#parentOf(target) ?? '');
    if (parent === undefined || parent.type !== 'dir') throw new Error(`no such parent: ${to}`);

    for (const [path, node] of [...this.#nodes]) {
      if (path !== source && !path.startsWith(`${source}/`)) continue;
      this.#nodes.delete(path);
      this.#nodes.set(`${target}${path.slice(source.length)}`, node);
    }
  }

  async remove(path: string): Promise<void> {
    const normalized = MockWorkspaceFiles.#normalize(path);
    if (normalized === '') throw new Error('cannot remove the root');
    if (!this.#nodes.has(normalized)) throw new Error(`no such path: ${path}`);
    for (const candidate of [...this.#nodes.keys()]) {
      if (candidate === normalized || candidate.startsWith(`${normalized}/`)) this.#nodes.delete(candidate);
    }
  }

  #ensureParents(path: string): void {
    const parts = path.split('/');
    for (let i = 1; i < parts.length; i += 1) {
      const dir = parts.slice(0, i).join('/');
      if (!this.#nodes.has(dir)) this.#nodes.set(dir, { type: 'dir' });
    }
  }

  /** 선행 슬래시를 떼고 `..`·빈 세그먼트·널 바이트를 거부한다 — 실물의 경로 방어와 같은 결과다. */
  static #normalize(path: string): string {
    if (path.includes('\0')) throw new Error(`invalid path: ${path}`);
    const stripped = path.replace(/^\/+/u, '').replace(/\/+$/u, '');
    if (stripped === '') return '';
    const parts = stripped.split('/');
    if (parts.some((part) => part === '' || part === '.' || part === '..')) throw new Error(`invalid path: ${path}`);
    return parts.join('/');
  }

  static #parentOf(path: string): string | null {
    if (path === '') return null;
    const slash = path.lastIndexOf('/');
    return slash === -1 ? '' : path.slice(0, slash);
  }
}
