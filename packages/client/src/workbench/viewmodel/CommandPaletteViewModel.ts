import type { ICommandService } from "#core/commands";
import { makeAutoObservable, observable } from "mobx";
import type { CommandRow, ICommandPaletteViewModel } from "./ICommandPaletteViewModel";

/** `ICommandPaletteViewModel`의 유일한 구현체. */
export class CommandPaletteViewModel implements ICommandPaletteViewModel {
  readonly #commands: ICommandService;
  private isOpenState = false;
  private queryState = "";

  /** 만들 때 "팔레트 열기" 명령과 단축키(Ctrl+K)를 스스로 등록한다. */
  constructor({ commands }: { commands: ICommandService }) {
    this.#commands = commands;
    // `rows`는 관찰하지 않는다 — 명령 레지스트리는 observable이 아니라, 캐시하면 뒤늦게 등록된 명령을 놓친다.
    makeAutoObservable<this, "isOpenState" | "queryState">(
      this,
      { isOpenState: observable, queryState: observable, rows: false },
      { autoBind: true },
    );

    // 팔레트를 여는 것 자체가 명령이다 — VSCode의 `workbench.action.showCommands`와 같은 방식.
    commands.actions.add({ id: "shell.openCommandPalette", label: "커맨드 팔레트 열기", execute: () => this.open() });
    commands.keybindings.add({ keybinding: "ctrl+k", actionId: "shell.openCommandPalette" });
  }

  /** 처음에는 닫혀 있다. */
  get isOpen(): boolean {
    return this.isOpenState;
  }

  /** 연다. 이미 열려 있으면 그대로다. */
  open(): void {
    this.isOpenState = true;
  }

  /** 닫고 검색어를 비운다. */
  close(): void {
    this.isOpenState = false;
    this.queryState = "";
  }

  /** 검색어를 값으로 노출한다. */
  get query(): string {
    return this.queryState;
  }

  /** 검색어에 값을 반영한다. */
  setQuery(value: string): void {
    this.queryState = value;
  }

  /** 명령 레지스트리를 그대로 옮긴 것이다 — 부를 때마다 다시 만든다(가볍다). */
  get rows(): readonly CommandRow[] {
    return this.#commands.actions.list().map((action) => ({
      id: action.id,
      label: action.label,
      keybinding: this.#effectiveKeybinding(action.id),
    }));
  }

  /** 실행하고 닫는다 — 실행 오류는 `ICommandService`가 보고한다. */
  run(actionId: string): void {
    this.#commands.execute(actionId);
    this.close();
  }

  /** 등록이 남는 것은 없다 — 명령 레지스트리는 취소가 없다. */
  dispose(): void {
    // 정리할 구독이 없다.
  }

  /** 사용자 재정의가 있으면 그것이 실효 키다. `null`은 꺼 둔 것이라 빈 문자열. */
  #effectiveKeybinding(actionId: string): string {
    const commands = this.#commands;
    const effective = commands.overrides.has(actionId)
      ? commands.overrides.get(actionId)
      : commands.keybindings.list().find((entry) => entry.actionId === actionId)?.keybinding;
    return typeof effective === "string" ? effective : "";
  }
}
