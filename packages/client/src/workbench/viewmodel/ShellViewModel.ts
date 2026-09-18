import { URI } from "#contracts";
import type { ICommandService } from "#core/commands";
import type { Disposable } from "#core/di";
import type { Registry } from "#core/registry";
import { makeAutoObservable, observable, runInAction } from "mobx";
import type { BottomDescriptor } from "../model/IBottomDescriptor";
import type { IColorMode, Mode } from "../model/IColorMode";
import type { SidebarDescriptor } from "../model/ISidebarDescriptor";
import type { ITabLayout } from "../model/ITabLayout";
import type { IViewport } from "../model/IViewport";
import type { IWorkbenchStartup } from "../model/IWorkbenchStartup";
import { findLeaf } from "../model/paneTree";
import type { ActiveBottom, ActiveSidebar, BottomRow, IShellViewModel, SidebarRow } from "./IShellViewModel";

/** `IShellViewModel`의 유일한 구현체. 사이드바·아래 창·밝기·드로어 — 뼈대의 화면 상태만 든다. */
export class ShellViewModel implements IShellViewModel {
  readonly #sidebars: Registry<SidebarDescriptor>;
  readonly #bottoms: Registry<BottomDescriptor>;
  readonly #colorMode: IColorMode;
  readonly #tabLayout: ITabLayout;
  readonly #commands: ICommandService;
  /**
   * 부팅 때 켜고 정리할 때 끄는 것들 — 앱 전체 단위 배선이라 앱에 하나인 이 VM의 수명(생성자/`dispose`)에 얹는다.
   * `activateExtensions`가 부팅을 맡으면(R15) 사라진다.
   */
  readonly #startup: IWorkbenchStartup;
  readonly #subscriptions: Disposable[] = [];
  /** 어느 사이드바가 열려 있나 — Model에 없는 값이라 VM이 든다. */
  private activeSidebarIdState: string | null;
  private activeBottomIdState: string | null = null;
  private colorModeState: Mode;
  private isNarrowState: boolean;
  private isSidebarOpenState = false;
  /** 드로어를 닫을 때를 잡기 위한 것 — 보던 탭이 바뀌었는가. */
  private activeTabIdState: string | null;

  /** 만들어지는 순간이 곧 "앱이 사는 동안"의 시작이다 — 부팅 작업을 켜고 명령을 등록한다. */
  constructor({
    sidebars,
    bottoms,
    colorMode,
    viewport,
    tabLayout,
    commands,
    startup,
  }: {
    sidebars: Registry<SidebarDescriptor>;
    bottoms: Registry<BottomDescriptor>;
    colorMode: IColorMode;
    viewport: IViewport;
    tabLayout: ITabLayout;
    commands: ICommandService;
    startup: IWorkbenchStartup;
  }) {
    this.#sidebars = sidebars;
    this.#bottoms = bottoms;
    this.#colorMode = colorMode;
    this.#tabLayout = tabLayout;
    this.#commands = commands;
    this.#startup = startup;
    // 첫 사이드바가 처음부터 열려 있다 — 빈 셸로 시작하지 않는다.
    this.activeSidebarIdState = sidebars.list()[0]?.id ?? null;
    this.colorModeState = colorMode.mode;
    this.isNarrowState = viewport.isNarrow;
    this.activeTabIdState = this.#activeTabId();

    makeAutoObservable<
      this,
      | "activeSidebarIdState"
      | "activeBottomIdState"
      | "colorModeState"
      | "isNarrowState"
      | "isSidebarOpenState"
      | "activeTabIdState"
    >(
      this,
      {
        activeSidebarIdState: observable,
        activeBottomIdState: observable,
        colorModeState: observable,
        isNarrowState: observable,
        isSidebarOpenState: observable,
        activeTabIdState: observable,
      },
      { autoBind: true },
    );

    this.#subscriptions.push(
      colorMode.onDidChange(() => runInAction(() => (this.colorModeState = colorMode.mode))),
      viewport.onDidChange(() => runInAction(() => (this.isNarrowState = viewport.isNarrow))),
      // 보던 탭이 바뀌면 모바일 드로어를 닫는다 — 폰에서 드로어가 방금 연 파일을 가린다.
      tabLayout.onDidChange(() => this.syncActiveTab()),
    );

