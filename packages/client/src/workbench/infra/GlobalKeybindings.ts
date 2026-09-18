import type { ICommandService } from "#core/commands";
import type { Disposable } from "#core/di";

/**
 * 전역 키 리스너 **하나**. 맞는 키바인딩을 찾아 명령을 실행하고, 실행했으면 브라우저 기본 동작을
 * 막는다(Ctrl+S가 "페이지 저장"을 여는 것 같은 충돌을 피하려는 것). 만드는 순간 켜진다.
 *
 * 컴포넌트-로컬 단축키(CodeMirror의 Mod-S, FileTree의 방향키)는 안 건드린다 — 그건 DOM
 * 포커스가 있어야 의미 있는 것들이다.
 */
export const createGlobalKeybindings = ({ commands }: { commands: ICommandService }): Disposable => {
  const onKeydown = (event: KeyboardEvent) => {
    if (commands.dispatchKeydown(event)) event.preventDefault();
  };
  window.addEventListener("keydown", onKeydown);
  return { dispose: () => window.removeEventListener("keydown", onKeydown) };
};
