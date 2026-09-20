import type { ICommandService } from "#core/commands";
import type { Disposable } from "#core/di";

export const createGlobalKeybindings = ({ commands }: { commands: ICommandService }): Disposable => {
  const onKeydown = (event: KeyboardEvent) => {
    if (commands.dispatchKeydown(event)) event.preventDefault();
  };
  window.addEventListener("keydown", onKeydown);
  return { dispose: () => window.removeEventListener("keydown", onKeydown) };
};
