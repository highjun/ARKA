import type { Disposable } from "#core/di";

/** 팔레트의 한 줄. */
export interface CommandRow {
  readonly id: string;
  readonly label: string;
  /** 이 명령에 걸린 실효 키. 없으면 빈 문자열. */
  readonly keybinding: string;
}

declare module "#core/di" {
  /** `ICommandPaletteViewModel`를 컨테이너에서 꺼내는 자리. */
  interface InstanceMap {
    "arka.workbench.commandPaletteViewModel": ICommandPaletteViewModel;
  }
}
/**
 * 명령 팔레트. 등록된 명령을 보여주고 고른 것을 실행한다 — 거르는 것은 컴포넌트가 `query`로 한다.
 * 여는 것 자체가 명령(`shell.openCommandPalette`, Ctrl+K)이라 열림 상태를 컴포넌트가 아니라 여기서 든다.
 */
export interface ICommandPaletteViewModel extends Disposable {
  readonly isOpen: boolean;
  open(): void;
  /** 닫으면 검색어도 비운다 — 다음에 열 때 지난 검색어가 남지 않는다. */
  close(): void;
  readonly query: string;
  setQuery(value: string): void;
  /** 등록된 명령 전부, 등록 순서. 실효 키는 재정의가 있으면 그것이다. */
  readonly rows: readonly CommandRow[];
  /** 실행하고 닫는다. */
  run(actionId: string): void;
}
