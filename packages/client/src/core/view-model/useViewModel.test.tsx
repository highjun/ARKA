import { act, fireEvent, render, screen } from '@testing-library/react';
import { createContainer, createToken, scoped } from '#core/di';
import { atom } from 'nanostores';
import { describe, expect, it } from 'vitest';
import { ViewModelBase } from './ViewModelBase';
import { ViewModelProvider } from './ViewModelProvider';
import { useViewModel } from './useViewModel';

const WorkspaceViewModelToken = createToken<WorkspaceViewModel>('workspaceViewModel');

// ViewModel 계약 — atom은 등장하지 않는다(React 경계를 넘지 않는다). 관찰 property는 plain 값,
// command는 메서드로 노출한다.
interface WorkspaceViewModel {
  readonly openFileId: string | null;
  readonly isDirty: boolean;
  /** atom을 감싸지 않은 그냥 getter — `#private` 필드를 그대로 돌려준다. */
  readonly label: string;
  openFile(fileId: string): void;
  markDirty(): void;
}

// 실제 앱의 모든 ViewModel처럼 `ViewModelBase`를 상속해 atom을 `observe()`로 감싸고, getter는
// plain 값을 돌려준다 — 계약에 `ReadableAtom`이 등장하지 않는다.
class WorkspaceViewModelImpl extends ViewModelBase implements WorkspaceViewModel {
  readonly #openFileId = this.observe(atom<string | null>(null));
  readonly #isDirty = this.observe(atom(false));
  readonly #label = 'workspace';

  get openFileId(): string | null {
    return this.#openFileId.get();
  }

  get isDirty(): boolean {
    return this.#isDirty.get();
  }

  get label(): string {
    return this.#label;
  }

  openFile(fileId: string) {
    this.#openFileId.set(fileId);
  }
  markDirty() {
    this.#isDirty.set(true);
  }
}

// View — useViewModel 이 반환한 원본 인스턴스를 그대로 쓴다. `openFileId`/`isDirty`는 이미 plain
// 값이다 — View는 useStore를 직접 부르지 않는다.
const WorkspaceView = () => {
  const vm = useViewModel(WorkspaceViewModelToken);
  return (
    <button type="button" onClick={() => vm.openFile('readme.md')}>
      {vm.label}: {vm.openFileId ?? 'none'}
      {vm.isDirty ? ' *' : ''}
    </button>
  );
};

/**
 * ViewModel 은 SCOPED 다 — 같은 화면을 두 번 열면 VM 도 둘이어야 한다. 그래서 루트가 아니라
 * `createScope('test')` 로 만든 자식을 넘긴다.
 *
 * 앞으로는 마운트 경계에서 이 `createScope('test')`/`dispose()` 를 자동으로 부르는 provider 가 생긴다.
 * 여기서는 아직 손으로 만든다.
 */
const setup = () => {
  const root = createContainer();
  root.register(WorkspaceViewModelToken, scoped(() => new WorkspaceViewModelImpl()));
  return root.createScope('test');
};