    this.#registerCommands();
    startup.start();
  }

  /** 레지스트리 순서 그대로. 활성은 하나뿐이거나 없다. */
  get sidebars(): readonly SidebarRow[] {
    return this.#sidebars
      .list()
      .map(({ id, title, iconId }) => ({ id, title, iconId, isActive: id === this.activeSidebarIdState }));
  }

  /** 액션의 라벨은 명령에서 가져온다 — descriptor는 id만 든다. */
  get activeSidebar(): ActiveSidebar | null {
    const id = this.activeSidebarIdState;
    const descriptor = id === null ? undefined : this.#sidebars.tryGet(id);
    if (descriptor === undefined) return null;
    return {
      id: descriptor.id,
      title: descriptor.title,
      Content: descriptor.Content,
      actions: (descriptor.actions ?? []).map((action) => ({
        actionId: action.actionId,
        iconId: action.iconId,
        label: this.#commands.actions.tryGet(action.actionId)?.label ?? action.actionId,
      })),
    };
  }

  /** 모르는 id면 아무 일도 안 한다. 같은 것을 다시 고르면 닫는다 — 폰에서 사이드바를 접는 유일한 수단이다. */
  toggleSidebar(id: string): void {
    if (this.#sidebars.tryGet(id) === undefined) return;
    this.activeSidebarIdState = this.activeSidebarIdState === id ? null : id;
  }

  /** 모르는 id면 아무 일도 안 한다. 이미 열려 있어도 닫지 않고, 드로어를 연다. */
  revealSidebar(id: string): void {
    if (this.#sidebars.tryGet(id) === undefined) return;
    this.activeSidebarIdState = id;
    this.setSidebarOpen(true);
  }

  /** 레지스트리 순서 그대로. */
  get bottoms(): readonly BottomRow[] {
    return this.#bottoms
      .list()
      .map(({ id, title, iconId }) => ({ id, title, iconId, isActive: id === this.activeBottomIdState }));
  }

  /** 열린 아래 창. 없으면 `null`. */
  get activeBottom(): ActiveBottom | null {
    const id = this.activeBottomIdState;
    const descriptor = id === null ? undefined : this.#bottoms.tryGet(id);
    return descriptor === undefined ? null : { id: descriptor.id, Content: descriptor.Content };
  }

  /** 모르는 id면 아무 일도 안 한다. 같은 것을 다시 고르면 닫는다. */
  toggleBottom(id: string): void {
    if (this.#bottoms.tryGet(id) === undefined) return;
    this.activeBottomIdState = this.activeBottomIdState === id ? null : id;
  }

  /** 플랫폼이 준 값 그대로. */
  get isNarrow(): boolean {
    return this.isNarrowState;
  }

  /** `'light'` 또는 `'dark'`. */
  get colorMode(): Mode {
    return this.colorModeState;
  }

  /** 현재 모드를 반전시켜 `IColorMode.setMode`를 부른다. */
  toggleColorMode(): void {
    this.#colorMode.setMode(this.#colorMode.mode === "dark" ? "light" : "dark");
  }

  /** 처음에는 닫혀 있다. */
  get isSidebarOpen(): boolean {
    return this.isSidebarOpenState;
  }

  /** 값을 그대로 반영한다. */
  setSidebarOpen(open: boolean): void {
    this.isSidebarOpenState = open;
  }

  /** 구독을 끊고 부팅 작업을 끈다. 컨테이너가 이 VM을 정리할 때 불린다. */
  dispose(): void {
    for (const subscription of this.#subscriptions) subscription.dispose();
    this.#startup.stop();
  }

  private syncActiveTab(): void {
    const next = this.#activeTabId();
    if (next === this.activeTabIdState) return;
    this.activeTabIdState = next;
    this.isSidebarOpenState = false;
  }

  #activeTabId(): string | null {
    return findLeaf(this.#tabLayout.tree, this.#tabLayout.activePaneId)?.activeTabId ?? null;
  }

  /**
   * 뼈대가 다루는 명령 — 밝기 전환, 사이드바 보기(`<title> 보기`), 설정·단축키 탭 열기. "이 화면이 다루는 명령은
   * 이 화면의 ViewModel이 안다." 탭·팔레트 명령은 각자의 VM에 있다.
   */
  #registerCommands(): void {
    const commands = this.#commands;
    commands.actions.add({ id: "shell.toggleTheme", label: "테마 전환", execute: () => this.toggleColorMode() });
    commands.keybindings.add({ keybinding: "ctrl+j", actionId: "shell.toggleTheme" });

    // 사이드바마다 `<title> 보기` — VSCode의 `workbench.view.explorer`(Ctrl+Shift+E) 같은 것. 단축키는 조립부가 건다.
    for (const sidebar of this.#sidebars.list()) {
      commands.actions.add({
        id: `shell.showActivity.${sidebar.id}`,
        label: `${sidebar.title} 보기`,
        execute: () => this.revealSidebar(sidebar.id),
      });
    }

    commands.actions.add({
      id: "shell.openSettings",
      label: "설정 열기",
      execute: () => commands.execute("arka.workbench.open", { uri: URI.parse("arka:///settings") }),
    });
    commands.keybindings.add({ keybinding: "ctrl+,", actionId: "shell.openSettings" });
    commands.actions.add({
      id: "shell.openKeybindings",
      label: "키보드 단축키 보기",
      execute: () => commands.execute("arka.workbench.open", { uri: URI.parse("arka:///keybindings") }),
    });
  }
}
