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
import { findLeaf } from "../model/paneTree";
import type { ActiveBottom, BottomRow, IShellViewModel, SidebarRow } from "./IShellViewModel";

export class ShellViewModel implements IShellViewModel {
  readonly #sidebars: Registry<SidebarDescriptor>;
  readonly #bottoms: Registry<BottomDescriptor>;
  readonly #colorMode: IColorMode;
  readonly #tabLayout: ITabLayout;
  readonly #commands: ICommandService;
  readonly #subscriptions: Disposable[] = [];
  private activeSidebarIdState: string | null | undefined = undefined;
  private activeBottomIdState: string | null = null;
  private colorModeState: Mode;
  private isNarrowState: boolean;
  private isSidebarOpenState = false;
  private activeTabIdState: string | null;

  constructor({
    sidebars,
    bottoms,
    colorMode,
    viewport,
    tabLayout,
    commands,
  }: {
    sidebars: Registry<SidebarDescriptor>;
    bottoms: Registry<BottomDescriptor>;
    colorMode: IColorMode;
    viewport: IViewport;
    tabLayout: ITabLayout;
    commands: ICommandService;
  }) {
    this.#sidebars = sidebars;
    this.#bottoms = bottoms;
    this.#colorMode = colorMode;
    this.#tabLayout = tabLayout;
    this.#commands = commands;
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
      tabLayout.onDidChange(() => this.syncActiveTab()),
    );

    this.#registerCommands();
  }

  get sidebars(): readonly SidebarRow[] {
    return this.#sidebars.list().map(({ id, title, iconId, Content }) => ({ id, title, iconId, Content }));
  }

  get activeSidebarId(): string | null {
    return this.#activeSidebarId();
  }

  toggleSidebar(id: string): void {
    if (this.#sidebars.tryGet(id) === undefined) return;
    if (this.#activeSidebarId() !== id) {
      this.activeSidebarIdState = id;
      return;
    }
    /** 좁은 화면에는 접힘이 없다 — 같은 것을 다시 눌러도 그대로 둔다. 닫는 것은 타이틀바 단추 몫이다. */
    if (this.isNarrowState) return;
    this.activeSidebarIdState = null;
  }

  revealSidebar(id: string): void {
    if (this.#sidebars.tryGet(id) === undefined) return;
    this.activeSidebarIdState = id;
    this.setSidebarOpen(true);
  }

  toggleSidebarExpanded(): void {
    const current = this.#activeSidebarId();
    if (current !== null) {
      this.activeSidebarIdState = null;
      return;
    }
    const first = this.#sidebars.list()[0];
    if (first !== undefined) this.activeSidebarIdState = first.id;
  }

  get bottoms(): readonly BottomRow[] {
    return this.#bottoms.list().map(({ id, title }) => ({ id, title }));
  }

  get activeBottom(): ActiveBottom | null {
    const id = this.activeBottomIdState;
    const descriptor = id === null ? undefined : this.#bottoms.tryGet(id);
    return descriptor === undefined ? null : { id: descriptor.id, Content: descriptor.Content };
  }

  toggleBottom(id: string): void {
    if (this.#bottoms.tryGet(id) === undefined) return;
    this.activeBottomIdState = this.activeBottomIdState === id ? null : id;
  }

  toggleBottomOpen(): void {
    if (this.activeBottomIdState !== null) {
      this.activeBottomIdState = null;
      return;
    }
    const first = this.#bottoms.list()[0];
    if (first !== undefined) this.activeBottomIdState = first.id;
  }

  get isNarrow(): boolean {
    return this.isNarrowState;
  }

  get colorMode(): Mode {
    return this.colorModeState;
  }

  toggleColorMode(): void {
    this.#colorMode.setMode(this.#colorMode.mode === "dark" ? "light" : "dark");
  }

  get isSidebarOpen(): boolean {
    return this.isSidebarOpenState;
  }

  setSidebarOpen(open: boolean): void {
    this.isSidebarOpenState = open;
  }

  dispose(): void {
    for (const subscription of this.#subscriptions) subscription.dispose();
  }

  private syncActiveTab(): void {
    const next = this.#activeTabId();
    if (next === this.activeTabIdState) return;
    this.activeTabIdState = next;
    this.isSidebarOpenState = false;
  }

  #activeSidebarId(): string | null {
    const first = this.#sidebars.list()[0]?.id ?? null;
    if (this.activeSidebarIdState === undefined) return first;
    /** 좁은 화면에서는 늘 하나가 선다 — 접어 둔 채 창이 좁아져도 빈 드로어를 보여 주지 않는다. */
    if (this.isNarrowState && this.activeSidebarIdState === null) return first;
    return this.activeSidebarIdState;
  }

  #activeTabId(): string | null {
    return findLeaf(this.#tabLayout.tree, this.#tabLayout.activePaneId)?.activeTabId ?? null;
  }

  #registerCommands(): void {
    const commands = this.#commands;
    commands.actions.add({ id: "shell.toggleTheme", label: "테마 전환", execute: () => this.toggleColorMode() });
    commands.keybindings.add({ keybinding: "ctrl+j", actionId: "shell.toggleTheme" });

    commands.actions.add({
      id: "arka.workbench.revealSidebar",
      label: "사이드바 열기",
      execute: (context) => {
        if (typeof context === "object" && context !== null && "id" in context && typeof context.id === "string")
          this.revealSidebar(context.id);
      },
    });

    commands.actions.add({
      id: "shell.openSettings",
      label: "설정 열기",
      execute: () => commands.execute("arka.workbench.open", { uri: URI.parse("arka:///settings") }),
    });
    commands.keybindings.add({ keybinding: "ctrl+,", actionId: "shell.openSettings" });
    commands.actions.add({
      id: "shell.openKeybindings",
      label: "키보드 단축키 보기",
      execute: () => commands.execute("shell.openSettings"),
    });
  }
}