describe('useViewModel', () => {
  it('resolves the VM instance and renders its observable property', () => {
    render(
      <ViewModelProvider container={setup()}>
        <WorkspaceView />
      </ViewModelProvider>,
    );

    expect(screen.getByRole('button').textContent).toBe('workspace: none');
  });

  it('re-renders the View when a VM property changes (자동 구독)', () => {
    render(
      <ViewModelProvider container={setup()}>
        <WorkspaceView />
      </ViewModelProvider>,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button').textContent).toBe('workspace: readme.md');
  });

  it('구독 필드가 여러 개여도(atom 두 개) 각각 정확한 값으로 반영한다', () => {
    const container = createContainer();
    container.register(WorkspaceViewModelToken, scoped(() => new WorkspaceViewModelImpl()));
    const vm = container.resolve(WorkspaceViewModelToken);

    render(
      <ViewModelProvider container={container}>
        <WorkspaceView />
      </ViewModelProvider>,
    );
    expect(screen.getByRole('button').textContent).toBe('workspace: none');

    act(() => vm.markDirty());
    expect(screen.getByRole('button').textContent).toBe('workspace: none *');

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button').textContent).toBe('workspace: readme.md *');
  });

  it('resolves the same VM instance across re-renders within one scope', () => {
    const container = setup();

    const { rerender } = render(
      <ViewModelProvider container={container}>
        <WorkspaceView />
      </ViewModelProvider>,
    );
    fireEvent.click(screen.getByRole('button'));
    rerender(
      <ViewModelProvider container={container}>
        <WorkspaceView />
      </ViewModelProvider>,
    );

    // 인스턴스가 새로 만들어졌다면 atom 이 초기값(`none`)으로 돌아갔을 것이다.
    expect(screen.getByRole('button').textContent).toBe('workspace: readme.md');
  });

  it('gives each scope its own VM instance', () => {
    const root = createContainer();
    root.register(WorkspaceViewModelToken, scoped(() => new WorkspaceViewModelImpl()));

    const first = root.createScope('test').resolve(WorkspaceViewModelToken);
    const second = root.createScope('test').resolve(WorkspaceViewModelToken);

    expect(first).not.toBe(second);
  });

  it('returns the exact same reference across re-renders (프록시 없음 — 값이 바뀌어도 정체성 불변)', () => {
    const container = setup();
    const vm = container.resolve(WorkspaceViewModelToken);
    const seen: WorkspaceViewModel[] = [];

    const ProbeView = () => {
      const probed = useViewModel(WorkspaceViewModelToken);
      seen.push(probed);
      return <span>{probed.openFileId ?? 'none'}</span>;
    };

    render(
      <ViewModelProvider container={container}>
        <ProbeView />
      </ViewModelProvider>,
    );
    act(() => vm.openFile('readme.md'));

    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(seen.every((instance) => instance === seen[0])).toBe(true);
  });

  it('throws when used outside a ViewModelProvider', () => {
    expect(() => render(<WorkspaceView />)).toThrow('useAppContext must be used within a ViewModelProvider.');
  });
});

describe('useViewModel — 생명주기(onMount/onDispose)', () => {
  interface WatcherViewModel {
    readonly watching: boolean;
    onMount(): void;
    onDispose(): void;
  }

  class WatcherViewModelImpl extends ViewModelBase implements WatcherViewModel {
    readonly #watching = this.observe(atom(false));

    get watching(): boolean {
      return this.#watching.get();
    }

    onMount() {
      this.#watching.set(true);
    }
    onDispose() {
      this.#watching.set(false);
    }
  }

  const WatcherViewModelToken = createToken<WatcherViewModel>('watcherViewModel');

  const WatcherView = () => {
    const vm = useViewModel(WatcherViewModelToken);
    return <span>{vm.watching ? 'watching' : 'idle'}</span>;
  };

  const setupWatcher = () => {
    const root = createContainer();
    root.register(WatcherViewModelToken, scoped(() => new WatcherViewModelImpl()));
    return root.createScope('test');
  };

  it('calls onMount once the View mounts', () => {
    render(
      <ViewModelProvider container={setupWatcher()}>
        <WatcherView />
      </ViewModelProvider>,
    );

    expect(screen.getByText('watching')).toBeTruthy();
  });

  it('calls onDispose when the View unmounts', () => {
    const container = setupWatcher();
    const vm = container.resolve(WatcherViewModelToken);

    const { unmount } = render(
      <ViewModelProvider container={container}>
        <WatcherView />
      </ViewModelProvider>,
    );
    unmount();

    expect(vm.watching).toBe(false);
  });

  it('VM이 생명주기를 구현하지 않아도 그냥 동작한다', () => {
    // 위 `WorkspaceView` 테스트들이 이미 이걸 증명한다 — `WorkspaceViewModel`엔 onMount가 없다.
    expect(() =>
      render(
        <ViewModelProvider container={setup()}>
          <WorkspaceView />
        </ViewModelProvider>,
      ),
    ).not.toThrow();
  });
});

describe('useViewModel — atom이 없는 대상(Registry 등)', () => {
  // Registry는 ViewModelBase를 상속하지 않는다 — atom이 없으니 구독할 것도 없다.
  class PlainRegistry {
    readonly items: readonly string[] = ['a', 'b'];
  }

  const PlainRegistryToken = createToken<PlainRegistry>('plainRegistry');

  const RegistryView = () => {
    const registry = useViewModel(PlainRegistryToken);
    return <span>{registry.items.join(',')}</span>;
  };

  it('subscribe/getVersion이 없어도 원본 인스턴스를 그대로 돌려준다', () => {
    const root = createContainer();
    root.register(PlainRegistryToken, scoped(() => new PlainRegistry()));

    render(
      <ViewModelProvider container={root.createScope('test')}>
        <RegistryView />
      </ViewModelProvider>,
    );

    expect(screen.getByText('a,b')).toBeTruthy();
  });
});
